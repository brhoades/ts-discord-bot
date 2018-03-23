import { Client } from 'discord.js';

import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';

import { Command } from './types/Command';

const client = new Client();
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

const loadModules = (path: string) => {
  readdirSync(path).map((file: string) => {
    const command: Command = require(join(path, file));

    console.log(`Loading command ${command.name}`);
    command.register(client);
  });
};

loadModules(join(dirname(__filename), 'commands'));

client.on('ready', () => {
  console.log("I'm ready!")
});

client.login(config.token);