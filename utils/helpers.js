import messageCreate from '../events/messageCreate.js';
import interactionCreate from '../events/interactionCreate.js';

export function registerEvents(client) {
    client.on('messageCreate', messageCreate);
    client.on('interactionCreate', interactionCreate);
}

// Add helpers for creating dropdowns, embeds, etc.
// Add your handlePing and handleInteraction logic here
