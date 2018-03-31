import { Guild, GuildMember, Message, StreamDispatcher, VoiceChannel, VoiceConnection } from 'discord.js';
import { Readable } from 'stream';
const ytdl = require('ytdl-core');
const googleTTS = require('google-tts-api');
import { createHash } from 'crypto';
import { createWriteStream, exists as pathExists, mkdirSync, write as fileWrite } from 'fs';
import { get as httpsGet } from 'https';
import { join as pathJoin } from 'path';

import Client from '../lib/client';
import VoiceManager from '../lib/voicemanager';
import { Help } from '../types/command';

export const name = 'Voice';
export const help: Help = {
  commands: [
    {
      description: ('Plays a YouTube video or an arbitrary URL which provides audio data into '
                    + 'the channel the invoker is in.'),
      invocation: `!play`,
      invocationTest: new RegExp(`^!play\s+.+$`),
      shortDescription: 'play a YouTube video or other audio into a voice channel.',
    },
    {
      description: 'Stops whater the bot is currently playing in your channel.',
      invocation: `!stop`,
      invocationTest: new RegExp(`^!stop$`),
      shortDescription: 'makes the bot stop playing something in your channel.',
    },
  ],
};

const getTTSMessage = (message: string, language: string = 'en', volume: number = 1,
                       basedir: string = '/tmp/cached_voices', cache: boolean = true): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('md5').update(`${message}${language}${volume}`).digest('hex');
    const filename = pathJoin(basedir, hash);

    pathExists(basedir, (basedirExists) => {
      if (!basedirExists) {
        mkdirSync(basedir);
      }

      pathExists(filename, (exists) => {
        if (exists) {
          return resolve(filename);
        }
        googleTTS(message, language, volume)
          .then((url: string) => {
            const stream = createWriteStream(filename);
            stream.addListener('close', () => resolve(filename));
            stream.addListener('error', (err) => reject(err));

            const request = httpsGet(url, (response) => {
              if (response.statusCode >= 400) {
                return reject(new Error(
                  `Error when fetching Google TTS transcription: ${response.statusCode} ${response.statusMessage}`,
                ));
              }

              response.pipe(stream);
            });
          })
          .catch(() => reject('An unknown error occurred when resolving the URL for a voice status change TTS.'));
      });
    });
  });
};

const playTTSMessage = (manager: VoiceManager, message: string, channel: VoiceChannel) => {
  getTTSMessage(message)
    .then((file: string) => {
      manager.enqueueFile(channel, file, 3);
    })
    .catch((err) => {
      console.error(`Error when getting a TTS join/part message: ${err.message}`);
      console.log(err.stack);
    });
};

export const register = (client: Client) => {
  const manager = new VoiceManager(client);

  // set up queue proceessing
  setInterval(() => { manager.processQueue(); }, 500);

  client.onCommand('play', (message) => {
    if (message.args.length > 0) {
      const url = message.args[0];

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
  });

  client.onCommand('stop', (message) => {
    if (manager.stopPlaying(message.guild)) {
      message.reply('Stopped');
    } else {
      message.reply('Not currently playing anything on this server.');
    }
  });

  client.on('voiceStateUpdate', (oldMember: GuildMember, newMember: GuildMember) => {
    if (oldMember.voiceChannel !== newMember.voiceChannel && !oldMember.user.bot && !newMember.user.bot) {
      const userName = newMember.nickname ? newMember.nickname : newMember.displayName;

      const filterBots = (m: GuildMember) => !m.user.bot;

      // there seems to be a bug with discordjs@11.3.2 where short clips won't play. I added 'has' here.
      if (newMember.voiceChannel && newMember.voiceChannel.speakable
          && newMember.voiceChannel.joinable && newMember.voiceChannel.members.some(filterBots)) {
        playTTSMessage(manager, `${userName} has joined`, newMember.voiceChannel);
      }


      if (oldMember.voiceChannel && oldMember.voiceChannel.speakable
          && oldMember.voiceChannel.joinable && oldMember.voiceChannel.members.some(filterBots)) {
        playTTSMessage(manager, `${userName} has left`, oldMember.voiceChannel);
      }
    }
  });
};
