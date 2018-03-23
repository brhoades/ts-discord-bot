import { Client, Message } from 'discord.js';
const ytdl = require('ytdl-core');

export const name = "Giphy Command";
export const help = "None!";
export const register = (client: Client) => {
  client.on('message', (message: Message) => {
    if (message.content.match(/^!play\s+.+/)) {
      const parts = message.content.split(/\s+/).splice(1);
      const url = parts[0];

      if (url.match(/youtube\.com/)) {
        message.member.voiceChannel.join().then((con) => {
          con.playStream(ytdl(url, { filter: 'audioonly' }));
        });
      }
    }

    if (message.content.match(/^!stop/)) {
      const matches = message.client.voiceConnections
                             .filter(conn => conn.channel.guild === message.guild && conn.speaking);
      if (!matches) {
        message.reply("I'm not currently speaking on this server.");
        return;
      }
      matches.map(conn => conn.disconnect()); // TODO handle the dispatching stream dealios and stop those
      message.reply("Stopped");
    }
  });
};