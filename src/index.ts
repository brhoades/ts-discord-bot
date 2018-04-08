import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import * as process from 'process';

import Client from './lib/client';

const client = new Client();
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

client.loadModules(join(dirname(__filename), 'modules'));

client.on('ready', () => {
  console.log('Connected');
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

process.once('SIGINT', () => {
  console.log('Quitting...');

  client.destroy();
  client.on('disconnect', () => {
    process.exit(0);
  });
});

// nodemon restart signal
process.once('SIGUSR2', () => {
  console.log('Reloading...');

  client.destroy();
  client.on('disconnect', () => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

client.login(config.token);
