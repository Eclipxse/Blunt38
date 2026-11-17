import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

function isolatedCheck(source) {
  const directory = mkdtempSync(path.join(tmpdir(), "blunt38-safety-"));
  const root = pathToFileURL(`${process.cwd()}/`).href;
  try {
    execFileSync(process.execPath, ["--input-type=module", "-e", `
      import assert from "node:assert/strict";
      const root = ${JSON.stringify(root)};
      const store = await import(new URL("dist/services/store.js", root));
      ${source}
    `], {
      cwd: directory,
      env: { ...process.env, DISCORD_TOKEN: "test-only", STORAGE_DRIVER: "json" },
      stdio: "pipe"
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("concurrent entries and votes survive and a giveaway is claimed once in its guild", () => {
  isolatedCheck(`
    const giveaway = await store.createGiveaway({
      guildId: "123", channelId: "456", prize: "Test", winnerCount: 2,
      endsAt: new Date().toISOString()
    });
    await Promise.all(Array.from({length: 12}, (_, i) => store.enterGiveaway(giveaway.id, String(i))));
    assert.equal((await store.getGiveaway(giveaway.id)).entrantIds.length, 12);
    assert.equal(await store.claimGiveawayEnd(giveaway.id, "wrong-server"), null);
    const claims = await Promise.all(Array.from({length: 4}, () => store.claimGiveawayEnd(giveaway.id, "123")));
    assert.equal(claims.filter(Boolean).length, 1);
    const ended = await store.getGiveaway(giveaway.id);
    assert.equal(ended.winnerIds.length, 2);
    assert.equal(new Set(ended.winnerIds).size, 2);
    assert(ended.winnerIds.every(id => ended.entrantIds.includes(id)));
    assert.equal(await store.enterGiveaway(giveaway.id, "late"), null);
    const poll = await store.createPoll("123", "Test?", ["A", "B"]);
    await Promise.all(Array.from({length: 12}, (_, i) => store.votePoll(poll.id, String(i), i % 2)));
    assert.equal(Object.keys((await store.getPoll(poll.id)).votes).length, 12);
  `);
});

test("cleanup previews tracked IDs, preserves untracked resources, and reports failed deletions", () => {
  isolatedCheck(`
    const {mkdir, writeFile} = await import("node:fs/promises");
    const {serverBuilderCommand} = await import(new URL("dist/commands/server-builder.js", root));
    await mkdir("data/server-builder", {recursive: true});
    await writeFile("data/server-builder/123-gaming.log", "channel 111\\nchannel 222\\nrole 333\\n");
    const deleted = [];
    const channels = new Map([
      ["111", {id: "111", name: "built", delete: async () => { deleted.push("111"); }}],
      ["222", {id: "222", name: "denied", delete: async () => { throw new Error("Forbidden"); }}],
      ["999", {id: "999", name: "General", delete: async () => { deleted.push("999"); }}]
    ]);
    const roles = new Map([["333", {id: "333", name: "assigned", members: new Map()}]]);
    await store.updateGuildConfig("123", {welcomeChannelId: "111", logChannelId: "222", autoRoleId: "333"});
    let confirm = false;
    const replies = [];
    const interaction = {
      guildId: "123", guild: {
        id: "123", channels: {fetch: async () => channels}, roles: {fetch: async () => roles},
        members: {fetch: async () => { roles.get("333").members.set("user", {}); }}
      },
      options: {getSubcommand: () => "cleanup", getString: () => "gaming", getBoolean: () => confirm},
      deferReply: async () => {}, editReply: async reply => { replies.push(reply); }
    };
    await serverBuilderCommand.execute(interaction);
    assert.equal(deleted.length, 0);
    confirm = true;
    await serverBuilderCommand.execute(interaction);
    assert.deepEqual(deleted, ["111"]);
    const config = await store.getGuildConfig("123");
    assert.equal(config.welcomeChannelId, undefined);
    assert.equal(config.logChannelId, "222");
    assert.equal(config.autoRoleId, "333");
    const report = replies.at(-1).files[0].attachment.toString();
    assert.match(report, /Deleted built/);
    assert.match(report, /Failed to delete denied/);
    assert.match(report, /Skipped assigned/);
  `);
});

test("birthday, leaderboard, poll creation, and poll voting acknowledge before storage work", () => {
  isolatedCheck(`
    const {birthdayCommand} = await import(new URL("dist/commands/birthday.js", root));
    const {leaderboardCommand} = await import(new URL("dist/commands/leveling.js", root));
    const {pollCommand} = await import(new URL("dist/commands/poll.js", root));
    for (const command of [birthdayCommand, leaderboardCommand, pollCommand]) {
      let deferred = false;
      await command.execute({
        guildId: "123", user: {id: "456"},
        options: {getSubcommand: () => "list", getString: key => key === "question" ? "Test?" : "Option"},
        deferReply: async () => { deferred = true; },
        editReply: async () => { assert(deferred); }, followUp: async () => {}
      });
      assert(deferred);
    }
    const {handlePollButton} = await import(new URL("dist/interactions/polls.js", root));
    const poll = await store.createPoll("123", "Test?", ["A", "B"]);
    let deferred = false;
    await handlePollButton({
      customId: "poll:vote:" + poll.id + ":0", user: {id: "456"},
      deferUpdate: async () => { deferred = true; },
      editReply: async () => { assert(deferred); }
    });
    assert.equal((await store.getPoll(poll.id)).votes["456"], 0);
  `);
});

test("role changes reject managed roles, roles above the caller, and callers without Manage Roles", () => {
  isolatedCheck(`
    const {roleEditProblem} = await import(new URL("dist/services/role-permissions.js", root));
    const {PermissionFlagsBits, PermissionsBitField} = await import(new URL("node_modules/discord.js/src/index.js", root));
    const permissions = new PermissionsBitField(PermissionFlagsBits.ManageRoles);
    const moderator = {permissions, roles: {highest: {position: 5}}};
    const guild = {
      id: "123", ownerId: "owner",
      members: {
        me: {permissions, roles: {highest: {position: 10}}},
        fetch: async () => moderator
      }
    };
    assert.match(await roleEditProblem(guild, "user", {id: "456", managed: true}), /managed/);
    assert.match(await roleEditProblem(guild, "user", {id: "456", position: 6}), /above/);
    assert.equal(await roleEditProblem(guild, "user", {id: "456", position: 3}), null);
    moderator.permissions = new PermissionsBitField();
    assert.match(await roleEditProblem(guild, "user", {id: "456", position: 3}), /Manage Roles/);
  `);
});
