import { Message, RichEmbed } from 'discord.js';
import { RestClient } from 'typed-rest-client/RestClient';

import Client from '../lib/client';
import { truncate } from '../lib/utils';
import { Help } from '../types/command';

const rest = new RestClient('discord-bot');

interface UrbanDefinition {
  definition: string;
  permalink: string;
  thumbs_up: number;
  author: string;
  word: string;
  defid: number;
  current_vote: string;
  written_on: string;
  example: string;
  thumbs_down: string;
}

interface UDHTTPResponse {
  tags: number[];
  result_type: string;
  list: UrbanDefinition[];
}

async function urban(queryParts: string[]): Promise<RichEmbed|string> {
  const query = queryParts.join('+');
  const url = `http://api.urbandictionary.com/v0/define?term=${query}`;
  const response = await rest.get<UDHTTPResponse>(url);

  return new Promise<RichEmbed|string>((resolve, reject) => {
    if (response.statusCode !== 200) {
      reject(new Error(`Urban API returned ${response.statusCode}`));
    }

    if (response.result.list.length === 0) {
      resolve(`Search for "${queryParts.join(' ')}" returned no results.`);
    }

    const msg = new RichEmbed({
      title: queryParts.join(' '),
    });

    const firstResult = response.result.list[0];

    msg.addField('Definition', truncate(firstResult.definition, 1024));
    msg.addField('Example', truncate(firstResult.example, 1024));
    msg.addField('Author', firstResult.author, true);
    msg.addField('Written On', new Date(firstResult.written_on).toLocaleDateString(), true);
    msg.addBlankField(false);
    msg.addField(':thumbsup:', firstResult.thumbs_up, true);
    msg.addField(':thumbsdown:', firstResult.thumbs_down, true);
    msg.setURL(response.result.list[0].permalink);

    resolve(msg);
  });
}

export const name = 'Urban Dictionary';
export const help: Help = {
  commands: [
    {
      description: 'Gets an urban dictionary defnition for a passed word or phrase.',
      invocation: '!urban/!ud',
      invocationTest: new RegExp(`^!(urban|ud)\s+.+$`),
      shortDescription: 'get an urban dictionary definition for a word or phrase.',
    },
  ],
};

export const register = (client: Client) => {
  client.onCommand(['ud', 'urban'], (message) => {
    urban(message.args)
      .then((response) => message.channel.send(response))
      .catch(err => message.reply(err.message));
  });
};
