import { Channel, Client as DiscordClient, Message as DiscordMessage } from 'discord.js';

import { Client } from './client';

export default class Message extends DiscordMessage {
  public parts: string[];
  public command?: string;
  public args: string[];

  constructor(client: DiscordClient, channel: Channel, message: Message) {
    super(client, {}, channel);

    Object.assign(this, message);
  }

  // After casting, prepare our helper data.
  public process(): void {
    this.parts = this.content.split(/\s+/);
    this.command = this.parts.length > 0 && this.parts[0].startsWith('!') ? this.parts[0].slice(1) : null;
    this.args = this.parts.length > 1 ? this.parts.slice(1) : [];
  }
}
