import { Client } from 'discord.js';

export interface Command {
  name: string;
  register: (client: Client) => void;
  help: string;
}