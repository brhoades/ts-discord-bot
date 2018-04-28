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
        `No match found for playing queued message on "${staleChannel.name}" `
        + `with guild "${staleChannel.guild.name}".`,
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

    return true;
  }

  public enqueueStream(channel: VoiceChannel, stream: Readable, options: Partial<PlayOptions>) {
    const inferredOptions = { ...defaultPlayOptions, ...options };

    this.client.log.debug(`Enqueueing stream for "${channel.name}" on "${channel.guild.name}"`);
    this.queue.push(
      channel.guild.id, new QueuedItem(channel, (conn) => conn.playStream(stream, { volume: inferredOptions.volume })),
      inferredOptions.limit,
    );
  }

  public enqueueArbitraryInput(channel: VoiceChannel, arbitraryInput: string, options: Partial<PlayOptions>) {
    const inferredOptions = { ...defaultPlayOptions, ...options };

    this.client.log.debug(`Enqueueing arbitrary input for "${channel.name}" on "${channel.guild.name}"`);
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
  }

  public enqueueFile(channel: VoiceChannel, file: string, options: Partial<PlayOptions>) {
    const inferredOptions = { ...defaultPlayOptions, ...options };

    this.client.log.debug(`Enqueueing file for ${channel.name} on ${channel.guild.name}`);
    this.queue.push(
      channel.guild.id,
      new QueuedItem(channel, (connection: VoiceConnection) => {
        const dispatcher = connection.playFile(file);

        this.client.log.debug(`Playing enqueued file "${file}" for "${channel.name}" on "${channel.guild.name}".`);
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
  }

  public processQueue() {
    this.queue.forEach((streams) => {
      if (!streams.length) {
        return;
      }

      const { channel, func } = streams[0];

      this.client.log.debug(`Playing queued stream for "${channel.name}" on "${channel.guild.name}".`);
      this.client.log.debug(`${streams.length} stream(s) are queued for guild "${channel.guild.name}".`);
      const matches = this.dispatchers.filter(d => d.player.voiceConnection.channel.guild === channel.guild);
      if (matches.length) {
        this.client.log.debug(`Aforementioned stream remains queued as ${matches.length} dispatchers are playing.`);
        return;
      }

      this.client.log.debug('Playing aforementioned stream, popped off queue.');
      this.play(channel, func);
      streams.shift();
    });
  }

  private handleDispatchers(dispatcher: StreamDispatcher) {
    this.dispatchers.push(dispatcher);
    const conn = dispatcher.player.voiceConnection;

    this.client.log.debug(`New dispatcher for "${conn.channel.name}" on "${conn.channel.guild.name}" created.`);

    dispatcher.on('finish', () => {
      this.client.log.debug(
        `Finished playing dispatcher on "${conn.channel.name}" on guild "${conn.channel.guild.name}".`,
      );
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
    });

    dispatcher.on('end', () => {
      this.client.log.debug(`Dispatcher on "${conn.channel.name}" on guild "${conn.channel.guild.name}" ended.`);
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
    });

    dispatcher.on('error', (error: Error) => {
      this.client.log.debug(
        `Dispatcher on "${conn.channel.name}" on guild "${conn.channel.guild.name}" errored: ${error}.`,
      );
      this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
    });
  }
}
