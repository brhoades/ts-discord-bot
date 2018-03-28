import { Client as DiscordClient, Message as DiscordMessage } from 'discord.js';

import { Command } from '../types/command';
import Message from './message';

export default class Client extends DiscordClient {
  public commands: Command[] = [];

  public addCommand(command: Command) {
    this.commands.push(command);

    console.log(`Loading command ${command.name}`);
  }

  // Call once. Registers all commands.
  public registerCommands() {
    this.commands.map(c => c.register(this));
  }

  // Wraps on message to provide some useful command processing.
  public onMessage(func: (message: Message) => any): this {
    this.on('message', (message: Message) => {
      const newMessage = <Message>message;
      newMessage.process();
      func(newMessage);
    });

    return this;
  }
}
