import { Client, Guild, StreamDispatcher, Message, GuildMember, VoiceChannel, VoiceConnection } from 'discord.js';
import { Readable } from 'stream';
const ytdl = require('ytdl-core');
const googleTTS = require('google-tts-api');
const http = require('http');
const https = require('https');

import VoiceManager from '../lib/voicemanager';

export const name = "Play Sound";
export const help = "None!";

const getURLForMessage = (message: string, language: string = 'en', volume: number = 1): Promise<string> => {
  return googleTTS(message, language, 1);
};

export const register = (client: Client) => {
  const manager = new VoiceManager(client);

  // set up queue proceessing
  setInterval(() => { manager.processQueue(); }, 500);

  client.on('message', (message: Message) => {
    if (message.content.match(/^!play\s+.+/)) {
      const parts = message.content.split(/\s+/).slice(1);
      const url = parts[0];

      if (!message.member.voiceChannel) {
        message.reply('You must be in a voice channel in order to use this command.');
        return;
      }

      if (url.match(/youtube\.com/)) {
        manager.enqueueStream(message.member.voiceChannel, ytdl(url, { filter: 'audioonly' }));
      } else {
        manager.enqueueArbitraryInput(message.member.voiceChannel, url);
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
    if (oldMember.voiceChannel !== newMember.voiceChannel && !oldMember.user.bot && !newMember.user.bot) {
      let message;
      let channel: VoiceChannel;
      const userName = newMember.nickname ? newMember.nickname : newMember.displayName;

      const filterBots = (m: GuildMember) => !m.user.bot;

      // there seems to be a bug with discordjs@11.3.2 where short clips won't play. I added 'has' here.
      if (newMember.voiceChannel && newMember.voiceChannel.members.some(filterBots)) {
        message = getURLForMessage(`${userName} has joined`);
        channel = newMember.voiceChannel;
      }

      if (oldMember.voiceChannel && oldMember.voiceChannel.members.some(filterBots)) {
        message = getURLForMessage(`${userName} has left`);
        channel = oldMember.voiceChannel;
      }

      message.then(url => manager.enqueueArbitraryInput(channel, url, 3));
    }
  });
};
