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

client.on('error', (error) => {
  console.error(`Client error: ${error.message}`);
  console.error(error.stack);
});

client.on('warn', (warn) => {
  console.error(`Client warning: ${warn}`);
});

client.on('debug', (debug) => {
  console.debug(`Client debuging: ${debug}`);
});

process.on('SIGINT', () => {
  console.log('Quitting...');

  client.destroy();
  process.exit(0);
});

// nodemon restart signal
process.once('SIGUSR2', () => {
  console.log('Reloading...');

  client.destroy();
  process.kill(process.pid, 'SIGUSR2');
});

client.login(config.token);
