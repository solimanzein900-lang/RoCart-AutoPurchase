import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { registerEvents } from './utils/helpers.js';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Register events
registerEvents(client);

client.login(process.env.TOKEN);
