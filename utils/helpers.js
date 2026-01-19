import { EmbedBuilder } from "discord.js";
import fs from 'fs';
import path from 'path';

export function formatUSD(amount) {
  return `$${amount} USD`;
}

export function createEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x2b2d31)
    .setTimestamp();
}

export function errorReply(interaction, message) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content: message, ephemeral: true });
  }
  return interaction.reply({ content: message, ephemeral: true });
}

// NEW: registerEvents loads all events in /events
export function registerEvents(client) {
  const eventsPath = path.join(process.cwd(), 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    import(path.join(eventsPath, file)).then((eventModule) => {
      if (file.startsWith('message')) {
        client.on('messageCreate', (...args) => eventModule.default(client, ...args));
      } else if (file.startsWith('interaction')) {
        client.on('interactionCreate', (...args) => eventModule.default(client, ...args));
      }
    });
  }
}

// NEW: handleInteraction is just a placeholder handler for now
export async function handleInteraction(interaction) {
  // You can later add logic for dropdowns, buttons, cart, payments, etc.
  if (!interaction.isButton() && !interaction.isSelectMenu()) return;
  await interaction.reply({ content: 'Interaction received!', ephemeral: true });
        }
