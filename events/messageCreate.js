import { roles } from '../config/roles.js';
import { handlePing } from '../utils/helpers.js';

export default async function messageCreate(message) {
    if (message.author.bot) return;

    // Check if the message contains a role ping
    Object.entries(roles).forEach(([key, roleId]) => {
        if (message.mentions.roles.has(roleId)) {
            handlePing(message, key);
        }
    });
}
