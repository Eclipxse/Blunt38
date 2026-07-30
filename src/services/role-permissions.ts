import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Role
} from "discord.js";

export type PermissionSpec = {
  key: string;
  name: string;
  description: string;
  flag: bigint;
};

export type PermissionGroupKey = "staff" | "text" | "voice" | "community";

export type PermissionGroup = {
  name: string;
  description: string;
  permissions: PermissionSpec[];
};

export type RolePresetKey =
  | "trial-moderator"
  | "moderator"
  | "senior-moderator"
  | "server-manager"
  | "support"
  | "event-manager"
  | "community-manager"
  | "giveaway-manager"
  | "dj"
  | "creator"
  | "vip"
  | "member";

export type RolePreset = {
  name: string;
  description: string;
  permissions: PermissionSpec[];
};

const permission = (
  key: string,
  name: string,
  description: string,
  flag: bigint
): PermissionSpec => ({ key, name, description, flag });

export const permissionGroups: Record<PermissionGroupKey, PermissionGroup> = {
  staff: {
    name: "Staff And Server",
    description: "Server administration, safety, moderation, and management permissions.",
    permissions: [
      permission("administrator", "Administrator", "Every permission. Use with extreme care.", PermissionFlagsBits.Administrator),
      permission("view-audit-log", "View Audit Log", "Review administrative actions.", PermissionFlagsBits.ViewAuditLog),
      permission("manage-server", "Manage Server", "Edit server-wide settings.", PermissionFlagsBits.ManageGuild),
      permission("manage-roles", "Manage Roles", "Create and edit lower roles.", PermissionFlagsBits.ManageRoles),
      permission("manage-channels", "Manage Channels", "Create, edit, and delete channels.", PermissionFlagsBits.ManageChannels),
      permission("kick-members", "Kick Members", "Remove members from the server.", PermissionFlagsBits.KickMembers),
      permission("ban-members", "Ban Members", "Ban and unban members.", PermissionFlagsBits.BanMembers),
      permission("timeout-members", "Timeout Members", "Temporarily restrict members.", PermissionFlagsBits.ModerateMembers),
      permission("manage-nicknames", "Manage Nicknames", "Edit other members' nicknames.", PermissionFlagsBits.ManageNicknames),
      permission("manage-webhooks", "Manage Webhooks", "Create and edit server webhooks.", PermissionFlagsBits.ManageWebhooks),
      permission("view-insights", "View Server Insights", "View community server analytics.", PermissionFlagsBits.ViewGuildInsights),
      permission("creator-analytics", "Creator Analytics", "View monetization analytics.", PermissionFlagsBits.ViewCreatorMonetizationAnalytics),
      permission("create-invites", "Create Invites", "Create server invitation links.", PermissionFlagsBits.CreateInstantInvite),
      permission("bypass-slowmode", "Bypass Slowmode", "Ignore channel slowmode limits.", PermissionFlagsBits.BypassSlowmode)
    ]
  },
  text: {
    name: "Text And Threads",
    description: "Messaging, media, reactions, polls, threads, and conversation management.",
    permissions: [
      permission("view-channels", "View Channels", "See accessible channels.", PermissionFlagsBits.ViewChannel),
      permission("send-messages", "Send Messages", "Send messages in text channels.", PermissionFlagsBits.SendMessages),
      permission("send-tts", "Send TTS Messages", "Send text-to-speech messages.", PermissionFlagsBits.SendTTSMessages),
      permission("manage-messages", "Manage Messages", "Delete and manage other messages.", PermissionFlagsBits.ManageMessages),
      permission("pin-messages", "Pin Messages", "Pin and unpin messages.", PermissionFlagsBits.PinMessages),
      permission("embed-links", "Embed Links", "Display rich link previews.", PermissionFlagsBits.EmbedLinks),
      permission("attach-files", "Attach Files", "Upload images and files.", PermissionFlagsBits.AttachFiles),
      permission("read-history", "Read Message History", "Read older channel messages.", PermissionFlagsBits.ReadMessageHistory),
      permission("mention-everyone", "Mention Everyone", "Mention everyone and all roles.", PermissionFlagsBits.MentionEveryone),
      permission("add-reactions", "Add Reactions", "React to messages.", PermissionFlagsBits.AddReactions),
      permission("send-voice-messages", "Send Voice Messages", "Post voice messages.", PermissionFlagsBits.SendVoiceMessages),
      permission("send-polls", "Create Polls", "Create native Discord polls.", PermissionFlagsBits.SendPolls),
      permission("create-public-threads", "Create Public Threads", "Start public threads.", PermissionFlagsBits.CreatePublicThreads),
      permission("create-private-threads", "Create Private Threads", "Start private threads.", PermissionFlagsBits.CreatePrivateThreads),
      permission("send-in-threads", "Send In Threads", "Talk inside threads.", PermissionFlagsBits.SendMessagesInThreads),
      permission("manage-threads", "Manage Threads", "Archive, delete, and moderate threads.", PermissionFlagsBits.ManageThreads),
      permission("external-emojis", "External Emojis", "Use emojis from other servers.", PermissionFlagsBits.UseExternalEmojis),
      permission("external-stickers", "External Stickers", "Use stickers from other servers.", PermissionFlagsBits.UseExternalStickers)
    ]
  },
  voice: {
    name: "Voice And Activities",
    description: "Voice rooms, streaming, soundboards, activities, and voice moderation.",
    permissions: [
      permission("connect", "Connect", "Join voice channels.", PermissionFlagsBits.Connect),
      permission("speak", "Speak", "Speak in voice channels.", PermissionFlagsBits.Speak),
      permission("video", "Video And Stream", "Use video and screen sharing.", PermissionFlagsBits.Stream),
      permission("priority-speaker", "Priority Speaker", "Lower other users while speaking.", PermissionFlagsBits.PrioritySpeaker),
      permission("mute-members", "Mute Members", "Server mute voice members.", PermissionFlagsBits.MuteMembers),
      permission("deafen-members", "Deafen Members", "Server deafen voice members.", PermissionFlagsBits.DeafenMembers),
      permission("move-members", "Move Members", "Move members between voice rooms.", PermissionFlagsBits.MoveMembers),
      permission("voice-activity", "Voice Activity", "Speak without push-to-talk.", PermissionFlagsBits.UseVAD),
      permission("request-to-speak", "Request To Speak", "Request stage speaking access.", PermissionFlagsBits.RequestToSpeak),
      permission("soundboard", "Use Soundboard", "Play server soundboard sounds.", PermissionFlagsBits.UseSoundboard),
      permission("external-sounds", "External Sounds", "Use sounds from other servers.", PermissionFlagsBits.UseExternalSounds),
      permission("voice-status", "Set Voice Status", "Set a voice channel status.", PermissionFlagsBits.SetVoiceChannelStatus)
    ]
  },
  community: {
    name: "Community And Apps",
    description: "Apps, activities, events, expressions, and personal member controls.",
    permissions: [
      permission("change-nickname", "Change Nickname", "Change your own nickname.", PermissionFlagsBits.ChangeNickname),
      permission("use-commands", "Use Application Commands", "Use slash and context commands.", PermissionFlagsBits.UseApplicationCommands),
      permission("use-activities", "Use Activities", "Launch Discord activities.", PermissionFlagsBits.UseEmbeddedActivities),
      permission("external-apps", "Use External Apps", "Use external application integrations.", PermissionFlagsBits.UseExternalApps),
      permission("manage-expressions", "Manage Expressions", "Manage emojis, stickers, and sounds.", PermissionFlagsBits.ManageGuildExpressions),
      permission("create-expressions", "Create Expressions", "Create emojis, stickers, and sounds.", PermissionFlagsBits.CreateGuildExpressions),
      permission("manage-events", "Manage Events", "Edit and cancel server events.", PermissionFlagsBits.ManageEvents),
      permission("create-events", "Create Events", "Create server events.", PermissionFlagsBits.CreateEvents)
    ]
  }
};

export const allPermissionSpecs = Object.values(permissionGroups)
  .flatMap((group) => group.permissions);

const permissionByKey = new Map(
  allPermissionSpecs.map((item) => [item.key, item])
);

function permissions(...keys: string[]) {
  return keys.map((key) => {
    const found = permissionByKey.get(key);
    if (!found) throw new Error(`Unknown role permission key: ${key}`);
    return found;
  });
}

const memberPermissionKeys = [
  "change-nickname",
  "view-channels",
  "send-messages",
  "send-in-threads",
  "create-public-threads",
  "embed-links",
  "attach-files",
  "add-reactions",
  "external-emojis",
  "external-stickers",
  "read-history",
  "send-voice-messages",
  "send-polls",
  "use-commands",
  "use-activities",
  "connect",
  "speak",
  "video",
  "voice-activity",
  "soundboard"
];

const moderatorPermissionKeys = [
  "view-audit-log",
  "kick-members",
  "ban-members",
  "timeout-members",
  "manage-messages",
  "pin-messages",
  "manage-threads",
  "manage-nicknames",
  "view-channels",
  "send-messages",
  "embed-links",
  "attach-files",
  "read-history",
  "connect",
  "speak",
  "mute-members",
  "deafen-members",
  "move-members"
];

export const rolePresets: Record<RolePresetKey, RolePreset> = {
  "trial-moderator": {
    name: "Trial Moderator",
    description: "Entry-level moderation without kick, ban, or server management access.",
    permissions: permissions(
      "view-audit-log",
      "timeout-members",
      "manage-messages",
      "manage-threads",
      "manage-nicknames",
      "view-channels",
      "send-messages",
      "embed-links",
      "attach-files",
      "read-history",
      "connect",
      "speak",
      "mute-members",
      "move-members"
    )
  },
  moderator: {
    name: "Moderator",
    description: "Full day-to-day member, message, thread, nickname, and voice moderation.",
    permissions: permissions(...moderatorPermissionKeys)
  },
  "senior-moderator": {
    name: "Senior Moderator",
    description: "Moderator access plus channels, webhooks, events, and slowmode control.",
    permissions: permissions(
      ...moderatorPermissionKeys,
      "manage-channels",
      "manage-webhooks",
      "manage-events",
      "create-events",
      "bypass-slowmode"
    )
  },
  "server-manager": {
    name: "Server Manager",
    description: "Powerful server operations without the unrestricted Administrator permission.",
    permissions: permissions(
      ...moderatorPermissionKeys,
      "manage-server",
      "manage-roles",
      "manage-channels",
      "manage-webhooks",
      "manage-events",
      "create-events",
      "manage-expressions",
      "create-expressions",
      "mention-everyone",
      "bypass-slowmode"
    )
  },
  support: {
    name: "Support",
    description: "Handle tickets, threads, member questions, and support voice rooms.",
    permissions: permissions(
      "view-channels",
      "send-messages",
      "embed-links",
      "attach-files",
      "read-history",
      "manage-messages",
      "manage-threads",
      "connect",
      "speak",
      "move-members"
    )
  },
  "event-manager": {
    name: "Event Manager",
    description: "Create, announce, and manage community events and event rooms.",
    permissions: permissions(
      "view-channels",
      "send-messages",
      "embed-links",
      "attach-files",
      "read-history",
      "mention-everyone",
      "manage-events",
      "create-events",
      "manage-threads",
      "connect",
      "speak",
      "move-members"
    )
  },
  "community-manager": {
    name: "Community Manager",
    description: "Manage conversations, expressions, announcements, nicknames, and engagement.",
    permissions: permissions(
      "view-audit-log",
      "view-channels",
      "send-messages",
      "embed-links",
      "attach-files",
      "read-history",
      "manage-messages",
      "manage-threads",
      "manage-nicknames",
      "mention-everyone",
      "manage-expressions",
      "create-expressions",
      "manage-events",
      "create-events",
      "bypass-slowmode"
    )
  },
  "giveaway-manager": {
    name: "Giveaway Manager",
    description: "Run giveaways and announcements without broad staff permissions.",
    permissions: permissions(
      "view-channels",
      "send-messages",
      "embed-links",
      "attach-files",
      "read-history",
      "manage-messages",
      "mention-everyone",
      "add-reactions",
      "use-commands"
    )
  },
  dj: {
    name: "DJ",
    description: "Control music spaces, stream audio, use soundboards, and move listeners.",
    permissions: permissions(
      "view-channels",
      "send-messages",
      "embed-links",
      "read-history",
      "connect",
      "speak",
      "video",
      "voice-activity",
      "soundboard",
      "external-sounds",
      "move-members"
    )
  },
  creator: {
    name: "Content Creator",
    description: "Post media, stream, use voice tools, threads, polls, and external expressions.",
    permissions: permissions(
      ...memberPermissionKeys,
      "create-private-threads",
      "external-sounds"
    )
  },
  vip: {
    name: "VIP",
    description: "Member access plus private threads, priority voice, and external app features.",
    permissions: permissions(
      ...memberPermissionKeys,
      "create-private-threads",
      "priority-speaker",
      "external-sounds",
      "external-apps"
    )
  },
  member: {
    name: "Member",
    description: "Standard community access for chat, media, threads, apps, and voice.",
    permissions: permissions(...memberPermissionKeys)
  }
};

export const rolePresetChoices = (
  Object.entries(rolePresets) as Array<[RolePresetKey, RolePreset]>
).map(([value, preset]) => ({
  name: preset.name,
  value
}));

export function isRolePresetKey(value: string): value is RolePresetKey {
  return value in rolePresets;
}

export function permissionSummary(specs: PermissionSpec[]) {
  return specs.map((item) => `\`${item.name}\``).join(" ");
}

export function specsFromKeys(keys: Iterable<string>) {
  return [...keys]
    .map((key) => permissionByKey.get(key))
    .filter((item): item is PermissionSpec => Boolean(item));
}

export function rolePermissionKeys(role: Role) {
  return new Set(
    allPermissionSpecs
      .filter((item) => role.permissions.has(item.flag, false))
      .map((item) => item.key)
  );
}

export function missingMemberPermissions(member: GuildMember, specs: PermissionSpec[]) {
  return specs.filter((item) => !member.permissions.has(item.flag));
}

export async function roleEditProblem(guild: Guild, userId: string, role: Role) {
  if (role.id === guild.id) {
    return "The `@everyone` role cannot be edited by the Role Factory.";
  }

  if (role.managed) {
    return "Integration-managed and bot-managed roles cannot be edited.";
  }

  const botMember = guild.members.me ?? await guild.members.fetchMe();
  const moderator = await guild.members.fetch(userId);
  const moderatorCanEdit = guild.ownerId === userId
    || role.position < moderator.roles.highest.position;
  const botCanEdit = botMember.permissions.has(PermissionFlagsBits.ManageRoles)
    && role.position < botMember.roles.highest.position;

  if (!moderatorCanEdit || !botCanEdit) {
    return "Both your highest role and blunt38's highest role must be above the target role.";
  }

  return null;
}

export function parseRoleColor(input?: string | null) {
  if (!input) return 0x8f63c7;
  const normalized = input.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return Number.parseInt(normalized, 16);
}
