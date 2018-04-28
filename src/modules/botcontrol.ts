import { Message } from 'discord.js';

import Client from '../lib/client';
import { Help, HelpCommand } from '../types/module';

export const name = 'Bot Control';
export const help: Help = {
  commands: [
    {
      description: 'Kills the bot',
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
