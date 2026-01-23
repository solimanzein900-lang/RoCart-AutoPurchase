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
const carts = new Map(); // userId -> { items: Map(name -> { price, qty }), cartMsg }
const checkout = new Map(); // userId -> total

/* ================= CONFIG ================= */
const STRIPE_LINK = "https://buy.stripe.com/6oUaEQcXicS81mhcWQ0VO0B";

const STORE_TITLES = {
  GAG: "Plants v Brainrots",
  GrowAGarden: "Grow A Garden",
  BladeBall: "Blade Ball",
  PetSim99: "Pet Simulator 99",
  MM2: "Murder Mystery 2",
  StealABrainrot: "Steal A Brainrot",
};

/* ================= HELPERS ================= */
const formatUSD = n => `$${n.toFixed(2)} USD`;
const ALL_ITEMS = Object.values(prices).flat();

/* ================= STORE OPEN ================= */
export async function handlePing(message, key) {
  const list = prices[key];
  if (!list) return;

  const embed = new EmbedBuilder()
    .setTitle(`**__${STORE_TITLES[key]}__**`)
    .setDescription(
      "<:reply_continued:1463044510392254631> Select items to add to your cart\n" +
      "<:reply_continued:1463044510392254631>\n" +
      "<:reply_continued:1463044510392254631> You can select up to 10 different items\n" +
      "<:reply_continued:1463044510392254631>\n" +
      "<:reply_continued:1463044510392254631> Use the [+] and [-] buttons to edit the amount\n" +
      "<:reply_continued:1463044510392254631> of each item\n" +
      "<:reply_continued:1463044510392254631>\n" +
      "<:reply_continued:1463044510392254631> After selecting your items, click Purchase\n" +
      "<:reply_continued:1463044510392254631> and choose a payment method."
    )
    .setColor(0x2b2d31);

  const rows = [];
  for (let i = 0; i < list.length; i += 25) {
    const chunk = list.slice(i, i + 25);

    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`item_select_${i / 25}`)
          .setPlaceholder("Select items")
          .setMinValues(1)
          .setMaxValues(Math.min(10, chunk.length))
          .addOptions(
            chunk.map(item => ({
              label: item.name,
              description: formatUSD(item.price),
              value: item.name,
            }))
          )
      )
    );
  }

  await message.channel.send({ embeds: [embed], components: rows });

  carts.set(message.author.id, {
    items: new Map(),
    cartMsg: null,
  });
}

/* ================= CART RENDER ================= */
async function renderCart(userId, channel) {
  const cart = carts.get(userId);
  if (!cart || cart.items.size === 0) return;

  const embeds = [];
  const rows = [];
  let total = 0;

  embeds.push(
    new EmbedBuilder()
      .setTitle("__🛒 Your Cart__")
      .setColor(0x2b2d31)
  );

  for (const [name, item] of cart.items) {
    total += item.price * item.qty;

    embeds.push(
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          `**${name}**${"\u200b".repeat(22)}×${item.qty}\n` +
          `   ${formatUSD(item.price * item.qty)}`
        )
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
async function sendPaymentMenu(channel) {
  const embed = new EmbedBuilder()
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
        { label: "Litecoin", value: "ltc", emoji: "🪙" }
      )
  );

  await channel.send({ embeds: [embed], components: [row] });
}

/* ================= INTERACTIONS ================= */
export async function handleInteraction(interaction) {
  const userId = interaction.user.id;

  /* ITEM SELECT */
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("item_select")) {
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
    return renderCart(userId, interaction.channel);
  }

  /* CART BUTTONS */
  if (interaction.isButton()) {
    const cart = carts.get(userId);
    if (!cart) return interaction.deferUpdate();

    if (interaction.customId === "purchase") {
      let total = 0;
      for (const i of cart.items.values()) total += i.price * i.qty;
      checkout.set(userId, total);

      await interaction.deferUpdate();
      return sendPaymentMenu(interaction.channel);
    }

    const [action, name] = interaction.customId.split("|");
    const item = cart.items.get(name);
    if (!item) return interaction.deferUpdate();

    if (action === "plus") item.qty++;
    if (action === "minus") {
      item.qty--;
      if (item.qty <= 0) cart.items.delete(name);
    }
    if (action === "remove") cart.items.delete(name);

    await interaction.deferUpdate();
    return renderCart(userId, interaction.channel);
  }

  /* PAYMENT SELECT */
  if (interaction.isStringSelectMenu() && interaction.customId === "payment_select") {
    const total = checkout.get(userId);
    if (!total) return interaction.deferUpdate();

    const method = interaction.values[0];
    let embed;
    let row = null;

    if (method === "paypal") {
      embed = new EmbedBuilder()
        .setTitle("Payment Instructions")
        .setDescription(
          "__PayPal Payment Instructions__\n\n" +
          `<:reply_continued:1463044510392254631> Your total is **${formatUSD(total)}**\n\n` +
          `<:reply_continued:1463044510392254631> Please send **${total.toFixed(2)}** to **solimanzein900@gmail.com**\n\n` +
          `<:reply_continued:1463044510392254631> After paying, send a screenshot in this ticket`
        )
        .setColor(0x2b2d31);
    }

    if (method === "ltc") {
      embed = new EmbedBuilder()
        .setTitle("Payment Instructions")
        .setDescription(
          "__Litecoin Payment Instructions__\n\n" +
          `<:reply_continued:1463044510392254631> Your total is **${formatUSD(total)}**\n\n` +
          `<:reply_continued:1463044510392254631> Send exactly **${formatUSD(total)}** to:\n` +
          "```\nLRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\n```\n" +
          `<:reply_continued:1463044510392254631> After paying, send a screenshot in this ticket`
        )
        .setColor(0x2b2d31);
    }

    if (["card", "google", "apple"].includes(method)) {
      embed = new EmbedBuilder()
        .setTitle("Payment Instructions")
        .setDescription(
          "__Card Payment Instructions__\n\n" +
          `<:reply_continued:1463044510392254631> Your total is **${formatUSD(total)}**\n\n` +
          `<:reply_continued:1463044510392254631> Click the **Purchase** button below\n\n` +
          `<:reply_continued:1463044510392254631> After paying, send a screenshot in this ticket`
        )
        .setColor(0x2b2d31);

      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setURL(STRIPE_LINK)
          .setLabel("🛒 Purchase")
      );
    }

    await interaction.channel.send({ embeds: [embed], components: row ? [row] : [] });
    return interaction.deferUpdate();
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
