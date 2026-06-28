import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandData } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN?.trim();
const configuredClientId = process.env.DISCORD_CLIENT_ID?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!token) throw new Error("Missing DISCORD_TOKEN.");

async function fetchApplicationId() {
  const response = await fetch("https://discord.com/api/v10/oauth2/applications/@me", {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Could not verify bot application from DISCORD_TOKEN (${response.status}): ${body}`);
  }

  const application = await response.json() as { id?: string };
  if (!application.id) {
    throw new Error("Discord did not return an application id for this bot token.");
  }

  return application.id;
}

const rest = new REST({ version: "10" }).setToken(token);
const clientId = await fetchApplicationId();

if (configuredClientId && configuredClientId !== clientId) {
  console.warn(`DISCORD_CLIENT_ID in .env is ${configuredClientId}, but the bot token belongs to ${clientId}. Using ${clientId}.`);
}

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

await rest.put(route, { body: commandData });
console.log(`Deployed ${commandData.length} commands for application ${clientId} ${guildId ? `to guild ${guildId}` : "globally"}.`);
