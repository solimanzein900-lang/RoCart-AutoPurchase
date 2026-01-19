// utils/helpers.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { prices, roles } from "../config/prices.js";

/* ================= STATE ================= */
const carts = new Map();    // userId -> { items: Map, cartMsg, selectMsg }
const checkout = new Map(); // userId -> total

/* ================= HELPERS ================= */
const formatUSD = n => `$${n.toFixed(2)} USD`;
const ALL_ITEMS = Object.values(prices).flat();

/* ================= ROLE PING ================= */
export async function handlePing(message, key) {
  const list = prices[key];
  if (!list) return;

  const embed = new EmbedBuilder()
    .setTitle(`${key} Store`)
    .setDescription("Select items to add to your cart.")
    .setColor(0x2b2d31);

  const select = new StringSelectMenuBuilder()
    .setCustomId("item_select")
    .setPlaceholder("Select items")
    .setMinValues(1)
    .setMaxValues(Math.min(10, list.length))
    .addOptions(
      list.slice(0, 25).map(item => ({
        label: item.name,
        description: formatUSD(item.price),
        value: item.name,
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);

  const msg = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  carts.set(message.author.id, {
    items: new Map(),
    cartMsg: null,
    selectMsg: msg,
  });
}

/* ================= CART RENDER ================= */
async function renderCart(userId, channel) {
  const cart = carts.get(userId);
  if (!cart || cart.items.size === 0) return;

  const embeds = [];
  const rows = [];

  let total = 0;

  for (const [name, item] of cart.items) {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    embeds.push(
      new EmbedBuilder()
        .setTitle(`${name} - ${formatUSD(item.price)}`)
        .setDescription(
          `**Amount:** ${item.qty}\n**Total:** ${formatUSD(itemTotal)}`
        )
        .setColor(0x2b2d31)
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`plus|${name}`)
          .setLabel("+")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`minus|${name}`)
          .setLabel("-")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`remove|${name}`)
          .setLabel("Remove")
          .setStyle(ButtonStyle.Danger),
      )
    );

    if (rows.length === 4) break; // Discord limit safety
  }

  embeds.push(
    new EmbedBuilder()
      .setTitle("🛒 Cart Total")
      .setDescription(formatUSD(total))
      .setColor(0x2b2d31)
  );

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("purchase")
        .setLabel("🛒 Purchase")
        .setStyle(ButtonStyle.Success)
    )
  );

  if (cart.cartMsg) {
    await cart.cartMsg.edit({ embeds, components: rows });
  } else {
    cart.cartMsg = await channel.send({ embeds, components: rows });
  }
}

/* ================= PAYMENT MENU ================= */
async function sendPayment(interaction, total) {
  const embed = new EmbedBuilder()
    .setTitle("Select payment method")
    .setDescription("Please select a payment method below to complete your purchase.")
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

/* ================= INTERACTIONS ================= */
export async function handleInteraction(interaction) {
  const userId = interaction.user.id;

  /* -------- ITEM SELECT -------- */
  if (interaction.isStringSelectMenu() && interaction.customId === "item_select") {
    const cart = carts.get(userId);
    if (!cart) return interaction.deferUpdate();

    for (const name of interaction.values) {
      const item = ALL_ITEMS.find(i => i.name === name);
      if (!item) continue;

      if (!cart.items.has(name)) {
        cart.items.set(name, { price: item.price, qty: 1 });
      }
    }

    await interaction.deferUpdate();
    await renderCart(userId, interaction.channel);
    return;
  }

  /* -------- BUTTONS -------- */
  if (interaction.isButton()) {
    const cart = carts.get(userId);
    if (!cart) return interaction.deferUpdate();

    if (interaction.customId === "purchase") {
      let total = 0;
      for (const item of cart.items.values()) {
        total += item.price * item.qty;
      }

      checkout.set(userId, total);

      if (cart.cartMsg) await cart.cartMsg.delete().catch(() => {});
      if (cart.selectMsg) await cart.selectMsg.delete().catch(() => {});

      carts.delete(userId);
      await interaction.deferUpdate();
      return sendPayment(interaction, total);
    }

    const [action, name] = interaction.customId.split("|");

    if (!cart.items.has(name)) return interaction.deferUpdate();

    if (action === "plus") cart.items.get(name).qty++;
    if (action === "minus") {
      cart.items.get(name).qty--;
      if (cart.items.get(name).qty <= 0) cart.items.delete(name);
    }
    if (action === "remove") cart.items.delete(name);

    if (cart.items.size === 0) {
      if (cart.cartMsg) await cart.cartMsg.delete().catch(() => {});
      carts.delete(userId);
      return interaction.deferUpdate();
    }

    await interaction.deferUpdate();
    await renderCart(userId, interaction.channel);
    return;
  }

  /* -------- PAYMENT SELECT -------- */
  if (interaction.isStringSelectMenu() && interaction.customId === "payment_select") {
    const total = checkout.get(userId);
    if (!total) return interaction.deferUpdate();

    const method = interaction.values[0];
    let text = "";

    if (method === "paypal") {
      text =
        `Your total is ${formatUSD(total)}\n\n` +
        `Please send ${formatUSD(total)} to \`solimanzein900@gmail.com\`.\n` +
        `After paying, send a screenshot of the transaction.`;
    }

    if (method === "ltc") {
      text =
        `Your total is ${formatUSD(total)}\n\n` +
        `Please send exactly ${formatUSD(total)} to \`LRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\`\n` +
        `After paying, send a screenshot of the transaction.`;
    }

    const embed = new EmbedBuilder()
      .setTitle("Payment Instructions")
      .setDescription(text)
      .setColor(0x2b2d31);

    await interaction.channel.send({ embeds: [embed] });
    await interaction.deferUpdate();
  }
}

/* ================= EVENTS ================= */
export function registerEvents(client) {
  client.on("messageCreate", msg => {
    if (msg.author.bot) return;

    for (const [key, roleId] of Object.entries(roles)) {
      if (msg.mentions.roles.has(roleId)) {
        handlePing(msg, key);
      }
    }
  });

  client.on("interactionCreate", handleInteraction);
         }
