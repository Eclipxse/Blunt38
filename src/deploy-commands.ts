import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandData } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN?.trim();
const clientId = process.env.DISCORD_CLIENT_ID?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!token) throw new Error("Missing DISCORD_TOKEN.");
if (!clientId) throw new Error("Missing DISCORD_CLIENT_ID. You can find it in the Developer Portal application page.");

const rest = new REST({ version: "10" }).setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

await rest.put(route, { body: commandData });
console.log(`Deployed ${commandData.length} commands ${guildId ? `to guild ${guildId}` : "globally"}.`);
