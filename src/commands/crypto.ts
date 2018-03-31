import { Message, RichEmbed } from 'discord.js';
import { table } from 'table';
import { RestClient } from 'typed-rest-client/RestClient';
const rest = new RestClient('discord-bot');

import Client from '../lib/client';
import { Help } from '../types/command';

interface CryptoCoin {
  id: string;
  name: string;
  rank: string;
  '24h_volume_usd': string;
  symbol: string;
  price_usd: string;
  price_btc: string;
  percent_change_1h: string;
  percent_change_24h: string;
  percent_change_7d: string;
}

type BTCHTTPResponse = CryptoCoin[];

const COINS = [
  'btc',
  'eth',
  'xrp',
  'bch',
  'ltc',
  'eos',
  'ada',
  'xlm',
  'neo',
  'miota',
  'dash',
  'xmr',
  'trx',
  'xem',
  'usdt',
  'etc',
  'ven',
  'qtum',
  'icx',
  'bnb',
  'lsk',
  'omg',
  'nano',
  'btg',
  'zec',
  'xvg',
  'dgd',
  'ppt',
  'strat',
  'steem',
  'bcn',
  'waves',
  'sc',
  'bts',
  'mkr',
  'veri',
  'doge',
  'rhoc',
  'ae',
  'rep',
  'btm',
  'dcr',
  'zil',
  'snt',
  'aion',
  'ont',
  'kmd',
  'wtc',
  'zrx',
  'hsr',
  'ark',
  'lrc',
  'ardr',
  'cnx',
  'qash',
  'kcs',
  'nas',
  'pivx',
  'storm',
  'dgb',
  'bat',
  'gas',
  'ethos',
  'iost',
  'mona',
  'drgn',
  'gnt',
  'fct',
  'sys',
  'knc',
  'fun',
  'etn',
  'elf',
  'salt',
  'r',
  'xzc',
  'btcd',
  'eng',
  'req',
  'gxs',
  'ncash',
  'rdd',
  'nebl',
  'link',
  'maid',
  'nxt',
  'emc',
  'powr',
  'kin',
  'pay',
  'gbyte',
  'dcn',
  'bnt',
  'mtl',
  'dent',
  'part',
  'cnd',
  'poly',
  'storj',
  'icn',
];

const GRAPHS: Map<string, string> = new Map<string, string>([
  ['bitcoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1.png'],
  ['ethereum', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1027.png'],
  ['ripple', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/52.png'],
  ['bitcoin-cash', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1831.png'],
  ['litecoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2.png'],
  ['eos', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1765.png'],
  ['cardano', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2010.png'],
  ['stellar', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/512.png'],
  ['neo', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1376.png'],
  ['iota', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1720.png'],
  ['dash', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/131.png'],
  ['monero', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/328.png'],
  ['tron', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1958.png'],
  ['nem', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/873.png'],
  ['tether', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/825.png'],
  ['ethereum-classic', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1321.png'],
  ['vechain', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1904.png'],
  ['qtum', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1684.png'],
  ['icon', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2099.png'],
  ['binance-coin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1839.png'],
  ['lisk', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1214.png'],
  ['omisego', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1808.png'],
  ['nano', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1567.png'],
  ['bitcoin-gold', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2083.png'],
  ['zcash', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1437.png'],
  ['digixdao', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1229.png'],
  ['verge', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/693.png'],
  ['populous', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1789.png'],
  ['stratis', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1343.png'],
  ['steem', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1230.png'],
  ['bytecoin-bcn', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/372.png'],
  ['waves', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1274.png'],
  ['siacoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1042.png'],
  ['maker', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1518.png'],
  ['veritaseum', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1710.png'],
  ['bitshares', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/463.png'],
  ['dogecoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/74.png'],
  ['rchain', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2021.png'],
  ['aeternity', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1700.png'],
  ['augur', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1104.png'],
  ['bytom', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1866.png'],
  ['decred', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1168.png'],
  ['status', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1759.png'],
  ['zilliqa', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2469.png'],
  ['ontology', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2566.png'],
  ['aion', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2062.png'],
  ['komodo', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1521.png'],
  ['waltonchain', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1925.png'],
  ['0x', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1896.png'],
  ['hshare', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1903.png'],
  ['ark', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1586.png'],
  ['loopring', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1934.png'],
  ['ardor', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1320.png'],
  ['cryptonex', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2027.png'],
  ['qash', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2213.png'],
  ['kucoin-shares', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2087.png'],
  ['pivx', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1169.png'],
  ['nebulas-token', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1908.png'],
  ['digibyte', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/109.png'],
  ['storm', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2297.png'],
  ['basic-attention-token', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1697.png'],
  ['gas', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1785.png'],
  ['monacoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/213.png'],
  ['iostoken', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2405.png'],
  ['dragonchain', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2243.png'],
  ['ethos', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1817.png'],
  ['golem-network-tokens', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1455.png'],
  ['factom', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1087.png'],
  ['syscoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/541.png'],
  ['funfair', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1757.png'],
  ['electroneum', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2137.png'],
  ['kyber-network', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1982.png'],
  ['revain', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2135.png'],
  ['salt', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1996.png'],
  ['aelf', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2299.png'],
  ['zcoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1414.png'],
  ['bitcoindark', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/467.png'],
  ['kin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1993.png'],
  ['gxchain', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1750.png'],
  ['request-network', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2071.png'],
  ['enigma-project', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2044.png'],
  ['nucleus-vision', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2544.png'],
  ['chainlink', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1975.png'],
  ['reddcoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/118.png'],
  ['neblio', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1955.png'],
  ['maidsafecoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/291.png'],
  ['emercoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/558.png'],
  ['nxt', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/66.png'],
  ['power-ledger', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2132.png'],
  ['tenx', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1758.png'],
  ['dentacoin', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1876.png'],
  ['byteball', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1492.png'],
  ['bancor', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1727.png'],
  ['particl', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1826.png'],
  ['dent', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1886.png'],
  ['metal', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1788.png'],
  ['storj', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1772.png'],
  ['polymath-network', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2496.png'],
  ['cindicator', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/2043.png'],
  ['iconomi', 'https://s2.coinmarketcap.com/generated/sparklines/web/7d/usd/1408.png'],
]);

const COIN_COMMANDS = COINS.slice(0, 10);

async function getCoins(): Promise<CryptoCoin[]> {
  const url = 'https://api.coinmarketcap.com/v1/ticker/';
  const response = await rest.get<BTCHTTPResponse>(url);

  return new Promise<CryptoCoin[]>((resolve, reject) => {
    resolve(response.result);
  });
}

function getCoin(coin: string): Promise<CryptoCoin> {
  return new Promise<CryptoCoin>((resolve, reject) => {
    getCoins().then((coins) => {
      const matches: CryptoCoin[] = coins.filter(f => f.symbol.toLowerCase() === coin);

      if (!matches) {
        reject(new Error(`No coins matched provided coin string ${coin}`));
      }

      resolve(matches[0]);
    }).catch((err) => reject(err));
  });
}

const renderCoin = (coin: CryptoCoin): RichEmbed => {
  const msg = new RichEmbed({
    title: `${coin.name} (${coin.symbol})`,
  });

  const priceUSD = parseFloat(coin.price_usd);
  const hourChange = parseFloat(coin.percent_change_1h) / 100;
  const dayChange = parseFloat(coin.percent_change_24h) / 100;
  const weekChange = parseFloat(coin.percent_change_7d) / 100;

  msg.addField('Price', `$${priceUSD}`);

  msg.addField(
    'Δ Hour',
    `$${(hourChange * priceUSD).toFixed(2)} (${(hourChange * 100).toFixed(2)}%)`,
    true,
  );
  msg.addField(
    'Δ Day',
    `$${(dayChange * priceUSD).toFixed(2)} (${(dayChange * 100).toFixed(2)}%)`,
    true,
  );
  msg.addField(
    'Δ Week',
    `$${(weekChange * priceUSD).toFixed(2)} (${(weekChange * 100).toFixed(2)}%)`,
    true,
  );

  msg.addField('24 Hour Volume', `$${parseFloat(coin['24h_volume_usd']).toFixed(0)}`, true);
  msg.addField('Rank', coin.rank, true);

  if (GRAPHS.has(coin.id)) {
    msg.setThumbnail(GRAPHS.get(coin.id));
  }

  msg.setURL(`https://coinmarketcap.com/currencies/${coin.id}`);

  return msg;
};

export const name = 'BTC';
export const help: Help = {
  commands: [
    {
      description: 'Retrieve information about a specific coin',
      invocation: `!${COIN_COMMANDS.join('/!')}`,
      invocationTest: new RegExp(`^!(${COIN_COMMANDS.join('|')})$`),
      shortDescription: 'retrieve information about a specific cryptocoin.',
    },
    {
      description: ('Retrieve information about the top 10 crypto coins. Alternatively, specify a specific'
                  + ` coin name to retrieve information about that coin.\n Supported coins: ${COINS.join(', ')}.`),
      invocation: '!cc/!crypto: [coin]',
      invocationTest: new RegExp(`^!(cc|crypto)`),
      shortDescription: 'retrieve information about top cryptocoins or about a specific one.',
    },
  ],
};
export const register = (client: Client) => {
  client.onCommand(['crypto', 'cc'], (message) => {
      getCoins().then((coins) => {
        if (message.args.length === 0) {
          const data = coins.slice(0, 10).map(c => [c.name, c.price_usd, c.percent_change_1h]);
          message.channel.send(`\`\`\`\n${table(data)}\n\`\`\``);
        } else if (message.args.length > 0) {
          getCoin(message.args[0]).then((coin) => message.channel.send({ embed: renderCoin(coin) }));
        }
      });
  });

  client.onCommand(COIN_COMMANDS, (message) => {
      const details = getCoin(message.command).then((coin) => {
        message.channel.send({ embed: renderCoin(coin) });
      }).catch((err) => message.reply(err.message));
  });
};
