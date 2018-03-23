import { Client } from 'discord.js';

import { readFileSync } from 'fs';

const client = new Client();
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

client.on('ready', () => console.log("I'm ready!"));

client.login(config.token);