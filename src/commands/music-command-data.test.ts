import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationCommandOptionType, type ChatInputCommandInteraction } from "discord.js";
import { createMusicCommandData, createMusicCommands, directMusicActions } from "./music-command-data.js";

const filters = [{ name: "Original", value: "off" }, { name: "Balanced", value: "balanced" }];

test("everyday music commands are direct, guild-only and not duplicated under /music", () => {
  const { direct, advanced } = createMusicCommandData(filters);
  assert.deepEqual(new Set(direct.map((command) => command.name)), new Set(directMusicActions));
  const advancedData = advanced.toJSON();
  assert.equal(advancedData.name, "music");
  assert.deepEqual(advancedData.options?.map((option) => option.name), [
    "previous", "replay", "clear", "seek", "autoplay", "filters", "move", "remove", "settings"
  ]);
  for (const command of [...direct, advanced]) {
    const data = command.toJSON();
    assert.equal(data.dm_permission, false);
    assert.ok(data.description.length > 0 && data.description.length <= 100);
  }
  assert.equal(direct.length + (advancedData.options?.length ?? 0), 20);
});

test("shortcuts preserve required input, supported options and safe volume limits", () => {
  const { direct, advanced } = createMusicCommandData(filters);
  const option = (name: string) => direct.find((command) => command.name === name)!.toJSON().options![0];
  const play = option("play");
  assert.equal(play.type, ApplicationCommandOptionType.String);
  if (play.type !== ApplicationCommandOptionType.String) return;
  assert.equal(play.name, "query");
  assert.equal(play.required, true);
  assert.equal(play.max_length, 500);
  const search = option("search");
  assert.equal(search.type, ApplicationCommandOptionType.String);
  if (search.type === ApplicationCommandOptionType.String) assert.equal(search.max_length, 200);
  const volume = option("volume");
  assert.equal(volume.type, ApplicationCommandOptionType.Integer);
  if (volume.type === ApplicationCommandOptionType.Integer) {
    assert.equal(volume.required, true);
    assert.equal(volume.min_value, 1);
    assert.equal(volume.max_value, 100);
  }
  const loop = option("loop");
  if (loop.type === ApplicationCommandOptionType.String) {
    assert.deepEqual(loop.choices?.map((choice) => choice.value), ["off", "track", "queue"]);
  } else assert.fail("Loop must use string choices");
  const filter = advanced.toJSON().options?.find((item) => item.name === "filters");
  assert.equal(filter?.type, ApplicationCommandOptionType.Subcommand);
  if (filter?.type === ApplicationCommandOptionType.Subcommand) {
    const preset = filter.options?.[0];
    assert.equal(preset?.type, ApplicationCommandOptionType.String);
    if (preset?.type === ApplicationCommandOptionType.String) {
      assert.deepEqual(preset.choices?.map(({ name, value }) => ({ name, value })), filters);
    }
  }
});

test("each shortcut dispatches the original interaction without asking for a subcommand", async () => {
  const calls: Array<{ action: string; interaction: ChatInputCommandInteraction }> = [];
  const commands = createMusicCommands(async (interaction, action) => { calls.push({ action, interaction }); }, filters);
  const interaction = {
    options: { getSubcommand: () => { throw new Error("A direct command has no subcommand"); } }
  } as unknown as ChatInputCommandInteraction;
  for (const command of commands.filter((item) => item.data.name !== "music")) {
    await command.execute(interaction);
    assert.equal(calls.at(-1)?.action, command.data.name);
    assert.equal(calls.at(-1)?.interaction, interaction);
  }
  assert.equal(calls.length, directMusicActions.length);
});

test("advanced and legacy nested requests route to the same handler during migration", async () => {
  const actions: string[] = [];
  const music = createMusicCommands(async (_interaction, action) => { actions.push(action); }, filters)
    .find((command) => command.data.name === "music")!;
  for (const action of ["settings", "seek", "play", "pause", "queue"]) {
    await music.execute({ options: { getSubcommand: () => action } } as unknown as ChatInputCommandInteraction);
  }
  assert.deepEqual(actions, ["settings", "seek", "play", "pause", "queue"]);
});

test("repeated catalog construction does not accumulate options or mutate another catalog", () => {
  const first = createMusicCommandData(filters);
  const second = createMusicCommandData(filters);
  assert.deepEqual(first.direct.map((item) => item.toJSON()), second.direct.map((item) => item.toJSON()));
  assert.deepEqual(first.advanced.toJSON(), second.advanced.toJSON());
});
