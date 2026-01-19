// utils/helpers.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from "discord.js";

import { prices, roles } from "../config/prices.js";

/* ------------------ MEMORY ------------------ */
const carts = new Map(); // userId -> { items: Map, messages: [] }

/* ------------------ HELPERS ------------------ */
function formatUSD(n) {
  return `$${n.toFixed(2)} USD`;
}

function getTotal(cart) {
  let total = 0;
  for (const item of cart.items.values()) {
    total += item.price * item.qty;
  }
  return total;
}

/* ------------------ ITEM DROPDOWN ------------------ */
export async function handlePing(message, key) {
  const priceList = prices[key];
  if (!priceList) return;

  const options = priceList.slice(0, 25).map(item => ({
    label: item.name,
    description: formatUSD(item.price),
    value: `${key}|${item.name}`
  }));

  const embed = new EmbedBuilder()
    .setTitle(`${key} Store`)
    .setDescription("Select items to add to your cart.")
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("item_select")
      .setPlaceholder("Select items")
      .setMinValues(1)
      .setMaxValues(10)
      .addOptions(options)
  );

  await message.channel.send({ embeds: [embed], components: [row] });
}

/* ------------------ CART RENDER ------------------ */
async function renderCart(interaction) {
  const cart = carts.get(interaction.user.id);
  if (!cart || cart.items.size === 0) return;

  const lines = [];
  const components = [];

  for (const [name, item] of cart.items) {
    lines.push(
      `**${name} - ${formatUSD(item.price)}**\n` +
      `Amount: ${item.qty} | Total: ${formatUSD(item.qty * item.price)}`
    );

    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`plus_${name}`)
          .setLabel("+")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`minus_${name}`)
          .setLabel("-")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`remove_${name}`)
          .setLabel("Remove")
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("purchase")
        .setLabel("🛒 Purchase")
        .setStyle(ButtonStyle.Success)
    )
  );

  const embed = new EmbedBuilder()
    .setTitle("🛒 Your Cart")
    .setDescription(lines.join("\n\n"))
    .addFields({ name: "Total", value: formatUSD(getTotal(cart)) })
    .setColor(0x2b2d31);

  if (cart.message) {
    await cart.message.edit({ embeds: [embed], components });
  } else {
    cart.message = await interaction.channel.send({ embeds: [embed], components });
  }
}

/* ------------------ PAYMENT ------------------ */
async function sendPayment(interaction, total) {
  const embed = new EmbedBuilder()
    .setTitle("Select payment method")
    .setDescription("Please select a payment method below.")
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("payment_select")
      .setPlaceholder("Select payment method")
      .addOptions(
        { label: "PayPal", value: "paypal" },
        { label: "Card", value: "card" },
        { label: "Google Pay", value: "google" },
        { label: "Apple Pay", value: "apple" },
        { label: "Litecoin", value: "ltc" }
      )
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
}

/* ------------------ INTERACTIONS ------------------ */
export async function handleInteraction(interaction) {
  /* -------- ITEM SELECT -------- */
  if (interaction.isStringSelectMenu() && interaction.customId === "item_select") {
    const userId = interaction.user.id;

    if (!carts.has(userId)) {
      carts.set(userId, { items: new Map(), message: null });
    }

    const cart = carts.get(userId);

    for (const value of interaction.values) {
      const [, name] = value;
      const item = Object.values(prices).flat().find(i => i.name === name);

      if (!cart.items.has(name)) {
        cart.items.set(name, { price: item.price, qty: 1 });
      }
    }

    await interaction.deferUpdate();
    await renderCart(interaction);
  }

  /* -------- BUTTONS -------- */
  if (interaction.isButton()) {
    const cart = carts.get(interaction.user.id);
    if (!cart) return;

    const [action, ...rest] = interaction.customId.split("_");
    const name = rest.join("_");

    if (action === "plus") {
      cart.items.get(name).qty++;
    }

    if (action === "minus") {
      cart.items.get(name).qty--;
      if (cart.items.get(name).qty <= 0) cart.items.delete(name);
    }

    if (action === "remove") {
      cart.items.delete(name);
    }

    if (cart.items.size === 0) {
      if (cart.message) await cart.message.delete();
      carts.delete(interaction.user.id);
      return interaction.deferUpdate();
    }

    if (interaction.customId === "purchase") {
      const total = getTotal(cart);
      if (cart.message) await cart.message.delete();
      carts.delete(interaction.user.id);
      await interaction.deferUpdate();
      return sendPayment(interaction, total);
    }

    await interaction.deferUpdate();
    await renderCart(interaction);
  }

  /* -------- PAYMENT SELECT -------- */
  if (interaction.isStringSelectMenu() && interaction.customId === "payment_select") {
    const method = interaction.values[0];
    const total = "23.50"; // example, calculate dynamically if needed

    let description = "";

    if (method === "paypal") {
      description =
        `Your total is $${total}\n\n` +
        `Please send $${total} to \`solimanzein900@gmail.com\`.\n` +
        `After paying, send a screenshot of the transaction.`;
    }

    if (method === "ltc") {
      description =
        `Your total is $${total}\n\n` +
        `Please send exactly $${total} to \`LRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\`.\n` +
        `After paying, send a screenshot of the transaction.`;
    }

    const embed = new EmbedBuilder()
      .setTitle("Payment Instructions")
      .setDescription(description)
      .setColor(0x2b2d31);

    await interaction.channel.send({ embeds: [embed] });
    await interaction.deferUpdate();
  }
}

/* ------------------ EVENTS ------------------ */
export function registerEvents(client) {
  client.on("messageCreate", message => {
    if (message.author.bot) return;

    for (const [key, roleId] of Object.entries(roles)) {
      if (message.mentions.roles.has(roleId)) {
        handlePing(message, key);
      }
    }
  });

  client.on("interactionCreate", handleInteraction);
    }
