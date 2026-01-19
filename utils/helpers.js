// utils/helpers.js
import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from "discord.js";
import { prices, roles } from "../config/prices.js";

// -----------------------------
// Per-user in-memory cart
const userCarts = new Map();

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
// Send an error reply
export function errorReply(interaction, message) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content: message, ephemeral: true });
  }
  return interaction.reply({ content: message, ephemeral: true });
}

// -----------------------------
// Handle role pings and send dropdowns
export function handlePing(message, key) {
  const priceList = prices[key];
  if (!priceList) return;

  const options = priceList.map(item => ({
    label: item.name,
    description: `Price: ${formatUSD(item.price)}`,
    value: item.name,
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_${key}`)
      .setPlaceholder("Select items")
      .addOptions(options)
      .setMaxValues(Math.min(options.length, 10))
  );

  const embed = createEmbed(`${key} Store`, `Select the items you want below. You can choose up to 10 items.`);
  message.channel.send({ embeds: [embed], components: [row] });
}

// -----------------------------
// Generate cart embed and buttons
function generateCartEmbed(userId) {
  const cart = userCarts.get(userId) || [];
  if (cart.length === 0) return null;

  const embed = new EmbedBuilder()
    .setTitle("🛒 Your Cart")
    .setColor(0x2b2d31)
    .setTimestamp();

  let total = 0;
  const description = cart.map((item, i) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `**${item.name} - ${formatUSD(item.price)}**       [+] ${item.quantity} [-]     ${formatUSD(itemTotal)} [X]`;
  }).join("\n");

  embed.setDescription(description + `\n\n**Total:** ${formatUSD(total)}`);
  return embed;
}

// -----------------------------
// Generate action row for cart items
function generateCartButtons(userId) {
  const cart = userCarts.get(userId) || [];
  const row = new ActionRowBuilder();

  cart.forEach((item, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`plus_${i}`)
        .setLabel("+")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`minus_${i}`)
        .setLabel("-")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`remove_${i}`)
        .setLabel("X")
        .setStyle(ButtonStyle.Danger)
    );
  });

  row.addComponents(
    new ButtonBuilder()
      .setCustomId("purchase_cart")
      .setLabel("🛒Purchase")
      .setStyle(ButtonStyle.Success)
  );

  return row;
}

// -----------------------------
// Handle item selection
export async function handleInteraction(interaction) {
  if (interaction.isStringSelectMenu()) {
    const userId = interaction.user.id;
    const [prefix] = interaction.customId.split("_"); // select_GAG etc.

    if (!userCarts.has(userId)) userCarts.set(userId, []);

    const cart = userCarts.get(userId);
    interaction.values.forEach(val => {
      const allItems = Object.values(prices).flat();
      const item = allItems.find(it => it.name === val);
      if (!item) return;

      const existing = cart.find(c => c.name === item.name);
      if (existing) existing.quantity += 1;
      else cart.push({ name: item.name, price: item.price, quantity: 1 });
    });

    const embed = generateCartEmbed(userId);
    const row = generateCartButtons(userId);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.isButton()) {
    const userId = interaction.user.id;
    const cart = userCarts.get(userId) || [];

    const [action, indexStr] = interaction.customId.split("_");
    const index = parseInt(indexStr);

    if (action === "plus") cart[index].quantity += 1;
    if (action === "minus") {
      cart[index].quantity -= 1;
      if (cart[index].quantity <= 0) cart.splice(index, 1);
    }
    if (action === "remove") cart.splice(index, 1);

    if (interaction.customId === "purchase_cart") {
      // Show payment method dropdown
      const paymentEmbed = createEmbed("Payment", "Please select a payment method below to complete your purchase.");
      const paymentRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_payment")
          .setPlaceholder("Select payment method")
          .addOptions([
            { label: "PayPal", value: "paypal" },
            { label: "Card", value: "card" },
            { label: "Google Pay", value: "gpay" },
            { label: "Apple Pay", value: "applepay" },
            { label: "Litecoin", value: "litecoin" },
          ])
      );

      await interaction.update({ embeds: [paymentEmbed], components: [paymentRow] });
      return;
    }

    if (interaction.customId === "select_payment") return;

    if (action === "select") return;

    const updatedEmbed = generateCartEmbed(userId);
    const updatedRow = generateCartButtons(userId);
    await interaction.update({ embeds: [updatedEmbed], components: [updatedRow] });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "select_payment") {
    const userId = interaction.user.id;
    const cart = userCarts.get(userId) || [];
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    let content = "";

    switch (interaction.values[0]) {
      case "paypal":
        content = `Your total is ${formatUSD(total)}\n\nPlease send ${formatUSD(total)} to \`solimanzein900@gmail.com\`.\nAfter paying, send a screenshot of the transaction.`;
        break;
      case "litecoin":
        content = `Your total is ${formatUSD(total)}\n\nPlease send exactly ${formatUSD(total)} to \`LRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\`.\nAfter paying, send a screenshot of the transaction.`;
        break;
      case "card":
        content = `Your total is ${formatUSD(total)}\n\nPlease use your card to pay the total. Instructions go here.`;
        break;
      case "gpay":
        content = `Your total is ${formatUSD(total)}\n\nPlease use Google Pay to complete your payment. Instructions go here.`;
        break;
      case "applepay":
        content = `Your total is ${formatUSD(total)}\n\nPlease use Apple Pay to complete your payment. Instructions go here.`;
        break;
    }

    const embed = createEmbed("Payment Instructions", content);
    await interaction.update({ embeds: [embed], components: [] });
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
