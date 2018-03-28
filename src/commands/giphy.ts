import { RestClient } from 'typed-rest-client/RestClient';

import Client from '../lib/client';
import { Help } from '../types/command';

const rest = new RestClient('discord-bot');

interface GiphyHTTPResponse {
  data: {
    image_url: string;
    image_mp4_url: string;
  };
}

async function giphy(queryParts: string[]): Promise<string> {
  const query = queryParts.join('+');
  const url = `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${query}`;
  const response = await rest.get<GiphyHTTPResponse>(url);

  return new Promise<string>((resolve, reject) => {
    if (response.statusCode !== 200) {
      reject(new Error(`Giphy API returned ${response.statusCode}`));
    }

    resolve(response.result.data.image_url);
  });
}

export const name = 'Giphy';
export const help: Help = {
  commands: [
    {
      description: 'Search for a random giphy with the provided tag.',
      invocation: `!gp`,
      invocationTest: new RegExp(`^!gp\s+.+$`),
      shortDescription: 'search for a random giphy',
    },
  ],
};

export const register = (client: Client) => {
  client.onMessage((message) => {
    if (!message.command) {
      return;
    }

    if (message.command === 'gp') {
      giphy(message.args)
        .then((imageURL) => message.channel.send(imageURL))
        .catch(err => message.reply(err.message));
    }
  });
};
