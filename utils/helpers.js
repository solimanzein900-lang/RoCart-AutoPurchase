import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

/* ================= IDs ================= */
const RO_CART_ID = "1462832662548054066";
const TICKET_TOOL_ID = "557628352828014614";

/* ================= CART STORAGE ================= */
const carts = new Map();

/* ================= FORMATTERS ================= */
const formatUSD = n => `$${n.toFixed(2)} USD`;

/* ================= CART EMBED ================= */
export function buildCartEmbed(cart) {
  let description = "";

  for (const item of cart.values()) {
    description += `**${item.name}**                 ×${item.qty}\n`;
    description += `   ${formatUSD(item.price)}\n\n`;
  }

  if (!description) {
    description = "*Your cart is empty.*";
  }

  return new EmbedBuilder()
    .setTitle("<:cart:1463050420250218547> **__Your Cart__**")
    .setDescription(description)
    .setColor(0x2b2d31);
}

/* ================= PAYMENT EMBED ================= */
export function buildPaymentEmbed() {
  return new EmbedBuilder()
    .setTitle("**__Select Payment Method__**")
    .setDescription(
      "<:reply_continued:1463044510392254631> Select the payment method you would like to\n" +
      "<:reply_continued:1463044510392254631> use below.\n\n" +
      "<:reply_continued:1463044510392254631> After choosing a payment method, follow\n" +
      "<:reply_continued:1463044510392254631> the instructions to pay and receive your items."
    )
    .setColor(0x2b2d31);
}

/* ================= PAYMENT SELECT ================= */
export function buildPaymentSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select_payment")
      .setPlaceholder("Choose a payment method")
      .addOptions(
        {
          label: "Apple Pay",
          value: "applepay",
          emoji: { id: "1462934955062464522" }
        },
        {
          label: "Google Pay",
          value: "googlepay",
          emoji: { id: "1462934898762453033" }
        },
        {
          label: "PayPal",
          value: "paypal",
          emoji: { id: "1462934268375470235" }
        },
        {
          label: "Litecoin",
          value: "litecoin",
          emoji: { id: "1462934136502227065" }
        }
      )
  );
}

/* ================= TICKET TOOL LISTENER ================= */
export function setupTicketToolListener(client) {
  client.on("messageCreate", async message => {
    // Ignore DMs
    if (!message.guild) return;

    // Must be Ticket Tool
    if (message.author.id !== TICKET_TOOL_ID) return;

    // Must mention Ro Cart
    if (!message.mentions.users.has(RO_CART_ID)) return;

    // Reply in the SAME ticket
    try {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🛒 AutoPurchase Ready")
            .setDescription(
              "Hello! Your ticket has been detected.\n\n" +
              "Use the menu below to view your cart and select a payment method."
            )
            .setColor(0x2b2d31)
        ]
      });
    } catch (err) {
      console.error("Failed to reply in ticket:", err);
    }
  });
      }
