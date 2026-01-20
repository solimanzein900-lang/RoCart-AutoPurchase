// cartManager.js
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { formatUSD } from "./helpers.js"; // Reuse your formatting helper

export class CartManager {
  constructor() {
    // Map<userId, Array<{name, price, quantity}>>
    this.carts = new Map();
    // Map<userId, message> to keep track of cart messages
    this.cartMessages = new Map();
  }

  addItem(userId, itemName, price) {
    if (!this.carts.has(userId)) this.carts.set(userId, []);
    const cart = this.carts.get(userId);
    const existing = cart.find(i => i.name === itemName);
    if (existing) existing.quantity++;
    else cart.push({ name: itemName, price, quantity: 1 });
  }

  removeItem(userId, itemName) {
    if (!this.carts.has(userId)) return;
    const cart = this.carts.get(userId).filter(i => i.name !== itemName);
    this.carts.set(userId, cart);
  }

  updateQuantity(userId, itemName, quantity) {
    if (!this.carts.has(userId)) return;
    const cart = this.carts.get(userId);
    const existing = cart.find(i => i.name === itemName);
    if (existing) existing.quantity = Math.min(Math.max(quantity, 1), 99);
  }

  getCart(userId) {
    return this.carts.get(userId) || [];
  }

  getTotal(userId) {
    return this.getCart(userId).reduce((acc, i) => acc + i.price * i.quantity, 0);
  }

  /* ================= RENDER CART EMBEDS ================= */
  async renderCart(userId, channel) {
    const cart = this.getCart(userId);
    if (!cart || cart.length === 0) return;

    const embeds = [];
    const rows = [];

    // Cart header
    embeds.push(
      new EmbedBuilder()
        .setTitle("__<:cart:1463050420250218547>Your Cart__")
        .setColor(0x2b2d31)
    );

    // Each item
    for (const item of cart) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .addFields(
            { name: item.name, value: "\u200b", inline: true },
            { name: "\u200b", value: `${item.quantity}×`, inline: true }
          )
          .setDescription(formatUSD(item.price * item.quantity))
      );

      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`plus|${item.name}`)
            .setLabel("+")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`minus|${item.name}`)
            .setLabel("-")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`remove|${item.name}`)
            .setLabel("Remove")
            .setStyle(ButtonStyle.Danger)
        )
      );
    }

    // Total embed
    embeds.push(
      new EmbedBuilder()
        .setTitle("🛒 Cart Total")
        .setDescription(formatUSD(this.getTotal(userId)))
        .setColor(0x2b2d31)
    );

    // Purchase button (for Card/Google/Apple Pay)
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("purchase")
          .setLabel("🛒 Purchase")
          .setStyle(ButtonStyle.Success)
      )
    );

    // Send or edit cart message
    if (this.cartMessages.has(userId)) {
      const msg = this.cartMessages.get(userId);
      await msg.edit({ embeds, components: rows });
    } else {
      const msg = await channel.send({ embeds, components: rows });
      this.cartMessages.set(userId, msg);
    }
  }

  /* ================= HANDLE BUTTON INTERACTIONS ================= */
  async handleButton(interaction) {
    const userId = interaction.user.id;
    const cart = this.getCart(userId);
    if (!cart || cart.length === 0) return interaction.deferUpdate();

    const [action, itemName] = interaction.customId.split("|");

    if (action === "plus") this.addItem(userId, itemName, cart.find(i => i.name === itemName).price);
    if (action === "minus") {
      const item = cart.find(i => i.name === itemName);
      if (item) {
        item.quantity--;
        if (item.quantity <= 0) this.removeItem(userId, itemName);
      }
    }
    if (action === "remove") this.removeItem(userId, itemName);

    await interaction.deferUpdate();
    await this.renderCart(userId, interaction.channel);
  }
                          }
