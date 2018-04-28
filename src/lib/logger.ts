import {
  Message,
  StreamDispatcher,
  TextChannel,
  VoiceConnection,
} from 'discord.js';
import {
  config as WConfig,
  Logger as WLogger,
  LoggerInstance as WLoggerInstance,
  NPMLoggingLevel,
  transports,
} from 'winston';

import Client from './client';
import ParsedMessage from './parsedmessage';

interface LoggingConfig {
  consoleLevel: NPMLoggingLevel;
  destinationFile: string;
  enabled: boolean;
  fileLevel: NPMLoggingLevel;
}

const defaultConfig: LoggingConfig = {
  consoleLevel: 'info',
  destinationFile: 'default.log',
  enabled: true,
  fileLevel: 'debug',
};

export default class Logger {
  private winston: WLoggerInstance;
  private config: LoggingConfig | null;

  public constructor(client: Client) {
    client.config<Partial<LoggingConfig>>('logging')
      .then((config) => {
        this.config = {
          ...defaultConfig,
          ...config,
        };

        this.winston = new WLogger({
          transports: [
            new transports.Console({
              formatter: (options) => (
                `${new Date().toISOString()}`
                + '  '
                + WConfig.colorize(options.level, `[${options.level.toUpperCase()}]`)
                + '  '
                + (options.message ? options.message : '')
                + (options.meta && Object.keys(options.meta).length ? 
                   `\n\tMetadata: ${WConfig.colorize('verbose' as any, this.serialize(options.meta))}`
                 : '')
              ),
              level: config.consoleLevel,
            }),
            new transports.File({
              filename: config.destinationFile,
              formatter: (options) => (
                `${new Date().toISOString()}`
                + '\t'
                + options.level.toUpperCase()
                + '\t'
                + (options.message ? options.message : '')
                + (options.meta && Object.keys(options.meta).length ? `\n\t\t${this.serialize(options.meta)}` : '')
              ),
              json: false,
              level: config.fileLevel,
            }),
          ],
        });
      }).catch((err) => {
        if (err) {
          console.error('Logging configuration failed to load.');
          throw err;
        }
      });
  }

  public log(level: NPMLoggingLevel, message: string, meta?: any) {
    if (!this.canLog()) {
      console.log(`[!] [${level.toUpperCase()}]: ${message}`);
      return;
    }

    this.winston.log(level, message, meta);
  }

  public warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  public error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  public info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  public debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  public verbose(message: string, meta?: any) {
    this.log('verbose', message, meta);
  }

  // Does shallow serialization of only useful keys on reserved meta keys.
  private serialize(meta: any): string {
    const ret: any = {};

    Object.keys(meta).forEach(k => {
      if (k === 'guild') {
        ret[k] = {
          name: meta[k].name,
        };
      } else if (k === 'channel') {
        ret[k] = {
          guild: {
            name: meta[k].guild && meta[k].guild.name,
          },
          name: meta[k].name,
          speakable: meta[k].speakable,
        };
      } else if (k === 'member' || k === 'invoker') {
        ret[k] = {
          displayName: meta[k].displayName,
          guild: {
            name: meta[k].guild && meta[k].guild.name,
          },
          nickname: meta[k].nickname,
          user: {
            username: meta[k].user.username,
          },
        };
      } else if (k === 'dispatcher') {
        const dispatcher: StreamDispatcher = meta[k];
        const conn: VoiceConnection = dispatcher.player.voiceConnection;

        ret[k] = {
          channel: {
            name: conn.channel.name,
          },
          destroyed: dispatcher.destroyed,
          guild: {
            name: conn.channel.guild.name,
          },
          time: dispatcher.time,
          totalStreamTime: dispatcher.totalStreamTime,
        };
      } else if (k === 'parsedMessage' || k === 'message') {
        let message: Message;

        if (k === 'parsedMessage') {
          message = meta[k].wrappedMessage;
        } else {
          message = meta[k];
        }

        const channel = message.channel as TextChannel;

        ret['message'] = {
          author: message.author && {
            username: message.author.username,
          },
          channel: {
            name: channel.name,
          },
          content: message.content,
          guild: message.guild && {
            name: message.guild.name,
          },
          member: message.member && {
            displayName: message.member.displayName,
            nickname: message.member.nickname,
          },
        };
      } else if (k === 'error') {
        const error: Error = meta[k];

        ret[k] = {
          message: error.message,
          stack: error.stack,
        };
      } else if (k === 'voiceQueue') {
        ret[k] = {
          guildCount: meta[k].length,
          totalStreams: meta[k].totalLength,
        };
      } else {
        ret[k] = meta[k];
      }
    });

    return JSON.stringify(ret);
  }

  private canLog(): boolean {
    return this.winston && this.config && this.config.enabled;
  }
}
