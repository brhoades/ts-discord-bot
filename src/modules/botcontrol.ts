import { Message } from 'discord.js';

import Client from '../lib/client';
import { Help, HelpCommand } from '../types/command';

export const name = 'Bot Control';
export const help: Help = {
  commands: [
    {
      description: 'Kills the bot\'s connection to the server.',
      invocation: '**!quit**',
      invocationTest: new RegExp(`^!quit`),
      shortDescription: 'Kills the bot entirely.',
    },
  ],
};

export const register = (client: Client) => {
  client.onCommand('quit', () => {
    client.destroy();
    client.on('disconnect', () => {
      process.exit(0);
    });
  });
};
