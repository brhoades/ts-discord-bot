import {
  Client as DiscordClient,
  DMChannel,
  GroupDMChannel,
  Guild,
  GuildMember,
  Message as DiscordMessage,
  TextChannel,
} from 'discord.js';

export default class ParsedMessage {
  public parts: string[] = [];
  public command?: string;
  public args: string[] = [];

  public channel: TextChannel | DMChannel | GroupDMChannel;
  public guild: Guild;
  public member: GuildMember;
  public reply: (message: string) => void;

  constructor(public wrappedMessage: DiscordMessage) {
    this.channel = wrappedMessage.channel;
    this.guild = wrappedMessage.guild;
    this.reply = wrappedMessage.reply;
    this.member = wrappedMessage.member;

    this.process();
  }

  private process(): void {
    this.parts = this.wrappedMessage.content.split(/\s+/);
    this.command = this.parts.length > 0 && this.parts[0].startsWith('!') ? this.parts[0].slice(1) : null;
    this.args = this.parts.length > 1 ? this.parts.slice(1) : [];
  }
}
