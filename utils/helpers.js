import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';

/**
 * Format a number as USD
 * @param {number} amount
 * @returns {string}
 */
export function formatUSD(amount) {
  return `$${amount} USD`;
}

/**
 * Create a simple embed
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
export function createEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x2b2d31) // dark theme
    .setTimestamp();
}

/**
 * Reply with an ephemeral error message
 * @param {CommandInteraction} interaction
 * @param {string} message
 */
export function errorReply(interaction, message) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content: message, ephemeral: true });
  }
  return interaction.reply({ content: message, ephemeral: true });
}

/**
 * Automatically register all events in the /events folder
 * @param {Client} client
 */
export async function registerEvents(client) {
  const eventsPath = path.join(process.cwd(), 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const { default: event } = await import(`../events/${file}`);
    if (!event.name || !event.execute) continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}
