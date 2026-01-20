import { EmbedBuilder } from "discord.js";

export function getPaymentEmbed(method, total) {
    switch(method) {
        case 'PayPal':
            return new EmbedBuilder()
                .setTitle("**Payment Instructions**")
                .setDescription(
                    `__PayPal Payment Instructions__\n\n` +
                    `<:reply_continued:1463044510392254631> Your total is **$${total} USD**\n\n` +
                    `<:reply_continued:1463044510392254631> Please send **$${total}** to **solimanzein860@gmail.com**\n\n` +
                    `<:reply_continued:1463044510392254631> After paying, please send a screenshot in this ticket`
                )
                .setColor(0x2b2d31);

        case 'Litecoin':
            return new EmbedBuilder()
                .setTitle("**Payment Instructions**")
                .setDescription(
                    `__Litecoin Payment Instructions__\n\n` +
                    `<:reply_continued:1463044510392254631> Your total is **$${total} USD**\n\n` +
                    `<:reply_continued:1463044510392254631> Please send exactly **$${total}** to this LTC address  \n` +
                    `<:reply_continued:1463044510392254631> __(click to copy)__\n\n` +
                    `<:reply_continued:1463044510392254631> \`LRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\`\n\n` +
                    `<:reply_continued:1463044510392254631> After paying, please send a screenshot in this ticket`
                )
                .setColor(0x2b2d31);

        case 'Card':
        case 'Google Pay':
        case 'Apple Pay':
            return new EmbedBuilder()
                .setTitle("**Payment Instructions**")
                .setDescription(
                    `__${method} Payment Instructions__\n\n` +
                    `<:reply_continued:1463044510392254631> Your total is **$${total} USD**\n\n` +
                    `<:reply_continued:1463044510392254631> Click the **Purchase** button below to complete your purchase\n\n` +
                    `<:reply_continued:1463044510392254631> After paying, please send a screenshot in this ticket`
                )
                .setColor(0x2b2d31);

        default:
            return new EmbedBuilder()
                .setTitle("**Payment Instructions**")
                .setDescription("Payment method not supported.")
                .setColor(0xff0000);
    }
}
