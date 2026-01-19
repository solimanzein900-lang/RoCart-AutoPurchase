// utils/helpers.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
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
// In-memory cart (userId -> [{name, price}])
const cart = new Map();

// -----------------------------
// Handle role pings and send dropdowns (splits into multiple menus if >25 items)
export function handlePing(message, key) {
  // Fix swapped GAG and PVB roles
  const fixedKey = key === "PVB" ? "GAG" : key === "GAG" ? "PVB" : key;
  const priceList = prices[fixedKey];
  if (!priceList) return;

  // Split into chunks of 25 for Discord select menus
  const chunked = [];
  for (let i = 0; i < priceList.length; i += 25) {
    chunked.push(priceList.slice(i, i + 25));
  }

  const rows = chunked.map((chunk, index) => {
    const options = chunk.map((item) => ({
      label: item.name,
      description: `Price: ${formatUSD(item.price)}`,
      value: item.name,
    }));

    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_${fixedKey}_${index}`)
        .setPlaceholder("Select items")
        .addOptions(options)
        .setMaxValues(Math.min(options.length, 10)) // max 10 items per menu
    );
  });

  const embed = createEmbed(
    `${fixedKey} Store`,
    `Select the items you want below. You can choose up to 10 items per dropdown.`
  );
  message.channel.send({ embeds: [embed], components: rows });
}

// -----------------------------
// Handle interactions
export async function handleInteraction(interaction) {
  try {
    const userId = interaction.user.id;

    // -----------------------------
    // Dropdowns
    if (interaction.isStringSelectMenu()) {
      const selectedItems = interaction.values;
      const key = interaction.customId.split("_")[1];

      // Map selected items to full objects
      const items = prices[key].filter((i) => selectedItems.includes(i.name));

      // Add to cart
      if (!cart.has(userId)) cart.set(userId, []);
      cart.set(userId, [...cart.get(userId), ...items]);

      // Send ephemeral reply showing cart and PURCHASE button
      const cartItems = cart.get(userId)
        .map((i) => `${i.name} - ${formatUSD(i.price)}`)
        .join("\n");

      const embed = createEmbed("Your Cart", cartItems || "Cart is empty");

      const purchaseButton = new ButtonBuilder()
        .setCustomId("purchase_cart")
        .setLabel("PURCHASE")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(purchaseButton);

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // -----------------------------
    // Buttons
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === "purchase_cart") {
        const items = cart.get(userId) || [];
        if (items.length === 0) {
          await interaction.reply({ content: "Your cart is empty.", ephemeral: true });
        } else {
          const total = items.reduce((sum, i) => sum + i.price, 0);
          const itemList = items.map((i) => `${i.name} - ${formatUSD(i.price)}`).join("\n");
          await interaction.reply({
            content: `Purchase successful!\n\nItems:\n${itemList}\n\nTotal: ${formatUSD(total)}`,
            ephemeral: true,
          });
          cart.delete(userId); // clear cart
        }
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
  client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    Object.entries(roles).forEach(([key, roleId]) => {
      if (message.mentions.roles.has(roleId)) {
        handlePing(message, key);
      }
    });
  });

  client.on("interactionCreate", async (interaction) => {
    await handleInteraction(interaction);
  });
            }
