import { Message } from 'discord.js';

import Client from '../lib/client';
import { Help, HelpCommand } from '../types/command';

export const name = 'Help';
export const help: Help = {
  commands: [
    {
      description: 'Prints out help information about a specific command (if specified) or all commands.',
      invocation: `**!help** *(command)*`,
      invocationTest: new RegExp(`^!help`),
      shortDescription: 'lists all commands or shows help for a specific command',
    },
  ],
};

export const register = (client: Client) => {
  client.onCommand('help', (message) => {
    const commands = client.commands
                           .reduce((acc, com) => [...acc, ...com.help.commands], []);
    if (message.args.length > 0) {
      const commandRegex = new RegExp(`!?${message.args[0]}`);
      const match = commands.find((c: HelpCommand) => commandRegex.test(c.invocation));

      if (match) {
        message.channel.send(`Help for: ${match.invocation}\n${match.description}`);
      } else {
        message.channel.send(`Unknown command ${message.args[0]}.`);
      }
    } else {
      message.channel.send(commands.map(c => ` ${c.invocation}: ${c.shortDescription}`).join('\n'));
    }
  });
};
