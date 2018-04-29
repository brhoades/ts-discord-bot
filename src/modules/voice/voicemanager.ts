import { GuildChannel, Guild, StreamDispatcher, Message, GuildMember, VoiceChannel, VoiceConnection } from 'discord.js';
import { unlink } from 'fs';
import { Readable } from 'stream';

import Client from '../../lib/client';
import MapToArray from '../../lib/maptoarray';

class QueuedItem {
  constructor(public channel: VoiceChannel, public func: TakesConnection) {
  }
}

type TakesConnection = (connection: VoiceConnection) => StreamDispatcher;

interface PlayOptions {
  limit: number;
  volume: number;
  removeFile: boolean;
}

const defaultPlayOptions = {
  limit: 3,
  removeFile: false,
  volume: 1,
};

export default class VoiceManager {
  private dispatchers: StreamDispatcher[] = [];
  private queue: MapToArray<string, QueuedItem>;

  constructor(private client: Client) {
    this.queue = new MapToArray<string, QueuedItem>();
  }

  public play(staleChannel: VoiceChannel, func: TakesConnection) {
    // The channel's id is likely stale. Look it up manually.
    const channels = this.client.guilds.get(staleChannel.guild.id).channels.filter((c: GuildChannel) => (
      c.name === staleChannel.name && c.type === 'voice'),
    );

    if (channels.array().length === 0) {
      this.client.log.error(
        'No channel match found for playing queued message.', { channel: staleChannel },
      );
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
      .catch((err: Error) => {
        this.client.log.error(`Error when joining "${channel.name}" on "${channel.guild.name}" to play queued file:`);
        this.client.log.error(`${err.message}\n${err.stack}`);
      });
  }

  public stopPlaying(guild: Guild): boolean {
    const matches = this.dispatchers.filter((d) => d.player.voiceConnection.channel.guild === guild);

    if (!matches) {
      return false;
    }

    matches.map(m => m.end());

    this.processQueue();
    return true;
  }

  public enqueueStream(channel: VoiceChannel, stream: Readable, options: Partial<PlayOptions>) {
    const inferredOptions = { ...defaultPlayOptions, ...options };

    this.client.log.debug('Enqueueing stream.', {
      channel,
      options,
    });

    this.queue.push(
      channel.guild.id, new QueuedItem(channel, (conn) => conn.playStream(stream, { volume: inferredOptions.volume })),
      inferredOptions.limit,
    );

    this.processQueue();
  }

  public enqueueArbitraryInput(channel: VoiceChannel, arbitraryInput: string, options: Partial<PlayOptions>) {
    const inferredOptions = { ...defaultPlayOptions, ...options };

    this.client.log.debug('Enqueueing arbitrary input.', { arbitraryInput, channel, options });
    this.queue.push(
      channel.guild.id,
      new QueuedItem(
        channel,
        (connection: VoiceConnection) => (
          connection.playArbitraryInput(arbitraryInput, { volume: inferredOptions.volume })
        ),
      ),
      inferredOptions.limit,
    );

    this.processQueue();
  }

  public enqueueFile(channel: VoiceChannel, file: string, options: Partial<PlayOptions>) {
    const inferredOptions = { ...defaultPlayOptions, ...options };

    this.client.log.debug('Enqueueing file.', { channel, file, options });
    this.queue.push(
      channel.guild.id,
      new QueuedItem(channel, (connection: VoiceConnection) => {
        const dispatcher = connection.playFile(file);

        this.client.log.debug('Playing enqueued file.', { channel, file });
        // FIXME: this should be the caller's problem
        if (options.removeFile) {
          const unlinkCallback = () => (
            unlink(file, (err) => {
              if (err) {
                this.client.log.error('Error cleaning up after file.');
                this.client.log.error(err.message);
                this.client.log.error(err.stack);
              }
            })
          );

          dispatcher.on('end', unlinkCallback);
        }

        return dispatcher;
      }),
      inferredOptions.limit,
    );

    this.processQueue();
  }

  public processQueue() {
    this.queue.forEach((streams) => {
      if (!streams.length) {
        return;
      }

      const { channel, func } = streams[0];

      this.client.log.debug(
        `Evaluating queued stream.`, {
          channel,
          streamsForGuild: streams.length,
          voiceQueue: this.queue,
        },
      );
      const matches = this.dispatchers.filter(d => d.player.voiceConnection.channel.guild === channel.guild);
      if (matches.length) {
        return;
      }

      this.play(channel, func);
      streams.shift();

      this.client.log.debug('Stream played and removed from queue.', {
        channel,
        streamsForGuild: streams.length,
        voiceQueue: this.queue,
      });
    });
  }

  public getDispatchersForChannel(channel: VoiceChannel): StreamDispatcher[] {
    return this.dispatchers.filter(d => d.player.voiceConnection.channel === channel);
  }

  private handleDispatchers(dispatcher: StreamDispatcher) {
    this.dispatchers.push(dispatcher);
    const conn = dispatcher.player.voiceConnection;

    this.client.log.debug(`New dispatcher created.`, { dispatcher });

    dispatcher.on('finish', () => {
      this.client.log.debug(`Finished playing dispatcher.`, { dispatcher });
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
      this.processQueue();
    });

    dispatcher.on('end', () => {
      this.client.log.debug(`Dispatcher ended.`, { dispatcher });
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
      this.processQueue();
    });

    dispatcher.on('error', (error: Error) => {
      this.client.log.debug(`Dispatcher errored.`, {
        dispatcher,
        error: {
          mesage: error.message,
          stack: error.stack,
        },
      });
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
      this.processQueue();
    });
  }
}
