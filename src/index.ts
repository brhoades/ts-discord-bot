import { Client } from 'discord.js';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import * as process from 'process';

import { Command } from './types/command';

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
  console.log('Ready');
});

process.on('SIGINT', () => {
  console.log('Quitting...');

  client.destroy();
});

// nodemon restart signal
process.once('SIGUSR2', () => {
  console.log('Reloading...');

  client.destroy();
});

client.login(config.token);
