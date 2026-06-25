import type { Interaction } from "discord.js";
import { handleEmbedModal } from "./embed-builder.js";
import { handleGameButton } from "./games.js";
import { handleGiveawayButton } from "./giveaways.js";
import { handleHelpButton } from "./help.js";
import { handleModerationButton, handleModerationModal } from "./moderation.js";
import { handleMusicButton } from "./music.js";
import { handlePollButton } from "./polls.js";
import { handleRoleSelect } from "./roles.js";
import { handleSetupComponent, handleSetupModal } from "./setup.js";
import { handleSuggestionButton, handleSuggestionModal } from "./suggestions.js";
import { handleTicketComponent, handleTicketModal } from "./tickets.js";

export async function handleInteraction(interaction: Interaction) {
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("help:")) return handleHelpButton(interaction);
    if (interaction.customId.startsWith("setup:")) return handleSetupComponent(interaction);
    if (interaction.customId.startsWith("ticket:")) return handleTicketComponent(interaction);
    if (interaction.customId.startsWith("mod:")) return handleModerationButton(interaction);
    if (interaction.customId.startsWith("poll:")) return handlePollButton(interaction);
    if (interaction.customId.startsWith("suggest:")) return handleSuggestionButton(interaction);
    if (interaction.customId.startsWith("giveaway:")) return handleGiveawayButton(interaction);
    if (interaction.customId.startsWith("game:")) return handleGameButton(interaction);
    if (interaction.customId.startsWith("music:")) return handleMusicButton(interaction);
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket:kind") return handleTicketComponent(interaction);
    if (interaction.customId.startsWith("roles:select:")) return handleRoleSelect(interaction);
  }

  if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
    if (interaction.customId.startsWith("setup:")) return handleSetupComponent(interaction);
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("setup:modal:")) return handleSetupModal(interaction);
    if (interaction.customId.startsWith("ticket:create:")) return handleTicketModal(interaction);
    if (interaction.customId.startsWith("mod:modal:")) return handleModerationModal(interaction);
    if (interaction.customId === "suggest:modal") return handleSuggestionModal(interaction);
    if (interaction.customId.startsWith("embed:create:")) return handleEmbedModal(interaction);
  }
}
