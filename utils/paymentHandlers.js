export function getPaymentEmbed(method, total) {
    switch(method) {
        case 'PayPal':
            return `Your total is ${total} USD.\nPlease send it to \`solimanzein860@gmail.com\` through FnF (friends and family).\nAfter paying, send a screenshot of the transaction in the ticket.`;
        case 'Litecoin':
            return `Your total is ${total} USD.\nPlease send it to this Litecoin address \`LRhUVpYPbANmtczdDuZbHHkrunyWJwEFKm\`.\nAfter paying, send a screenshot of the transaction in the ticket.`;
        case 'Card':
        case 'Google Pay':
        case 'Apple Pay':
            return `Your total is ${total} USD.\nClick the Purchase button below, enter exactly ${total}, and complete payment.\nAfter paying, send a screenshot of the transaction.`;
        default:
            return `Payment method not supported.`;
    }
}
