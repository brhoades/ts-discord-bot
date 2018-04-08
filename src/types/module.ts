import { Client } from 'discord.js';

export interface Module {
  name: string;
  register: (client: Client) => void;
  help: Help;
}

export interface HelpCommand {
  description: string;
  invocation: string;
  invocationTest: RegExp;
  shortDescription: string;
}

export interface Help {
  commands: HelpCommand[];
}
