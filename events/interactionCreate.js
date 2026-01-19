import { handleInteraction } from '../utils/helpers.js';

export default async function interactionCreate(interaction) {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;
    handleInteraction(interaction);
}
