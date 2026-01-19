// utils/helpers.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from "discord.js";
import { prices, roles } from "../config/prices.js";

// -----------------------------
// Format currency
export function formatUSD(amount) {
  return `$${amount.toFixed(2)} USD`;
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
// Error reply helper
export function errorReply(interaction, message) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content: message, ephemeral: true });
  }
  return interaction.reply({ content: message, ephemeral: true });
}

// -----------------------------
// In-memory carts: Map<userId, {items: [{name, price, amount}], messageId}>
const carts = new Map();

// -----------------------------
// Handle role pings and open cart
export function handlePing(message, key) {
  const priceList = prices[key];
  if (!priceList) return;

  // For demo, add first item of the store to cart
  const userCart = carts.get(message.author.id) || { items: [], messageId: null };

  // Example: automatically adds first item from store for demonstration
  const item = priceList[0];
  const existingItem = userCart.items.find(i => i.name === item.name);
  if (existingItem) existingItem.amount += 1;
  else userCart.items.push({ name: item.name, price: item.price, amount: 1 });

  carts.set(message.author.id, userCart);

  sendCartEmbed(message, message.author.id);
}

// -----------------------------
// Send cart embed with buttons
export async function sendCartEmbed(message, userId) {
  const userCart = carts.get(userId);
  if (!userCart || userCart.items.length === 0) return;

  // Delete previous cart embed if exists
  if (userCart.messageId) {
    try {
      const previous = await message.channel.messages.fetch(userCart.messageId);
      if (previous) await previous.delete();
    } catch {}
  }

  const rows = [];
  const embeds = [];

  userCart.items.forEach((item, idx) => {
    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setDescription(
        `Amount: ${item.amount}\nTotal: ${formatUSD(item.amount * item.price)}`
      )
      .setColor(0x2b2d31);

    embeds.push(embed);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`plus_${idx}`)
        .setLabel("+")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`minus_${idx}`)
        .setLabel("-")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`remove_${idx}`)
        .setLabel("Remove")
        .setStyle(ButtonStyle.Danger)
    );

    rows.push(row);
  });

  // Purchase row
  const purchaseRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_cart")
      .setLabel("🛒 Purchase")
      .setStyle(ButtonStyle.Success)
  );
  rows.push(purchaseRow);

  const cartMessage = await message.channel.send({ embeds, components: rows });
  userCart.messageId = cartMessage.id;
  carts.set(userId, userCart);
}

// -----------------------------
// Handle button interactions
export async function handleInteraction(interaction) {
  const userId = interaction.user.id;
  const userCart = carts.get(userId);
  if (!userCart) return;

  if (interaction.isButton()) {
    const [action, idxStr] = interaction.customId.split("_");
    const idx = parseInt(idxStr, 10);

    switch (action) {
      case "plus":
        userCart.items[idx].amount += 1;
        break;
      case "minus":
        if (userCart.items[idx].amount > 1) userCart.items[idx].amount -= 1;
        break;
      case "remove":
        userCart.items.splice(idx, 1);
        break;
      case "purchase":
        // Delete cart embed
        try {
          const msg = await interaction.channel.messages.fetch(userCart.messageId);
          if (msg) await msg.delete();
        } catch {}
        // Show payment dropdown
        sendPaymentDropdown(interaction, userCart);
        return;
    }

    carts.set(userId, userCart);
    await interaction.deferUpdate();
    await sendCartEmbed(interaction.message, userId);
  }
}

// -----------------------------
// Send payment dropdown
export async function sendPaymentDropdown(interaction, userCart) {
  const total = userCart.items.reduce((sum, i) => sum + i.price * i.amount, 0);
  const options = ["PayPal", "Card", "Google Pay", "Apple Pay", "Litecoin"].map(name => ({
    label: name,
    value: name.toLowerCase().replace(" ", "_"),
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`payment_select`)
    .setPlaceholder("Select payment method")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);

  const embed = new EmbedBuilder()
    .setTitle("Select Payment Method")
    .setDescription(
      `Please select a payment method below to complete your purchase.\nTotal: ${formatUSD(total)}`
    )
    .setColor(0x2b2d31);

  await interaction.channel.send({ embeds: [embed], components: [row] });
}

// -----------------------------
// Handle payment dropdown
export async function handlePaymentSelect(interaction) {
  const userId = interaction.user.id;
  const userCart = carts.get(userId);
  if (!userCart) return;

  const total = userCart.items.reduce((sum, i) => sum + i.price * i.amount, 0);

  let embed;

  switch (interaction.values[0]) {
    case "paypal":
      embed = createEmbed(
        "PayPal Payment",
        `Your total is ${formatUSD(total)}\n\nPlease send ${formatUSD(
          total
        )} to \`solimanzein900@gmail.com\`.\nAfter paying, send a screenshot of the transaction.`
      );
      break;
    case "card":
      embed = createEmbed(
        "Card Payment",
        `Your total is ${formatUSD(total)}\n\nPlease follow card payment instructions in DM.`
      );
      break;
    case "google_pay":
      embed = createEmbed(
        "Google Pay",
        `Your total is ${formatUSD(total)}\n\nSend ${formatUSD(total)} via Google Pay.`
      );
      break;
    case "apple_pay":
      embed = createEmbed(
        "Apple Pay",
        `Your total is ${formatUSD(total)}\n\nSend ${formatUSD(total)} via Apple Pay.`
      );
      break;
    case "litecoin":
      embed = createEmbed(
        "Litecoin Payment",
        `Your total is ${formatUSD(total)}\n\nPlease send exactly ${formatUSD(
          total
        )} to \`LRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\`.\nAfter paying, send a screenshot of the transaction.`
      );
      break;
    default:
      embed = createEmbed("Payment", "Unknown payment method.");
      break;
  }

  // Delete payment dropdown message
  try {
    await interaction.message.delete();
  } catch {}

  await interaction.channel.send({ embeds: [embed] });

  // Clear cart
  carts.delete(userId);
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
    if (interaction.isButton()) {
      await handleInteraction(interaction);
    }
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "payment_select") {
        await handlePaymentSelect(interaction);
      }
    }
  });
}
