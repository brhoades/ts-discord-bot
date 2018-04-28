import { Logger as WLogger, LoggerInstance as WLoggerInstance, NPMLoggingLevel, transports } from 'winston';

import Client from './client';

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
            new transports.Console({ level: config.consoleLevel }),
            new transports.File({ filename: config.destinationFile, level: config.fileLevel }),
          ],
        });
      }).catch((err) => {
        if (err) {
          console.error('Logging configuration failed to load.');
          throw err;
        }
      });
  }

  public log(level: NPMLoggingLevel, message: string) {
    if (!this.canLog()) {
      console.log(`[!] [${level.toUpperCase()}]: ${message}`);
      return;
    }

    this.winston.log(level, message);
  }

  public warn(message: string) {
    this.log('warn', message);
  }

  public error(message: string) {
    this.log('error', message);
  }

  public info(message: string) {
    this.log('info', message);
  }

  public debug(message: string) {
    this.log('debug', message);
  }

  public verbose(message: string) {
    this.log('verbose', message);
  }

  private canLog(): boolean {
    return this.winston && this.config && this.config.enabled;
  }
}
