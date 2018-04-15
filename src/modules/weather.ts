import { RichEmbed } from 'discord.js';
import * as request from 'request';
import { RestClient } from 'typed-rest-client/RestClient';

import Client from '../lib/client';
import { Help } from '../types/command';

const rest = new RestClient('discord-bot');

interface Weather {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface WeatherAPIResponse {
  properties: {
    updated: string;
    units: string;
    generatedAt: string;
    updateTime: string;
    validTimes: string;
    periods: Weather[];
  };
}

interface Coordinate {
  formattedAddress: string,
  latitude: number;
  longitude: number;
}

interface GeolocationAPIResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
  };
}

interface GeolocationAPIResponse {
  results?: GeolocationAPIResult[];
  error?: {
    errors: GoogleAPIError[];
    code: number;
    message: string;
  };
}

interface GoogleAPIError {
  domain: string;
  reason: string;
  message: string;
}

interface WeatherConfig {
  google_geolocation_api_key: string;
}

async function geolocate(zip: string, apiKey: string): Promise<Coordinate> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}&address=${encodeURI(zip)}`;
  const response = await rest.get<GeolocationAPIResponse>(url);

  return new Promise<Coordinate>((resolve, reject) => {
    if (response.statusCode !== 200) {
      return reject(new Error(`Google Geolocation API returned status ${response.statusCode}.`));
    }

    if (response.result.error) {
      return reject(new Error(`Google Geolocation API returned an error: "${response.result.error.message}".`));
    }

    if (response.result.results.length === 0) {
      console.dir(response.result);
      return reject(new Error(`Google Geolocation API returned no matches for: "${zip}".`));
    }

    const { lat, lng } = response.result.results[0].geometry.location;
    resolve({
      formattedAddress: response.result.results[0].formatted_address,
      latitude: lat,
      longitude: lng,
    });
  });
}

const weather = (location: Coordinate): Promise<Weather> => {
  return new Promise<Weather>((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'request Discord Bot/0.0.1',
      },
      json: true,
      url: `https://api.weather.gov/points/${location.latitude},${location.longitude}/forecast`,
    };

    request(options, (err, res, result) => {
      if (err) {
        return reject(err);
      }

      if (res.statusCode >= 400) {
        return reject(new Error(`NOAA Weather API returned HTTP ${res.statusCode}.`));
      }

      if (!result || !result.properties || result.properties.periods.length === 0) {
        return reject(
          new Error(`NOAA Weather API returned no matches for ${location.latitude},${location.longitude}.`),
        );
      }

      resolve({
        ...result.properties.periods[0],
        ...location,
      });
    });
  });
};

export const name = 'Weather';
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
  let config: Partial<WeatherConfig> = {};

  client.config<WeatherConfig>(name.toLowerCase())
        .then((configData) => { config = configData; })
        .catch((err) => console.error(err.message));

  client.onCommand(['weather', 'w'], (message) => {
    if (message.args.length !== 1) {
      return;
    }

    if (!config.google_geolocation_api_key) {
      message.reply('Geolocation is not properly configured.');
      return;
    }

    geolocate(message.args[0], config.google_geolocation_api_key)
      .then((coords) => (
        weather(coords)
          .then((res: Weather) => {
            const msg = new RichEmbed({
              title: `Weather for ${res.formattedAddress}`,
            });
            msg.addField('Temperature', `${res.temperature} ${res.temperatureUnit}`, true);
            msg.addField('Wind', `${res.windSpeed} ${res.windDirection}`, true);
            msg.setImage(res.icon);
            msg.addField('Forecast', res.detailedForecast);

            message.channel.send(msg);
          })
          .catch(err => message.reply(err.message))
      ))
      .catch(err => message.reply(err.message));
  });
};
