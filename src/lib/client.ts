import { Client as DiscordClient, Message as DiscordMessage } from 'discord.js';
import { join } from 'path';
import { readdir, readFile, stat } from 'fs';

import { Module } from '../types/module';
import MapToArray from './maptoarray';
import ParsedMessage from './parsedmessage';

type ModuleListener = (message: ParsedMessage) => any;

export default class Client extends DiscordClient {
  public modules: Module[] = [];
  public moduleListeners: MapToArray<string, ModuleListener>;

  public constructor() {
    super();

    this.moduleListeners = new MapToArray<string, ModuleListener>();
    this.on('message', this.processModule.bind(this));
  }

  public loadModules(basedir: string) {
    readdir(basedir, (err, identifiers) => {
      if (err) {
        throw err;
      }

      Promise.all(identifiers.map(identifier => {
        return new Promise<null>((resolve, reject) => {
          const modulePath = join(basedir, identifier);
          stat(modulePath, (statErr, stats) => {
            if (statErr) {
              return reject(statErr);
            }

            if (stats.isDirectory()) {
              return;
            }

            this.loadModule(modulePath);
            resolve();
          });
        });
      })).then((modules) => {
        console.log(`${this.modules.length} modules loaded.`);
        this.registerModules();
        console.log(`${this.moduleListeners.length} module hooks ready.`);
      }).catch((loadingErr: Error) => {
        console.error(`Error loading bot modules: ${loadingErr.message}.`);
        console.error(loadingErr.stack);
      });
    });
  }

  // Call once. Registers all modules.
  public registerModules() {
    this.modules.map(c => c.register(this));
  }

  // Wraps on message to provide some useful command processing.
  public onMessage(func: (message: ParsedMessage) => any): this {
    this.on('message', (message: DiscordMessage) => {
      func(new ParsedMessage(message));
    });

    return this;
  }

  public onCommand(module: string|string[], func: (message: ParsedMessage) => any): this {
    if (typeof module === 'string') {
      this.moduleListeners.push(module, func);
    } else {
      module.map((com) => this.moduleListeners.push(com, func));
    }

    return this;
  }

  // On every message process it to see if it's a command and call matching
  // functions.
  private processModule(rawMessage: DiscordMessage) {
    const message = new ParsedMessage(rawMessage);

    if (message.command && this.moduleListeners.has(message.command)) {
      this.moduleListeners
          .get(message.command)
          .forEach((listener) => listener(message));
    }
  }

  private loadModule(path: string): Promise<Module> {
    return new Promise<Module>((resolve, reject) => {
      try {
        const module: Module = require(path);

        this.modules.push(module);
        console.log(`Loaded module ${module.name}`);
        resolve(module);
      } catch (e) {
        reject(e);
      }
    });
  }
}
