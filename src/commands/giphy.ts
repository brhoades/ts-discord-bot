import { Client, Message } from 'discord.js';
import { RestClient } from 'typed-rest-client/RestClient';

const rest = new RestClient('discord-bot');

interface GiphyHTTPResponse {
  data: {
    image_url: string;
    image_mp4_url: string;
  };
}

async function giphy(message: Message) {
  const parts = message.content.split(/\s+/).slice(1);
  const query = parts.join('+');
  const url = `https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${query}`;

  const response = await rest.get<GiphyHTTPResponse>(url);

  message.channel.send(response.result.data.image_url);
};

export const name = "Giphy Command";
export const help = "None!";
export const register = (client: Client) => {
  client.on('message', (message: Message) => {
    if (message.content.match(/^!gp\s+.+/)) {
      giphy(message);
    }
  });
};