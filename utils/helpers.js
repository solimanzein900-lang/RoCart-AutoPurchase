// utils/helpers.js
import { EmbedBuilder } from "discord.js";

/**
 * Format a number as USD
 * @param {number} amount
 * @returns {string}
 */
export function formatUSD(amount) {
  return `$${amount} USD`;
}

/**
 * Create a Discord embed with standard style
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
export function createEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x2b2d31)
    .setTimestamp();
}

/**
 * Reply to an interaction with an ephemeral error message
 * @param {CommandInteraction|ButtonInteraction|SelectMenuInteraction} interaction
 * @param {string} message
 */
export function errorReply(interaction, message) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content: message, ephemeral: true });
  }
  return interaction.reply({ content: message, ephemeral: true });
}

/**
 * Handles all interactions (buttons and dropdowns)
 * @param {Interaction} interaction
 * @param {Client} client
 */
export async function handleInteraction(interaction, client) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  try {
    // Example placeholder logic:
    // You will replace this with cart handling, dropdown selection, and payment buttons
    await interaction.reply({
      content: `You interacted with: ${interaction.customId}`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("Interaction handling error:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "An error occurred.", ephemeral: true });
    }
  }
}
