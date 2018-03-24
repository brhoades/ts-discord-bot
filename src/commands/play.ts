import { Client, Guild, StreamDispatcher, Message, GuildMember, VoiceChannel } from 'discord.js';
import { Duplex, Transform } from 'stream';
const ytdl = require('ytdl-core');
const googleTTS = require('google-tts-api');
const http = require('http');
const https = require('https');

export const name = "Play Sound";
export const help = "None!";

type StreamRequired = (stream: Duplex) => void;

class QueuedStream {
  constructor(public channel: VoiceChannel, public streamCreator: (func: StreamRequired) => void) {
  }
}

class VoiceManager {
  private dispatchers: StreamDispatcher[] = [];
  private queue: Map<string, QueuedStream[]>;

  constructor() {
    this.queue = new Map<string, QueuedStream[]>();
  }

  public playStream(channel: VoiceChannel, stream: Duplex) {
    channel.join().then((conn) => {
      const dispatcher = conn.playStream(stream);
      console.log('Played stream');

      this.dispatchers.push(dispatcher);
      dispatcher.on('finish', () => {
        console.log("Doned");
        this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
      });

      dispatcher.on('end', () => {
        console.log("Doned");
        this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
      });
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

  public enqueueStream(channel: VoiceChannel, stream: Duplex) {
    if (!this.queue.has(channel.guild.id)) {
      this.queue.set(channel.guild.id, []);
    }

    this.queue.get(channel.guild.id).push(new QueuedStream(channel, (func) => func(stream)));
  }

  public enqueueDynamicStream(channel: VoiceChannel, streamCreator: (func: StreamRequired) => Duplex) {
    if (!this.queue.has(channel.guild.id)) {
      this.queue.set(channel.guild.id, []);
    }

    this.queue.get(channel.guild.id).push(new QueuedStream(channel, streamCreator));
  }

  public processQueue() {
    this.queue.forEach((streams) => {
      if (!streams.length) {
        return;
      }

      const { channel, streamCreator } = streams[0];
      if (channel.connection && channel.connection.speaking) {
        return;
      }
      console.log("Playing stream");

      streamCreator((stream: Duplex) => this.playStream(channel, stream));

      streams.shift();
    });
  }
}

const getURLForMessage = (message: string, language: string = 'en', volume: number = 1): Promise<string> => {
  return googleTTS(message, language, 1);
};

export const register = (client: Client) => {
  const manager = new VoiceManager();

  // set up queue proceessing
  setInterval(() => manager.processQueue(), 500);

  client.on('message', (message: Message) => {
    if (message.content.match(/^!play\s+.+/)) {
      const parts = message.content.split(/\s+/).slice(1);
      const url = parts[0];

      if (url.match(/youtube\.com/)) {
        manager.playStream(message.member.voiceChannel, ytdl(url, { filter: 'audioonly' }));
      }
    }

    if (message.content.match(/^!stop/)) {
      if (manager.stopPlaying(message.guild)) {
        message.reply('Stopped');
      } else {
        message.reply('Not currently playing anything on this server.');
      }
    }
  });

  client.on('voiceStateUpdate', (oldMember: GuildMember, newMember: GuildMember) => {
    if (oldMember.voiceChannel !== newMember.voiceChannel) {
      let message;
      let channel: VoiceChannel;
      const name = newMember.nickname ? newMember.nickname : newMember.displayName;

      if (newMember.user.bot || oldMember.user.bot) {
        return;
      }

      if (newMember.voiceChannel) {
        message = getURLForMessage(`${name} joined`);
        channel = newMember.voiceChannel;
      } else {
        message = getURLForMessage(`${name} left`);
        channel = oldMember.voiceChannel;
      }

      message.then((url) => {
        const stream = new Duplex();
        const responseHandler = (resp: any, func: StreamRequired) => {
          resp.on('error', () => console.log('Error connecting.'));
          resp.on('clientError', () => console.log('Error connecting.'));
          console.log(resp.statusCode);
          func(resp);
        };

        if (/^https/.test(url)) {
          manager.enqueueDynamicStream(channel, (func: StreamRequired) => https.get(url, (resp: any) => responseHandler(resp, func)));
        } else {
          manager.enqueueDynamicStream(channel, (func: StreamRequired) => http.get(url, (resp: any) => responseHandler(resp, func)));
        }
      });
    }
  });
};