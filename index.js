import { Client, GatewayIntentBits, Events } from 'discord.js';
import { handlePing } from './events/pingHandler.js';
import { handleInteraction } from './events/interactionHandler.js';
import 'dotenv/config';

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Ping-based price list responses
client.on(Events.MessageCreate, handlePing);

// Button / dropdown interactions
client.on(Events.InteractionCreate, handleInteraction);

client.login(process.env.TOKEN);
