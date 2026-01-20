// utils/helpers.js
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { prices, roles } from "../config/prices.js";
import { getPaymentEmbed } from "./paymentHandlers.js";

/* ================= STATE ================= */
const carts = new Map(); // userId -> { items: Map(name -> { price, qty }), cartMsg, selectMsg }
const checkout = new Map(); // userId -> total

/* ================= HELPERS ================= */
const formatUSD = n => `$${n.toFixed(2)} USD`;
const ALL_ITEMS = Object.values(prices).flat();

/* ================= ROLE PING ================= */
export async function handlePing(message, key) {
  const list = prices[key];
  if (!list) return;

  const embed = new EmbedBuilder()
    .setTitle(`__${key}__`)
    .setDescription(
      `<:reply_continued:1463044510392254631> Select items to add to your cart\n\n` +
      `<:reply_continued:1463044510392254631> You can select up to 10 different items\n\n` +
      `<:reply_continued:1463044510392254631> Use the [+] and [-] buttons to edit the amount of each item\n\n` +
      `<:reply_continued:1463044510392254631> After selecting the items you want, click the Purchase button and select a payment method.`
    )
    .setColor(0x2b2d31);

  const select = new StringSelectMenuBuilder()
    .setCustomId("item_select")
    .setPlaceholder("Select items")
    .setMinValues(1)
    .setMaxValues(Math.min(10, list.length))
    .addOptions(
      list.slice(0, 25).map(i => ({
        label: i.name,
        description: formatUSD(i.price),
        value: i.name,
      }))
    );

  const row = new ActionRowBuilder().addComponents(select);
  const msg = await message.channel.send({ embeds: [embed], components: [row] });

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

  // Cart header
  embeds.push(
    new EmbedBuilder()
      .setTitle("__<:cart:1463050420250218547>Your Cart__")
      .setColor(0x2b2d31)
  );

  // Each item
  for (const [name, item] of cart.items) {
    total += item.price * item.qty;

    embeds.push(
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .addFields(
          { name: name, value: "\u200b", inline: true },
          { name: "\u200b", value: `${item.qty}×`, inline: true }
        )
        .setDescription(formatUSD(item.price * item.qty))
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
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  // Optional: total embed
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

/* ================= PAYMENT ================= */
async function sendPayment(interaction, total) {
  const embed = new EmbedBuilder()
    .setTitle("__Select Payment Method__")
    .setDescription(
      "Select the payment method you would like to use below.\n\n" +
      "After choosing a payment method, follow the instructions to pay and receive your items."
    )
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("payment_select")
      .setPlaceholder("Select payment method")
      .addOptions(
        { label: "PayPal", value: "paypal", emoji: "💰" },
        { label: "Card", value: "card", emoji: "💳" },
        { label: "Google Pay", value: "google", emoji: "🟦" },
        { label: "Apple Pay", value: "apple", emoji: "🍎" },
        { label: "Litecoin", value: "ltc", emoji: "🟪" }
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
      if (!cart.items.has(name)) cart.items.set(name, { price: item.price, qty: 1 });
    }

    await interaction.deferUpdate();
    await renderCart(userId, interaction.channel);
  }

  /* -------- BUTTONS -------- */
  if (interaction.isButton()) {
    const cart = carts.get(userId);
    if (!cart) return interaction.deferUpdate();

    const [action, name] = interaction.customId.split("|");

    if (action === "plus") cart.items.get(name).qty++;
    if (action === "minus") {
      cart.items.get(name).qty--;
      if (cart.items.get(name).qty <= 0) cart.items.delete(name);
    }
    if (action === "remove") cart.items.delete(name);

    if (interaction.customId === "purchase") {
      let total = 0;
      for (const i of cart.items.values()) total += i.price * i.qty;
      checkout.set(userId, total);

      await interaction.deferUpdate();
      return sendPayment(interaction, total);
    }

    await interaction.deferUpdate();
    await renderCart(userId, interaction.channel);
  }

  /* -------- PAYMENT SELECT -------- */
  if (interaction.isStringSelectMenu() && interaction.customId === "payment_select") {
    const total = checkout.get(userId);
    if (!total) return interaction.deferUpdate();

    const method = interaction.values[0];
    let embed;

    switch (method.toLowerCase()) {
      case "paypal":
        embed = getPaymentEmbed("PayPal", total);
        await interaction.channel.send({ embeds: [embed] });
        break;
      case "ltc":
        embed = getPaymentEmbed("Litecoin", total);
        await interaction.channel.send({ embeds: [embed] });
        break;
      case "card":
      case "google":
      case "apple":
        embed = getPaymentEmbed(method, total);
        const purchaseRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Purchase")
            .setEmoji("1463050420250218547")
            .setStyle(ButtonStyle.Link)
            .setURL("https://buy.stripe.com/6oUaEQcXicS81mhcWQ0VO0B")
        );
        await interaction.channel.send({ embeds: [embed], components: [purchaseRow] });
        break;
      default:
        await interaction.channel.send("Payment method not supported.");
    }

    await interaction.deferUpdate();
  }
}

/* ================= EVENTS ================= */
export function registerEvents(client) {
  client.on("messageCreate", msg => {
    if (msg.author.bot) return;
    for (const [key, roleId] of Object.entries(roles)) {
      if (msg.mentions.roles.has(roleId)) handlePing(msg, key);
    }
  });

  client.on("interactionCreate", handleInteraction);
      }
