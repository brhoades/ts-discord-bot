import { Client as DiscordClient, Message as DiscordMessage } from 'discord.js';

import { Command } from '../types/command';
import MapToArray from './maptoarray';
import ParsedMessage from './parsedmessage';

type CommandListener = (message: ParsedMessage) => any;

export default class Client extends DiscordClient {
  public commands: Command[] = [];
  public commandListeners: MapToArray<string, CommandListener>;

  public constructor() {
    super();

    this.commandListeners = new MapToArray<string, CommandListener>();
    this.on('message', this.processCommand.bind(this));
  }

  public addCommand(command: Command) {
    this.commands.push(command);

    console.log(`Loading command ${command.name}`);
  }

  // Call once. Registers all commands.
  public registerCommands() {
    this.commands.map(c => c.register(this));
  }

  // Wraps on message to provide some useful command processing.
  public onMessage(func: (message: ParsedMessage) => any): this {
    this.on('message', (message: DiscordMessage) => {
      func(new ParsedMessage(message));
    });

    return this;
  }

  public onCommand(command: string|string[], func: (message: ParsedMessage) => any): this {
    if (typeof command === 'string') {
      this.commandListeners.push(command, func);
    } else {
      command.map((com) => this.commandListeners.push(com, func));
    }

    return this;
  }

  // On every message process it to see if it's a command and call matching
  // functions.
  private processCommand(rawMessage: DiscordMessage) {
    const message = new ParsedMessage(rawMessage);

    if (message.command && this.commandListeners.has(message.command)) {
      this.commandListeners
          .get(message.command)
          .forEach((listener) => listener(message));
    }
  }
}
