// utils/helpers.js
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { prices, roles } from "../config/prices.js"; // adjust import if needed

// -----------------------------
// Format currency
export function formatUSD(amount) {
  return `$${amount} USD`;
}

// -----------------------------
// Create a simple embed
export function createEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x2b2d31)
    .setTimestamp();
}

// -----------------------------
// Send an error reply
export function errorReply(interaction, message) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content: message, ephemeral: true });
  }
  return interaction.reply({ content: message, ephemeral: true });
}

// -----------------------------
// Handle role pings and send price list dropdowns
export function handlePing(message, key) {
  const priceList = prices[key]; // e.g., prices['GAG'] or prices['MM2']
  if (!priceList) return;

  const options = priceList.map(item => ({
    label: item.name,
    description: `Price: ${formatUSD(item.price)}`,
    value: item.name,
  }));

  // Create select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_${key}`)
    .setPlaceholder("Select items")
    .addOptions(options)
    .setMaxValues(10); // max 10 items

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Send the embed with dropdown
  const embed = createEmbed(`${key} Store`, `Select the items you want below. You can choose up to 10 items.`);
  message.channel.send({ embeds: [embed], components: [row] });
}

// -----------------------------
// Handle interactions (dropdowns/buttons)
export async function handleInteraction(interaction) {
  // Check for dropdowns
  if (interaction.isStringSelectMenu()) {
    // Example: you would implement your cart logic here
    await interaction.reply({ content: `You selected: ${interaction.values.join(", ")}`, ephemeral: true });
  }

  // Check for buttons (e.g., purchase, Google Pay / Apple Pay helpers)
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith("purchase_")) {
      await interaction.reply({ content: `Purchase clicked for ${customId}`, ephemeral: true });
    }

    if (customId.startsWith("cantfind_")) {
      await interaction.reply({ content: `Tutorial placeholder clicked: ${customId}`, ephemeral: true });
    }
  }
}

// -----------------------------
// Register client events
export function registerEvents(client) {
  client.on("messageCreate", async message => {
    if (message.author.bot) return;

    Object.entries(roles).forEach(([key, roleId]) => {
      if (message.mentions.roles.has(roleId)) {
        handlePing(message, key);
      }
    });
  });

  client.on("interactionCreate", async interaction => {
    try {
      await handleInteraction(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) {
        interaction.followUp({ content: "An error occurred.", ephemeral: true });
      } else {
        interaction.reply({ content: "An error occurred.", ephemeral: true });
      }
    }
  });
  }
