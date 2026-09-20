import assert from "node:assert/strict";
import { mock, test } from "node:test";
import dotenv from "dotenv";
import { ButtonStyle, MessageFlags, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";

// The UI imports configuration, but these tests must not read a developer's .env.
const previousToken = process.env.DISCORD_TOKEN;
const previousBrand = process.env.BOT_BRAND_NAME;
process.env.DISCORD_TOKEN = "help-menu-test-token";
process.env.BOT_BRAND_NAME = "Help test";
const dotenvConfig = mock.method(dotenv, "config", () => ({ parsed: {} }));
const { helpPayload } = await import("./help-menu.js");
const { helpCommand } = await import("../commands/help.js");
const { handleHelpButton } = await import("../interactions/help.js");
const { embed, panelEmbed, palette, successEmbed, warningEmbed, dangerConfirmRow } = await import("./ui.js");
dotenvConfig.mock.restore();
if (previousToken === undefined) delete process.env.DISCORD_TOKEN;
else process.env.DISCORD_TOKEN = previousToken;
if (previousBrand === undefined) delete process.env.BOT_BRAND_NAME;
else process.env.BOT_BRAND_NAME = previousBrand;

test("help opens a private music quick start with direct playback commands", async () => {
  let reply: unknown;
  await helpCommand.execute({
    reply: async (payload: unknown) => { reply = payload; }
  } as unknown as ChatInputCommandInteraction);

  const payload = reply as ReturnType<typeof helpPayload> & { flags: number };
  const content = payload.embeds[0].toJSON();
  assert.equal(payload.flags, MessageFlags.Ephemeral);
  assert.equal(content.title, "Music help");
  assert.match(content.description ?? "", /\/play query/);
  assert.match(content.description ?? "", /\/search query/);
  const fields = JSON.stringify(content.fields);
  for (const command of ["pause", "resume", "skip", "stop", "queue", "nowplaying", "volume", "loop", "shuffle"]) {
    assert.ok(fields.includes(`/${command}`), `Missing direct command: ${command}`);
  }
  assert.ok(fields.includes("/music settings"));
  assert.match(fields, /Manage Server/);
});

test("help navigation has three clear tabs and marks the active section", () => {
  for (const section of ["music", "community", "server"]) {
    const payload = helpPayload(section);
    const buttons = payload.components[0].components.map((button) => button.toJSON());
    assert.equal(payload.components.length, 1);
    assert.deepEqual(buttons.map((button) => "label" in button ? button.label : undefined), ["Music", "Community", "Server"]);
    for (const button of buttons) {
      assert.ok("custom_id" in button);
      assert.equal(button.disabled, button.custom_id === `help:${section}`);
      assert.equal(button.style, button.disabled ? ButtonStyle.Primary : ButtonStyle.Secondary);
      assert.equal(button.emoji, undefined);
    }
  }
});

test("existing help buttons still resolve to the correct section", async () => {
  for (const [customId, title] of [
    ["help:core", "Music help"],
    ["help:community", "Community help"],
    ["help:staff", "Server help"],
    ["help:music", "Music help"],
    ["help:server", "Server help"]
  ]) {
    let update: unknown;
    await handleHelpButton({
      customId,
      update: async (payload: unknown) => { update = payload; }
    } as unknown as ButtonInteraction);
    assert.equal((update as ReturnType<typeof helpPayload>).embeds[0].toJSON().title, title);
  }
});

test("help content fits Discord limits and describes restricted access accurately", () => {
  for (const section of ["music", "community", "server"]) {
    const content = helpPayload(section).embeds[0].toJSON();
    const fields = content.fields ?? [];
    assert.ok(fields.length <= 25);
    assert.ok((content.description?.length ?? 0) <= 4096);
    assert.ok(fields.every((field) => field.name.length <= 256 && field.value.length <= 1024));
    const textLength = (content.title?.length ?? 0)
      + (content.description?.length ?? 0)
      + (content.author?.name.length ?? 0)
      + fields.reduce((total, field) => total + field.name.length + field.value.length, 0);
    assert.ok(textLength <= 6000);
  }
  const server = JSON.stringify(helpPayload("server").embeds[0].toJSON());
  assert.match(server, /allowlist/);
  assert.match(server, /Move Members/);
  assert.doesNotMatch(server, /admin.only/i);
});

test("shared embeds preserve content and colors without decorative status or premium copy", () => {
  const ordinary = embed("Title", "Description", palette.violet).toJSON();
  assert.equal(ordinary.author?.name, "Help test");
  assert.equal(ordinary.footer, undefined);
  assert.equal(ordinary.color, palette.violet);
  assert.equal(ordinary.description, "Description");
  assert.ok(ordinary.timestamp);

  const panel = panelEmbed("Queue", "CONTROL", "**Functional** content", palette.electric).toJSON();
  assert.equal(panel.title, "Queue");
  assert.equal(panel.description, "**Functional** content");
  assert.equal(panel.fields, undefined);
  assert.equal(successEmbed("Saved", "Done").toJSON().color, palette.success);
  assert.equal(warningEmbed("Warning", "Check this").toJSON().color, palette.warning);
});

test("explicit statuses and confirmation actions survive presentation cleanup", () => {
  const panel = panelEmbed("Channel cleaned", "CLEAN SWEEP", "Messages removed.", palette.success, "4/5 removed")
    .addFields({ name: "Requested", value: "5", inline: true })
    .toJSON();
  assert.deepEqual(panel.fields, [
    { name: "Status", value: "`4/5 removed`", inline: true },
    { name: "Requested", value: "5", inline: true }
  ]);
  const buttons = dangerConfirmRow("confirm:action", "cancel:action").components.map((button) => button.toJSON());
  assert.deepEqual(buttons.map((button) => "custom_id" in button ? button.custom_id : undefined), ["confirm:action", "cancel:action"]);
  assert.deepEqual(buttons.map((button) => button.style), [ButtonStyle.Danger, ButtonStyle.Secondary]);
});
