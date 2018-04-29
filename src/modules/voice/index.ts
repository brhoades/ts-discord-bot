import { Guild, GuildMember, Message, StreamDispatcher, VoiceChannel, VoiceConnection } from 'discord.js';
import { Readable } from 'stream';
const ytdl = require('ytdl-core');
const googleTTS = require('google-tts-api');
import { createHash } from 'crypto';
import { createWriteStream, exists as pathExists, mkdirSync, write as fileWrite } from 'fs';
import { get as httpsGet } from 'https';
import { join as pathJoin } from 'path';

import Client from '../../lib/client';
import ParsedMessage from '../../lib/parsedmessage';
import VoiceManager from './voicemanager';
import { Help } from '../../types/module';

export const name = 'Voice';
export const help: Help = {
  commands: [
    {
      description: ('Plays a YouTube video or an arbitrary URL which provides audio data into '
                  + 'the channel you are in. If a volume is specified the audio will be played '
                  + 'at that volume level.'),
      invocation: '**!play** [url] (*volume*)',
      invocationTest: new RegExp(`^!play\s+.+?\s[0-9.]*$`),
      shortDescription: 'play a YouTube video or other audio into a voice channel.',
    },
    {
      description: 'Stops whatever the bot is currently playing in your channel.',
      invocation: '**!stop**',
      invocationTest: new RegExp(`^!stop$`),
      shortDescription: 'makes the bot stop playing something in your channel.',
    },
    {
      description: ('Say something via TTS in the voice channel you are in. '
                    + 'Optionally pass a language to speak in via -lang (eg,'
                    + ' "!play -lang de Hello everyone!"'),
      invocation: '**!say** *(-lang languageabbrevation)* [message]',
      invocationTest: new RegExp(`^!say (-lang [A-Z]{2,4})? .+$`),
      shortDescription: 'makes the bot stop playing something in your channel.',
    },
    {
      description: ('Sets the volume for the stream playing in your channel to the passed value'
                    + ' in the range 0 to 1. For example, passing 0.25 will set the volume to 25%'),
      invocation: '**!volume** [volume level]',
      invocationTest: new RegExp(`^!volume [0-9.]+$`),
      shortDescription: 'sets the volume for anything playing in your voice channel.',
    },
  ],
};

interface TTSOptions {
  language: string;
  volume: number;
  removeFile: boolean;
  basedir: string;
}

const defaultOptions: TTSOptions = {
  basedir: '/tmp/cached_voices',
  language: 'en',
  removeFile: false,
  volume: 1,
};

const getTTSMessage = (message: string, rawOptions: Partial<TTSOptions>): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const options: TTSOptions = { ...defaultOptions, ...rawOptions };
    const hash = createHash('md5')
      .update(`${message}${options.language}${options.volume}`)
      .digest('hex');
    const filename = pathJoin(options.basedir, hash);

    pathExists(options.basedir, (basedirExists) => {
      if (!basedirExists) {
        mkdirSync(options.basedir);
      }

      pathExists(filename, (exists) => {
        if (exists) {
          return resolve(filename);
        }

        googleTTS(message, options.language, options.volume)
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

const playTTSMessage = (manager: VoiceManager, message: string, channel: VoiceChannel,
                        options: Partial<TTSOptions> = {}) => {
  const inferredOptions = { ...defaultOptions, ...options };
  getTTSMessage(message, options)
    .then((file: string) => {
      manager.enqueueFile(channel, file, {
        limit: 3,
        removeFile: inferredOptions.removeFile,
      });
    })
    .catch((err) => {
      console.error(`Error when getting a TTS join/part message: ${err.message}`);
      console.log(err.stack);
    });
};

export const register = (client: Client) => {
  const manager = new VoiceManager(client);

  client.onCommand('play', (message) => {
    if (message.args.length > 0) {
      const url = message.args[0];
      let volume = parseFloat(message.args.length > 1 ? message.args[1] : '1');

      if (volume > 1 && volume <= 100) {
        volume = volume / 100.0;
      } else if (volume > 100) {
        volume = 1;
      } else if (volume <= 0) {
        return;
      }

      if (!message.member.voiceChannel) {
        message.reply('You must be in a voice channel in order to use this command.');
        return;
      }

      if (url.match(/youtube\.com/)) {
        client.log.debug('Enqueuing YouTube video', {
          parsedMessage: message,
          url,
          volume,
        });
        try {
          manager.enqueueStream(message.member.voiceChannel, ytdl(url, { filter: 'audioonly' }), { volume });
        } catch (error) {
          client.log.error('Error playing a YouTube video.', {
            error: {
              mesage: error.message,
              stack: error.stack,
            },
            parsedMessage: message,
            url,
            volume,
          });
          message.reply('Error playing the provided url.');
        }
      } else {
        client.log.debug('Enqueuing arbitrary URL', {
          parsedMessage: message,
          url,
        });
        manager.enqueueArbitraryInput(message.member.voiceChannel, url, { volume });
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

  // TODO: argument handling
  client.onCommand('say', (message) => {
    if (message.args.length === 0) {
      return;
    }

    if (!message.member.voiceChannel) {
      message.reply('You must be in a voice channel in order to use this command.');
      return;
    }

    let language;
    let ttsMessage = message.args.join(' ');
    if (message.args[0] === '-lang') {
      language = message.args[1];
      ttsMessage = message.args.slice(2).join(' ');
    }

    if (ttsMessage.length > 100) {
      message.reply('Provided message is too long.');
      return;
    }

    client.log.debug('Playing TTS message', {
      parsedMessage: message,
      ttsMessage,
    });
    playTTSMessage(manager, ttsMessage, message.member.voiceChannel, {
      language,
      removeFile: true,
    });
  });

  client.onCommand('volume', (message) => {
    if (!message.member.voiceChannel) {
      message.reply('You must be in a voice channel in order to use this command.');
      return;
    }

    if (message.args.length === 0) {
      message.reply('You must provide a volume from 0 to 1 as an argument.');
      return;
    }

    let volume = parseFloat(message.args[0]);

    if (volume > 1 && volume <= 100) {
      volume = volume / 100.0;
    } else if (volume > 100) {
      volume = 1;
    } else if (volume <= 0) {
      return;
    }

    const dispatchers = manager.getDispatchersForChannel(message.member.voiceChannel);

    if (dispatchers.length === 0) {
      message.reply('I\'m not playing anything in your channel.');
      return;
    }

    dispatchers[0].setVolume(volume);
    message.reply(`Set volume to ${volume}.`);
  });

  client.on('voiceStateUpdate', (oldMember: GuildMember, newMember: GuildMember) => {
    if (oldMember.voiceChannel !== newMember.voiceChannel && !oldMember.user.bot && !newMember.user.bot) {
      const userName = newMember.nickname ? newMember.nickname : newMember.displayName;
      const filterBots = (m: GuildMember) => !m.user.bot;
      const newVoiceChannel = newMember.voiceChannel;
      const oldVoiceChannel = oldMember.voiceChannel;
      let played = false;

      // there seems to be a bug with discordjs@11.3.2 where short clips won't play. I added 'has' here.
      if (newVoiceChannel && newVoiceChannel.speakable && newVoiceChannel.joinable
          && newVoiceChannel.members.some(filterBots)) {
        playTTSMessage(manager, `${userName} has joined`, newVoiceChannel);
        client.log.debug('Playing join message', {
          channel: oldVoiceChannel,
          member: newMember,
        });
        played = true;
      }


      if (oldVoiceChannel && oldVoiceChannel.speakable && oldVoiceChannel.joinable
          && oldVoiceChannel.members.some(filterBots)) {
        playTTSMessage(manager, `${userName} has left`, oldVoiceChannel);
        client.log.debug('Playing part message', {
          channel: oldVoiceChannel,
          member: newMember,
        });
        played = true;
      }

      if (!played) {
        // leave if either channel is empty and we didn't queue something.
        if (oldVoiceChannel && oldVoiceChannel.connection && !oldVoiceChannel.members.some(filterBots)) {
          client.log.debug('Leaving now empty channel', {
            channel: oldVoiceChannel,
            member: newMember,
          });
          oldVoiceChannel.connection.disconnect();
        } else if (newVoiceChannel && newVoiceChannel.connection && !newVoiceChannel.members.some(filterBots)) {
          client.log.debug('Leaving now empty channel', {
            channel: newVoiceChannel,
            member: newMember,
          });
          newVoiceChannel.connection.disconnect();
        }
      }
    }
  });
};
