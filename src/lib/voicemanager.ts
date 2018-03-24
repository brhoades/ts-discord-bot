import { GuildChannel, Client, Guild, StreamDispatcher, Message, GuildMember, VoiceChannel, VoiceConnection } from 'discord.js';
import { Readable } from 'stream';

class QueuedItem {
  constructor(public channel: VoiceChannel, public func: TakesConnection) {
  }
}

type TakesConnection = (connection: VoiceConnection) => StreamDispatcher;

export default class VoiceManager {
  private dispatchers: StreamDispatcher[] = [];
  private queue: Map<string, QueuedItem[]>;

  constructor(private client: Client) {
    this.queue = new Map<string, QueuedItem[]>();
  }

  public play(staleChannel: VoiceChannel, func: TakesConnection) {
    // The channel's id is likely stale. Look it up manually.
    const channels = this.client.guilds.get(staleChannel.guild.id).channels.filter((c: GuildChannel) => (
      c.name === staleChannel.name && c.type === 'voice'),
    );

    if (channels.array().length === 0) {
      console.error('No match found');
      return;
    }

    const channel: VoiceChannel = channels.array()[0] as VoiceChannel;

    if (channel.connection) {
      this.handleDispatchers(func(channel.connection));
      return;
    }

    channel
      .join()
      .then((conn) => this.handleDispatchers(func(conn)))
      .catch((err: Error) => console.error(`Error when joining: ${err.message}\n${err.stack}`));
  }

  public stopPlaying(guild: Guild): boolean {
    const matches = this.dispatchers.filter((d) => d.player.voiceConnection.channel.guild === guild);

    if (!matches) {
      return false;
    }

    matches.map(m => m.end());

    return true;
  }

  public enqueueStream(channel: VoiceChannel, stream: Readable, limit: number = -1) {
    if (!this.queue.has(channel.guild.id)) {
      this.queue.set(channel.guild.id, []);
    }

    if (limit > 0 && this.queue.get(channel.guild.id).length > limit) {
      console.debug('Tossed stream from queue as limit was reached.');
      return;
    }

    this.queue.get(channel.guild.id).push(new QueuedItem(channel, (conn) => conn.playStream(stream)));
  }

  public enqueueArbitraryInput(channel: VoiceChannel, arbitraryInput: string, limit: number = -1) {
    if (!this.queue.has(channel.guild.id)) {
      this.queue.set(channel.guild.id, []);
    }

    if (limit > 0 && this.queue.get(channel.guild.id).length > limit) {
      console.debug('Tossed arbitrary input from queue as limit was reached.');
      return;
    }

    this.queue.get(channel.guild.id).push(
      new QueuedItem(channel, (connection: VoiceConnection) => connection.playArbitraryInput(arbitraryInput)),
    );
  }

  public processQueue() {
    this.queue.forEach((streams) => {
      if (!streams.length) {
        return;
      }

      const { channel, func } = streams[0];

      const matches = this.dispatchers.filter(d => d.player.voiceConnection.channel.guild === channel.guild);
      if (matches.length) {
        return;
      }

      this.play(channel, func);
      streams.shift();
    });
  }

  private handleDispatchers(dispatcher: StreamDispatcher) {
    this.dispatchers.push(dispatcher);

    dispatcher.on('finish', () => {
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
    });

    dispatcher.on('end', () => {
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
    });

    dispatcher.on('error', (error) => {
      console.error(error);
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
    });
  }
}
