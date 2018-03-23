import { Client, Guild, StreamDispatcher, Message, VoiceChannel } from 'discord.js';
import { Transform } from 'stream';
const ytdl = require('ytdl-core');

class VoiceManager {
  private dispatchers: StreamDispatcher[] = [];

  public playStream(channel: VoiceChannel, stream: Transform) {
    channel.join().then((conn) => {
      const dispatcher = conn.playStream(stream);

      this.dispatchers.push(dispatcher);
      dispatcher.on('finish', () => {
        this.dispatchers.splice(this.dispatchers.indexOf(dispatcher), 1);
      });

      dispatcher.on('end', () => {
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
}

export const name = "Play Sound";
export const help = "None!";
export const register = (client: Client) => {
  const manager = new VoiceManager();

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
};