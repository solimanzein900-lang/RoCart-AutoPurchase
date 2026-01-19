// utils/helpers.js
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { prices, roles } from "../config/prices.js";

// -----------------------------
// Format currency
export function formatUSD(amount) {
  return `$${amount} USD`;
}

// -----------------------------
// Create an embed
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
// Handle role pings and send dropdowns (splits into multiple menus if >25 items)
export function handlePing(message, key) {
  const priceList = prices[key];
  if (!priceList) return;

  // Split into chunks of 25 for Discord select menus
  const chunked = [];
  for (let i = 0; i < priceList.length; i += 25) {
    chunked.push(priceList.slice(i, i + 25));
  }

  const rows = chunked.map((chunk, index) => {
    const options = chunk.map(item => ({
      label: item.name,
      description: `Price: ${formatUSD(item.price)}`,
      value: item.name,
    }));

    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_${key}_${index}`)
        .setPlaceholder("Select items")
        .addOptions(options)
        .setMaxValues(Math.min(options.length, 10)) // user can select up to 10 items per menu
    );
  });

  const embed = createEmbed(`${key} Store`, `Select the items you want below. You can choose up to 10 items per dropdown.`);
  message.channel.send({ embeds: [embed], components: rows });
}

// -----------------------------
// Handle interactions
export async function handleInteraction(interaction) {
  try {
    if (interaction.isStringSelectMenu()) {
      await interaction.reply({
        content: `You selected: ${interaction.values.join(", ")}`,
        ephemeral: true
      });
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id.startsWith("purchase_")) {
        await interaction.reply({ content: `Purchase button clicked: ${id}`, ephemeral: true });
      }

      if (id.startsWith("cantfind_")) {
        await interaction.reply({ content: `Tutorial button clicked: ${id}`, ephemeral: true });
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.replied || interaction.deferred) {
      interaction.followUp({ content: "An error occurred.", ephemeral: true });
    } else {
      interaction.reply({ content: "An error occurred.", ephemeral: true });
    }
  }
}

// -----------------------------
// Register events
export function registerEvents(client) {
  client.on("messageCreate", message => {
    if (message.author.bot) return;

    Object.entries(roles).forEach(([key, roleId]) => {
      if (message.mentions.roles.has(roleId)) {
        handlePing(message, key);
      }
    });
  });

  client.on("interactionCreate", async interaction => {
    await handleInteraction(interaction);
  });
}
