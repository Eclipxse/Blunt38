import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type CategoryChannel,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type Role,
  type TextChannel,
  type VoiceChannel
} from "discord.js";
import { createRolePanel, updateGuildConfig } from "../services/store.js";
import type { Command } from "../types.js";
import { embed, palette, panelEmbed } from "../utils/ui.js";

type ThemeKey = "brownie" | "gaming" | "soft-cute" | "dark-luxury" | "crisscross";
type RoleKey = "founder" | "admin" | "moderator" | "dj" | "vip" | "member" | "muted";
type LegacyCategoryKey = "gate" | "lounge" | "events" | "music" | "voice" | "support" | "staff";
type CategoryKey =
  | LegacyCategoryKey
  | "important"
  | "ownersCabin"
  | "general"
  | "spotlightNetwork"
  | "spotlightCreativity"
  | "spotlightStudio"
  | "gameTalk"
  | "funZone"
  | "peaceArea"
  | "createTicket";
type ChannelKey =
  | "start"
  | "rules"
  | "map"
  | "roles"
  | "announcements"
  | "chat"
  | "media"
  | "chaos"
  | "confessions"
  | "ai"
  | "giveaways"
  | "polls"
  | "events"
  | "leaderboard"
  | "musicCommands"
  | "nowPlaying"
  | "djRoom"
  | "joinToCreate"
  | "chill"
  | "lateNight"
  | "stream"
  | "openTicket"
  | "transcripts"
  | "staffChat"
  | "modActions"
  | "logs"
  | "botControl"
  | "permanentLink"
  | "gameRoles"
  | "invites"
  | "socialMedia"
  | "ytNotify"
  | "ownerVc"
  | "liveVc"
  | "communityMeetings"
  | "waitingVc"
  | "chillVc"
  | "generalVc"
  | "liveUpdates"
  | "spotlightAnnouncements"
  | "matchResults"
  | "clutchMoments"
  | "highlights"
  | "dramaAlert"
  | "spotlightCollabs"
  | "creativesAnnouncements"
  | "brandCollabs"
  | "creatorManagement"
  | "ugcCreators"
  | "campaignLaunches"
  | "paidPromotions"
  | "creatorGrowth"
  | "viralIdeas"
  | "mediaKits"
  | "creativesVc"
  | "studioAnnouncements"
  | "gfxShowcase"
  | "vfxShowcase"
  | "thumbnailLab"
  | "clientProjects"
  | "editingDrops"
  | "reelsProduction"
  | "portfolioWork"
  | "contentIdeas"
  | "studioVc"
  | "duoOne"
  | "duoTwo"
  | "trioOne"
  | "trioTwo"
  | "squadOne"
  | "squadTwo"
  | "owo"
  | "musicVcOne"
  | "musicVcTwo";

type PanelKey = "welcome" | "rules" | "map" | "roles" | "ticket" | "music" | "staff";

type RoleSpec = {
  key: RoleKey;
  name: string;
  color: number;
  permissions?: bigint[];
};

type ChannelSpec = {
  key: ChannelKey;
  name: string;
  type: ChannelType.GuildText | ChannelType.GuildVoice | ChannelType.GuildAnnouncement;
  panel?: PanelKey;
  staffOnly?: boolean;
};

type CategorySpec = {
  key: CategoryKey;
  name: string;
  channels: ChannelSpec[];
  staffOnly?: boolean;
  ownerOnly?: boolean;
};

type TemplateWiring = {
  welcomeChannel?: ChannelKey;
  logChannel?: ChannelKey;
  ticketCategory?: CategoryKey;
  tempVoiceJoinChannel?: ChannelKey;
  tempVoiceCategory?: CategoryKey;
  birthdayChannel?: ChannelKey;
  levelUpChannel?: ChannelKey;
  aiResponderChannel?: ChannelKey;
  aiResponderEnabled?: boolean;
  levelingEnabled?: boolean;
};

type ServerTemplate = {
  key: ThemeKey;
  name: string;
  accent: number;
  description: string;
  roles: RoleSpec[];
  categories: CategorySpec[];
  welcomeMessage: string;
  aiPrompt: string;
  rootChannels?: ChannelSpec[];
  panelTargets?: Partial<Record<PanelKey, ChannelKey>>;
  wiring?: TemplateWiring;
};

type BuildContext = {
  roles: Map<RoleKey, Role>;
  categories: Map<CategoryKey, CategoryChannel>;
  channels: Map<ChannelKey, GuildBasedChannel>;
  createdChannelKeys: Set<ChannelKey>;
};

const buildMarker = "browniezzz-builder:v1";

const themeChoices: Array<{ name: string; value: ThemeKey }> = [
  { name: "blunt38 CRT", value: "brownie" },
  { name: "Gaming Arena", value: "gaming" },
  { name: "Soft Cute", value: "soft-cute" },
  { name: "Dark Luxury", value: "dark-luxury" },
  { name: "Crisscross", value: "crisscross" }
];

const sharedChannels = {
  gate: [
    { key: "start", name: "start-here", type: ChannelType.GuildText, panel: "welcome" },
    { key: "rules", name: "rules-and-safety", type: ChannelType.GuildText, panel: "rules" },
    { key: "map", name: "server-map", type: ChannelType.GuildText, panel: "map" },
    { key: "roles", name: "pick-your-roles", type: ChannelType.GuildText, panel: "roles" },
    { key: "announcements", name: "announcements", type: ChannelType.GuildText }
  ],
  lounge: [
    { key: "chat", name: "main-chat", type: ChannelType.GuildText },
    { key: "media", name: "media-drops", type: ChannelType.GuildText },
    { key: "chaos", name: "daily-chaos", type: ChannelType.GuildText },
    { key: "confessions", name: "confessions", type: ChannelType.GuildText },
    { key: "ai", name: "ai-bestie", type: ChannelType.GuildText }
  ],
  events: [
    { key: "giveaways", name: "giveaways", type: ChannelType.GuildText },
    { key: "polls", name: "polls", type: ChannelType.GuildText },
    { key: "events", name: "event-board", type: ChannelType.GuildText },
    { key: "leaderboard", name: "leaderboard", type: ChannelType.GuildText }
  ],
  music: [
    { key: "musicCommands", name: "music-commands", type: ChannelType.GuildText, panel: "music" },
    { key: "nowPlaying", name: "now-playing", type: ChannelType.GuildText },
    { key: "djRoom", name: "dj-room", type: ChannelType.GuildText }
  ],
  voice: [
    { key: "joinToCreate", name: "Join to Create", type: ChannelType.GuildVoice },
    { key: "chill", name: "Chill Room", type: ChannelType.GuildVoice },
    { key: "lateNight", name: "Late Night", type: ChannelType.GuildVoice },
    { key: "stream", name: "Stream Room", type: ChannelType.GuildVoice }
  ],
  support: [
    { key: "openTicket", name: "open-ticket", type: ChannelType.GuildText, panel: "ticket" },
    { key: "transcripts", name: "ticket-transcripts", type: ChannelType.GuildText, staffOnly: true }
  ],
  staff: [
    { key: "staffChat", name: "staff-chat", type: ChannelType.GuildText, panel: "staff", staffOnly: true },
    { key: "modActions", name: "mod-actions", type: ChannelType.GuildText, staffOnly: true },
    { key: "logs", name: "server-logs", type: ChannelType.GuildText, staffOnly: true },
    { key: "botControl", name: "bot-control", type: ChannelType.GuildText, staffOnly: true }
  ]
} satisfies Record<LegacyCategoryKey, ChannelSpec[]>;

const crisscrossCategories: CategorySpec[] = [
  {
    key: "gate",
    name: "⊗— [ GATE WAY ] —⊗",
    channels: [
      { key: "start", name: "✠・welcome", type: ChannelType.GuildText, panel: "welcome" },
      { key: "rules", name: "✠・rules", type: ChannelType.GuildText, panel: "rules" },
      { key: "roles", name: "✠・self_roles", type: ChannelType.GuildText, panel: "roles" },
      { key: "gameRoles", name: "✠・game_roles", type: ChannelType.GuildText },
      { key: "invites", name: "✠・invites", type: ChannelType.GuildText }
    ]
  },
  {
    key: "important",
    name: "⊗— [ IMPORTANT ] —⊗",
    channels: [
      { key: "announcements", name: "✠・announcements", type: ChannelType.GuildAnnouncement },
      { key: "socialMedia", name: "✠・social-media", type: ChannelType.GuildAnnouncement },
      { key: "ytNotify", name: "✠・yt_notify", type: ChannelType.GuildAnnouncement },
      { key: "giveaways", name: "✠・giveaway", type: ChannelType.GuildAnnouncement }
    ]
  },
  {
    key: "ownersCabin",
    name: "⊗— [ OWNERS CABIN ] —⊗",
    ownerOnly: true,
    channels: [
      { key: "ownerVc", name: "⌑・Owner Vc", type: ChannelType.GuildVoice },
      { key: "liveVc", name: "⌑・Live Vc", type: ChannelType.GuildVoice },
      { key: "communityMeetings", name: "⌑・Community Meetings", type: ChannelType.GuildVoice },
      { key: "waitingVc", name: "⌑・Waiting Vc", type: ChannelType.GuildVoice }
    ]
  },
  {
    key: "general",
    name: "⊗— [ GENERAL ] —⊗",
    channels: [
      { key: "chat", name: "☼・general_chat", type: ChannelType.GuildText },
      { key: "musicCommands", name: "☼・bot_commands!!", type: ChannelType.GuildText, panel: "music" },
      { key: "media", name: "☼・media!!", type: ChannelType.GuildText },
      { key: "chillVc", name: "☼・Chill Vc", type: ChannelType.GuildVoice },
      { key: "generalVc", name: "☼・General Vc", type: ChannelType.GuildVoice }
    ]
  },
  {
    key: "spotlightNetwork",
    name: "⊗— [ SPOTLIGHT NETWORK ] —⊗",
    channels: [
      { key: "liveUpdates", name: "⚡・live-updates", type: ChannelType.GuildAnnouncement },
      { key: "spotlightAnnouncements", name: "📣・spotlight-announcements", type: ChannelType.GuildAnnouncement },
      { key: "matchResults", name: "🏆・match-results", type: ChannelType.GuildAnnouncement },
      { key: "clutchMoments", name: "🔥・clutch-moments", type: ChannelType.GuildAnnouncement },
      { key: "highlights", name: "🎯・highlights", type: ChannelType.GuildAnnouncement },
      { key: "dramaAlert", name: "🚨・drama-alert", type: ChannelType.GuildAnnouncement },
      { key: "spotlightCollabs", name: "🤝・spotlight-collabs", type: ChannelType.GuildAnnouncement }
    ]
  },
  {
    key: "spotlightCreativity",
    name: "⊗— [ SPOTLIGHT CREATIVITY ] —⊗",
    channels: [
      { key: "creativesAnnouncements", name: "📣・creatives-announcements", type: ChannelType.GuildAnnouncement },
      { key: "brandCollabs", name: "🤝・brand-collabs", type: ChannelType.GuildAnnouncement },
      { key: "creatorManagement", name: "👑・creator-management", type: ChannelType.GuildAnnouncement },
      { key: "ugcCreators", name: "🏙️・ugc-creators", type: ChannelType.GuildAnnouncement },
      { key: "campaignLaunches", name: "🎯・campaign-launches", type: ChannelType.GuildAnnouncement },
      { key: "paidPromotions", name: "💼・paid-promotions", type: ChannelType.GuildAnnouncement },
      { key: "creatorGrowth", name: "📈・creator-growth", type: ChannelType.GuildAnnouncement },
      { key: "viralIdeas", name: "🔥・viral-ideas", type: ChannelType.GuildAnnouncement },
      { key: "mediaKits", name: "📁・media-kits", type: ChannelType.GuildAnnouncement },
      { key: "creativesVc", name: "💗・creatives-vc", type: ChannelType.GuildVoice, staffOnly: true }
    ]
  },
  {
    key: "spotlightStudio",
    name: "⊗— [ SPOTLIGHT STUDIO ] —⊗",
    channels: [
      { key: "studioAnnouncements", name: "📁・studio-announcements", type: ChannelType.GuildAnnouncement },
      { key: "gfxShowcase", name: "🎨・gfx-showcase", type: ChannelType.GuildAnnouncement },
      { key: "vfxShowcase", name: "🎥・vfx-showcase", type: ChannelType.GuildAnnouncement },
      { key: "thumbnailLab", name: "🖌️・thumbnail-lab", type: ChannelType.GuildAnnouncement },
      { key: "clientProjects", name: "📦・client-projects", type: ChannelType.GuildAnnouncement },
      { key: "editingDrops", name: "🚀・editing-drops", type: ChannelType.GuildAnnouncement },
      { key: "reelsProduction", name: "🎁・reels-production", type: ChannelType.GuildAnnouncement },
      { key: "portfolioWork", name: "📁・portfolio-work", type: ChannelType.GuildAnnouncement },
      { key: "contentIdeas", name: "💡・content-ideas", type: ChannelType.GuildAnnouncement },
      { key: "studioVc", name: "💗・studio-vc", type: ChannelType.GuildVoice, staffOnly: true }
    ]
  },
  {
    key: "gameTalk",
    name: "⊗— [ GAME TALK ] —⊗",
    channels: [
      { key: "duoOne", name: "❖・Duo¹", type: ChannelType.GuildVoice },
      { key: "duoTwo", name: "❖・Duo²", type: ChannelType.GuildVoice },
      { key: "trioOne", name: "❖・Trio¹", type: ChannelType.GuildVoice },
      { key: "trioTwo", name: "❖・Trio²", type: ChannelType.GuildVoice },
      { key: "squadOne", name: "❖・Squad¹", type: ChannelType.GuildVoice },
      { key: "squadTwo", name: "❖・Squad²", type: ChannelType.GuildVoice }
    ]
  },
  {
    key: "funZone",
    name: "⊗— [ FUN ZONE ] —⊗",
    channels: [{ key: "owo", name: "☠・owo", type: ChannelType.GuildText }]
  },
  {
    key: "peaceArea",
    name: "⊗— [ PEACE AREA ] —⊗",
    channels: [
      { key: "nowPlaying", name: "☼・music_cmd", type: ChannelType.GuildText, panel: "music" },
      { key: "musicVcOne", name: "☼・music vc", type: ChannelType.GuildVoice },
      { key: "musicVcTwo", name: "☼・music vc​", type: ChannelType.GuildVoice }
    ]
  },
  {
    key: "createTicket",
    name: "⊗— [ CREATE TICKET ] —⊗",
    channels: [{ key: "openTicket", name: "⚒・ticket", type: ChannelType.GuildText, panel: "ticket" }]
  }
];

function makeTemplate(theme: ThemeKey): ServerTemplate {
  const baseRoles: RoleSpec[] = [
    { key: "founder", name: "Founder", color: 0xffbf47, permissions: [PermissionFlagsBits.Administrator] },
    {
      key: "admin",
      name: "Admin",
      color: 0xff5d7d,
      permissions: [
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MoveMembers
      ]
    },
    {
      key: "moderator",
      name: "Moderator",
      color: 0x38dff8,
      permissions: [PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.MoveMembers]
    },
    { key: "dj", name: "DJ", color: 0xa7f950, permissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
    { key: "vip", name: "VIP", color: 0xa68bff },
    { key: "member", name: "Member", color: 0xffc1d8 },
    { key: "muted", name: "Muted", color: 0x6f3c28 }
  ];

  const variants: Record<ThemeKey, Omit<ServerTemplate, "roles" | "categories">> = {
    brownie: {
      key: "brownie",
      name: "blunt38 CRT",
      accent: 0x8f63c7,
      description: "Purple CRT community layout with polished onboarding, AI chat, music, tickets, and staff systems.",
      welcomeMessage: "Welcome {user} to {server}. Grab roles, read the map, then jump into main-chat.",
      aiPrompt: "Act like blunt38's sharp Gen Z community assistant. Be warm, quick, playful, and useful."
    },
    gaming: {
      key: "gaming",
      name: "Gaming Arena",
      accent: 0x8b5cf6,
      description: "Competitive neon layout for squads, events, clips, voice rooms, support, and DJ sessions.",
      welcomeMessage: "{user} entered {server}. Pick your loadout roles and meet the squad.",
      aiPrompt: "Act like a sharp gaming community co-host. Keep replies energetic, useful, and squad-friendly."
    },
    "soft-cute": {
      key: "soft-cute",
      name: "Soft Cute",
      accent: 0xffc1d8,
      description: "Soft community layout with pastel onboarding, cozy chat rooms, friendly AI, and gentle support flow.",
      welcomeMessage: "Welcome {user} to {server}. Get comfy, pick roles, and say hi when ready.",
      aiPrompt: "Act like a soft, friendly community bestie. Keep replies sweet, clear, and supportive."
    },
    "dark-luxury": {
      key: "dark-luxury",
      name: "Dark Luxury",
      accent: 0xffbf47,
      description: "Clean luxury layout for premium clients: controlled onboarding, private staff suite, support, and music.",
      welcomeMessage: "Welcome {user} to {server}. Start with the map, choose access roles, and enjoy the lounge.",
      aiPrompt: "Act like a polished premium concierge. Keep replies concise, stylish, and helpful."
    },
    crisscross: {
      key: "crisscross",
      name: "Crisscross",
      accent: 0xe64f4f,
      description: "A full creator-network hierarchy: locked owner cabins, community broadcast lanes, studio rooms, game VCs, music, and tickets.",
      welcomeMessage: "Welcome {user} to {server}. Read the rules, lock in your roles, then find your lane.",
      aiPrompt: "Act like blunt38's sharp Gen Z community assistant. Be warm, quick, playful, and useful.",
      rootChannels: [{ key: "permanentLink", name: "🚩・Permanent-link", type: ChannelType.GuildText }],
      panelTargets: {
        welcome: "start",
        rules: "rules",
        roles: "roles",
        ticket: "openTicket",
        music: "nowPlaying"
      },
      wiring: {
        welcomeChannel: "start",
        ticketCategory: "createTicket",
        tempVoiceJoinChannel: "waitingVc",
        tempVoiceCategory: "gameTalk",
        birthdayChannel: "spotlightAnnouncements",
        levelUpChannel: "highlights",
        aiResponderEnabled: false,
        levelingEnabled: true
      }
    }
  };

  const categoryNames: Record<Exclude<ThemeKey, "crisscross">, Record<LegacyCategoryKey, string>> = {
    brownie: {
      gate: "BLUNT38 GATE",
      lounge: "SIGNAL LOUNGE",
      events: "EVENTS AND XP",
      music: "MUSIC DECK",
      voice: "VOICE LOUNGE",
      support: "SUPPORT PORTAL",
      staff: "STAFF SUITE"
    },
    gaming: {
      gate: "ARENA SPAWN",
      lounge: "SQUAD LOUNGE",
      events: "EVENT CIRCUIT",
      music: "BATTLE RADIO",
      voice: "VOICE PARTY",
      support: "SUPPORT BAY",
      staff: "ADMIN TOWER"
    },
    "soft-cute": {
      gate: "WELCOME GARDEN",
      lounge: "COZY CAFE",
      events: "PARTY BOARD",
      music: "SONG CORNER",
      voice: "COMFY VOICE",
      support: "HELP DESK",
      staff: "STAFF NOOK"
    },
    "dark-luxury": {
      gate: "FIRST FLOOR",
      lounge: "MEMBER LOUNGE",
      events: "EVENT ATELIER",
      music: "AUDIO ROOM",
      voice: "PRIVATE VOICE",
      support: "CONCIERGE",
      staff: "CONTROL ROOM"
    }
  };

  if (theme === "crisscross") {
    return {
      ...variants.crisscross,
      roles: baseRoles,
      categories: crisscrossCategories
    };
  }

  return {
    ...variants[theme],
    roles: baseRoles,
    categories: (Object.keys(sharedChannels) as LegacyCategoryKey[]).map((key) => ({
      key,
      name: categoryNames[theme][key],
      channels: sharedChannels[key],
      staffOnly: key === "staff"
    }))
  };
}

function getTheme(interactionTheme: string | null): ThemeKey {
  if (
    interactionTheme === "gaming" ||
    interactionTheme === "soft-cute" ||
    interactionTheme === "dark-luxury" ||
    interactionTheme === "crisscross"
  ) return interactionTheme;
  return "brownie";
}

function roleLine(role: RoleSpec) {
  return `\`${role.name}\``;
}

function channelLine(channel: ChannelSpec) {
  return `\`${channel.name}\``;
}

function findRole(guild: Guild, name: string) {
  return guild.roles.cache.find((role) => role.name === name && !role.managed) ?? null;
}

function findCategory(guild: Guild, name: string) {
  return guild.channels.cache.find((channel): channel is CategoryChannel => channel.type === ChannelType.GuildCategory && channel.name === name) ?? null;
}

function findChildChannel(category: CategoryChannel, channel: ChannelSpec) {
  return category.children.cache.find((child) => child.name === channel.name && child.type === channel.type) ?? null;
}

function findRootChannel(guild: Guild, channel: ChannelSpec) {
  return guild.channels.cache.find((item) => item.parentId === null && item.name === channel.name && item.type === channel.type) ?? null;
}

function textChannel(channel: GuildBasedChannel | undefined): TextChannel | null {
  return channel?.type === ChannelType.GuildText ? channel : null;
}

function voiceChannel(channel: GuildBasedChannel | undefined): VoiceChannel | null {
  return channel?.type === ChannelType.GuildVoice ? channel : null;
}

function staffRoles(roles: Map<RoleKey, Role>) {
  return [roles.get("founder"), roles.get("admin"), roles.get("moderator")].filter((role): role is Role => Boolean(role));
}

function ownerRoles(roles: Map<RoleKey, Role>) {
  return [roles.get("founder"), roles.get("admin")].filter((role): role is Role => Boolean(role));
}

function privateChannelAccess(role: Role) {
  return {
    id: role.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak
    ]
  };
}

function categoryOverwrites(guild: Guild, category: CategorySpec, roles: Map<RoleKey, Role>) {
  const muted = roles.get("muted");
  const overwrites = [];

  if (category.ownerOnly || category.staffOnly) {
    overwrites.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
    for (const role of category.ownerOnly ? ownerRoles(roles) : staffRoles(roles)) {
      overwrites.push(privateChannelAccess(role));
    }
  }

  if (muted) {
    overwrites.push({
      id: muted.id,
      deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.Speak]
    });
  }

  return overwrites;
}

function channelOverwrites(guild: Guild, channel: ChannelSpec, roles: Map<RoleKey, Role>) {
  if (!channel.staffOnly) return undefined;

  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoles(roles).map(privateChannelAccess)
  ];
}

async function assertBotPermissions(member: GuildMember) {
  const required = [
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.ViewChannel
  ];

  const missing = required.filter((permission) => !member.permissions.has(permission));
  if (missing.length) {
    throw new Error("I need Manage Channels, Manage Roles, Send Messages, Embed Links, and View Channel permissions.");
  }
}

async function ensureRoles(guild: Guild, template: ServerTemplate) {
  await guild.roles.fetch();
  const roles = new Map<RoleKey, Role>();

  for (const spec of [...template.roles].reverse()) {
    const existing = findRole(guild, spec.name);
    if (existing) {
      roles.set(spec.key, existing);
      continue;
    }

    const created = await guild.roles.create({
      name: spec.name,
      color: spec.color,
      permissions: spec.permissions ?? [],
      reason: `${template.name} server builder`
    });
    roles.set(spec.key, created);
  }

  return roles;
}

async function ensureCategory(guild: Guild, template: ServerTemplate, spec: CategorySpec, roles: Map<RoleKey, Role>) {
  const existing = findCategory(guild, spec.name);
  if (existing) return existing;

  return guild.channels.create({
    name: spec.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: categoryOverwrites(guild, spec, roles),
    reason: `${template.name} server builder`
  });
}

async function ensureChannel(guild: Guild, template: ServerTemplate, category: CategoryChannel, spec: ChannelSpec, roles: Map<RoleKey, Role>) {
  const existing = findChildChannel(category, spec);
  if (existing) return { channel: existing, created: false };

  const channel = await guild.channels.create({
    name: spec.name,
    type: spec.type,
    parent: category.id,
    topic:
      spec.type === ChannelType.GuildText || spec.type === ChannelType.GuildAnnouncement
        ? `${buildMarker}; theme:${template.key}; key:${category.name}/${spec.name}`
        : undefined,
    permissionOverwrites: channelOverwrites(guild, spec, roles),
    reason: `${template.name} server builder`
  });

  return { channel, created: true };
}

async function ensureRootChannel(guild: Guild, template: ServerTemplate, spec: ChannelSpec, roles: Map<RoleKey, Role>) {
  const existing = findRootChannel(guild, spec);
  if (existing) return { channel: existing, created: false };

  const channel = await guild.channels.create({
    name: spec.name,
    type: spec.type,
    topic:
      spec.type === ChannelType.GuildText || spec.type === ChannelType.GuildAnnouncement
        ? `${buildMarker}; theme:${template.key}; key:root/${spec.name}`
        : undefined,
    permissionOverwrites: channelOverwrites(guild, spec, roles),
    reason: `${template.name} server builder`
  });

  return { channel, created: true };
}

async function buildLayout(guild: Guild, template: ServerTemplate) {
  await guild.channels.fetch();
  const roles = await ensureRoles(guild, template);
  const categories = new Map<CategoryKey, CategoryChannel>();
  const channels = new Map<ChannelKey, GuildBasedChannel>();
  const createdChannelKeys = new Set<ChannelKey>();

  for (const channelSpec of template.rootChannels ?? []) {
    const result = await ensureRootChannel(guild, template, channelSpec, roles);
    channels.set(channelSpec.key, result.channel);
    if (result.created) createdChannelKeys.add(channelSpec.key);
  }

  for (const categorySpec of template.categories) {
    const category = await ensureCategory(guild, template, categorySpec, roles);
    categories.set(categorySpec.key, category);

    for (const channelSpec of categorySpec.channels) {
      const result = await ensureChannel(guild, template, category, channelSpec, roles);
      channels.set(channelSpec.key, result.channel);
      if (result.created) createdChannelKeys.add(channelSpec.key);
    }
  }

  return { roles, categories, channels, createdChannelKeys };
}

async function sendWelcomePanel(channel: TextChannel, template: ServerTemplate) {
  await channel.send({
    embeds: [
      panelEmbed(
        "Welcome",
        "START HERE",
        "This is the landing pad. Read the rules, pick roles, check the map, then enter the lounge.",
        template.accent
      ).addFields(
        { name: "Path", value: "`rules` -> `roles` -> `map` -> `main-chat`", inline: false },
        { name: "Vibe", value: template.description, inline: false }
      )
    ]
  });
}

async function sendRulesPanel(channel: TextChannel, template: ServerTemplate) {
  await channel.send({
    embeds: [
      panelEmbed("Rules And Safety", "SERVER CODE", "Keep the server clean, cozy, and useful.", template.accent).addFields(
        { name: "Respect", value: "No harassment, hate, raids, threats, or creepy behavior.", inline: false },
        { name: "Keep It Tidy", value: "Use the right channels. No spam, scam links, or loud self-promo.", inline: false },
        { name: "Staff Calls", value: "Staff decisions keep the community stable. Open a ticket if something needs review.", inline: false }
      )
    ]
  });
}

async function sendMapPanel(channel: TextChannel, template: ServerTemplate) {
  const lines = template.categories.map((category) => {
    return `**${category.name}**\n${category.channels.slice(0, 5).map((item) => `- ${item.name}`).join("\n")}`;
  });

  await channel.send({
    embeds: [panelEmbed("Server Map", "NAVIGATION", lines.join("\n\n"), template.accent)]
  });
}

async function sendRolePanel(channel: TextChannel, guildId: string, template: ServerTemplate, roles: Map<RoleKey, Role>) {
  const selectable = [roles.get("member"), roles.get("vip"), roles.get("dj")].filter((role): role is Role => Boolean(role));
  if (!selectable.length) return;

  const panel = await createRolePanel(guildId, "Choose Your Access", selectable.map((role) => role.id));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`roles:select:${panel.id}`)
    .setPlaceholder("Choose your server roles")
    .setMinValues(0)
    .setMaxValues(selectable.length)
    .addOptions(
      selectable.map((role, index) => ({
        label: role.name.slice(0, 100),
        value: role.id,
        description: ["Default community access", "Premium ping/access role", "Music control role"][index] ?? "Server role"
      }))
    );

  await channel.send({
    embeds: [
      panelEmbed("Choose Your Access", "ROLE VAULT", "Pick the roles that match how you want to use the server.", template.accent)
        .addFields({ name: "Available", value: selectable.map((role) => `${role}`).join("\n"), inline: false })
    ],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
  });
}

async function sendTicketPanel(channel: TextChannel, template: ServerTemplate) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:open").setLabel("Open Ticket").setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    embeds: [
      panelEmbed("Support Portal", "PRIVATE HELP", "Open a private support thread with staff.", template.accent).addFields(
        { name: "Flow", value: "`Open Ticket` -> `Choose Type` -> `Submit Details`", inline: false },
        { name: "Use For", value: "Support, partnerships, reports, purchases, and staff questions.", inline: false }
      )
    ],
    components: [row]
  });
}

async function sendMusicPanel(channel: TextChannel, template: ServerTemplate) {
  await channel.send({
    embeds: [
      panelEmbed("Music Deck", "AUDIO CONTROL", "Use `/music play` with a song name or supported link.", template.accent).addFields(
        { name: "Core", value: "`/music play` `/music queue` `/music nowplaying`", inline: false },
        { name: "Controls", value: "`pause` `resume` `skip` `stop` `loop` `volume`", inline: false },
        { name: "Spotify", value: "Track, playlist, and album links use Spotify metadata plus the existing yt-dlp resolver. Add Spotify credentials in the bot environment.", inline: false }
      )
    ]
  });
}

async function sendStaffPanel(channel: TextChannel, template: ServerTemplate) {
  await channel.send({
    embeds: [
      panelEmbed("Staff Control", "BACK OFFICE", "Private command center for moderation, logs, tickets, and bot setup.", template.accent).addFields(
        { name: "Useful Commands", value: "`/setup` `/moderate` `/ticket-panel` `/server cleanup`", inline: false },
        { name: "Voice Tools", value: "`/voice disconnect` works for allowlisted owners or staff with Move Members.", inline: false }
      )
    ]
  });
}

async function sendPanels(guildId: string, template: ServerTemplate, context: BuildContext) {
  const targets: Record<PanelKey, ChannelKey> = {
    welcome: "start",
    rules: "rules",
    map: "map",
    roles: "roles",
    ticket: "openTicket",
    music: "musicCommands",
    staff: "botControl"
  };
  Object.assign(targets, template.panelTargets);

  const roleChannel = textChannel(context.channels.get(targets.roles));
  const welcomeChannel = textChannel(context.channels.get(targets.welcome));
  const rulesChannel = textChannel(context.channels.get(targets.rules));
  const mapChannel = textChannel(context.channels.get(targets.map));
  const ticketChannel = textChannel(context.channels.get(targets.ticket));
  const musicChannel = textChannel(context.channels.get(targets.music));
  const staffChannel = textChannel(context.channels.get(targets.staff) ?? context.channels.get("staffChat"));

  if (welcomeChannel && context.createdChannelKeys.has(targets.welcome)) await sendWelcomePanel(welcomeChannel, template);
  if (rulesChannel && context.createdChannelKeys.has(targets.rules)) await sendRulesPanel(rulesChannel, template);
  if (mapChannel && context.createdChannelKeys.has(targets.map)) await sendMapPanel(mapChannel, template);
  if (roleChannel && context.createdChannelKeys.has(targets.roles)) await sendRolePanel(roleChannel, guildId, template, context.roles);
  if (ticketChannel && context.createdChannelKeys.has(targets.ticket)) await sendTicketPanel(ticketChannel, template);
  if (musicChannel && context.createdChannelKeys.has(targets.music)) await sendMusicPanel(musicChannel, template);
  if (staffChannel && (context.createdChannelKeys.has(targets.staff) || context.createdChannelKeys.has("staffChat"))) {
    await sendStaffPanel(staffChannel, template);
  }
}

async function wireBotConfig(guildId: string, template: ServerTemplate, context: BuildContext) {
  const wiring = template.wiring;

  await updateGuildConfig(guildId, {
    welcomeChannelId: textChannel(context.channels.get(wiring?.welcomeChannel ?? "start"))?.id,
    welcomeMessage: template.welcomeMessage,
    logChannelId: wiring?.logChannel ? textChannel(context.channels.get(wiring.logChannel))?.id : textChannel(context.channels.get("logs"))?.id,
    ticketCategoryId: context.categories.get(wiring?.ticketCategory ?? "support")?.id,
    supportRoleId: context.roles.get("moderator")?.id,
    verifiedRoleId: context.roles.get("member")?.id,
    autoRoleId: context.roles.get("member")?.id,
    tempVoiceJoinChannelId: voiceChannel(context.channels.get(wiring?.tempVoiceJoinChannel ?? "joinToCreate"))?.id,
    tempVoiceCategoryId: context.categories.get(wiring?.tempVoiceCategory ?? "voice")?.id,
    birthdayChannelId: wiring?.birthdayChannel ? context.channels.get(wiring.birthdayChannel)?.id : textChannel(context.channels.get("events"))?.id,
    levelingEnabled: wiring?.levelingEnabled ?? true,
    levelUpChannelId: wiring?.levelUpChannel ? context.channels.get(wiring.levelUpChannel)?.id : textChannel(context.channels.get("leaderboard"))?.id,
    aiResponderEnabled: wiring?.aiResponderEnabled ?? true,
    aiResponderChannelId: wiring?.aiResponderChannel ? textChannel(context.channels.get(wiring.aiResponderChannel))?.id : textChannel(context.channels.get("ai"))?.id,
    aiResponderPrompt: template.aiPrompt,
    aiResponderPersona: "genz-girl",
    musicDjRoleId: context.roles.get("dj")?.id,
    musicDefaultVolume: 80,
    musicAutoplayEnabled: false,
    accentColor: template.accent
  });
}

async function preview(interaction: Parameters<Command["execute"]>[0]) {
  const template = makeTemplate(getTheme(interaction.options.getString("theme")));
  const categoryLines = template.categories.map((category) => {
    return `**${category.name}** - ${category.channels.slice(0, 5).map(channelLine).join(" ")}`;
  });
  const rootLines = (template.rootChannels ?? []).map(channelLine);

  await interaction.reply({
    embeds: [
      embed("Server Builder Preview", template.description, template.accent).addFields(
        { name: "Theme", value: `\`${template.name}\``, inline: true },
        { name: "Roles", value: template.roles.map(roleLine).join(" "), inline: false },
        ...(rootLines.length ? [{ name: "Top Level", value: rootLines.join(" "), inline: false }] : []),
        { name: "Layout", value: categoryLines.join("\n"), inline: false },
        { name: "Build Command", value: `Run \`/server build theme:${template.key}\` when ready.`, inline: false }
      )
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function build(interaction: Parameters<Command["execute"]>[0]) {
  if (!interaction.guild || !interaction.guildId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const template = makeTemplate(getTheme(interaction.options.getString("theme")));
  const me = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();

  try {
    await assertBotPermissions(me);
    const needsCommunity = template.categories.some((category) =>
      category.channels.some((channel) => channel.type === ChannelType.GuildAnnouncement)
    );
    if (needsCommunity && !interaction.guild.features.includes("COMMUNITY")) {
      throw new Error("Crisscross uses Discord Announcement Channels. Enable Community in Server Settings, then run this build again.");
    }

    const context = await buildLayout(interaction.guild, template);
    await sendPanels(interaction.guildId, template, context);
    await wireBotConfig(interaction.guildId, template, context);

    const configured = ["welcome", "tickets", "temp VC", "leveling", "music"];
    if (template.wiring?.aiResponderEnabled ?? true) configured.push("AI");
    if (!template.wiring || template.wiring.logChannel || template.key !== "crisscross") configured.push("logs");

    await interaction.editReply({
      embeds: [
        embed("Server Build Complete", "Premium server layout created and blunt38 systems wired.", template.accent).addFields(
          { name: "Theme", value: `\`${template.name}\``, inline: true },
          { name: "Created Channels", value: `\`${context.createdChannelKeys.size}\``, inline: true },
          { name: "Configured", value: configured.map((item) => `\`${item}\``).join(" "), inline: false }
        )
      ]
    });
  } catch (error) {
    await interaction.editReply(error instanceof Error ? error.message : "Server build failed.");
  }
}

async function cleanup(interaction: Parameters<Command["execute"]>[0]) {
  if (!interaction.guild || !interaction.guildId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const template = makeTemplate(getTheme(interaction.options.getString("theme")));
  const deletedChannels: string[] = [];
  const deletedRoles: string[] = [];
  const skippedRoles: string[] = [];

  await interaction.guild.channels.fetch();
  await interaction.guild.roles.fetch();

  for (const channelSpec of template.rootChannels ?? []) {
    const channel = findRootChannel(interaction.guild, channelSpec);
    if (!channel) continue;

    const isMarkedText =
      (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
      Boolean(channel.topic?.includes(buildMarker));
    const isTemplateVoice = channel.type === ChannelType.GuildVoice;
    if (!isMarkedText && !isTemplateVoice) continue;

    await channel.delete(`${template.name} server cleanup`).catch(() => null);
    deletedChannels.push(channel.name);
  }

  for (const categorySpec of [...template.categories].reverse()) {
    const category = findCategory(interaction.guild, categorySpec.name);
    if (!category) continue;

    for (const channelSpec of categorySpec.channels) {
      const channel = findChildChannel(category, channelSpec);
      if (!channel) continue;

      const isMarkedText =
        (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
        Boolean(channel.topic?.includes(buildMarker));
      const isTemplateVoice = channel.type === ChannelType.GuildVoice;
      if (!isMarkedText && !isTemplateVoice) continue;

      await channel.delete(`${template.name} server cleanup`).catch(() => null);
      deletedChannels.push(channel.name);
    }

    if (!category.children.cache.size) {
      await category.delete(`${template.name} server cleanup`).catch(() => null);
      deletedChannels.push(category.name);
    }
  }

  for (const roleSpec of [...template.roles].reverse()) {
    const role = findRole(interaction.guild, roleSpec.name);
    if (!role) continue;

    if (role.members.size > 0) {
      skippedRoles.push(role.name);
      continue;
    }

    await role.delete(`${template.name} server cleanup`).catch(() => null);
    deletedRoles.push(role.name);
  }

  await updateGuildConfig(interaction.guildId, {
    welcomeChannelId: undefined,
    logChannelId: undefined,
    ticketCategoryId: undefined,
    supportRoleId: undefined,
    verifiedRoleId: undefined,
    autoRoleId: undefined,
    tempVoiceJoinChannelId: undefined,
    tempVoiceCategoryId: undefined,
    birthdayChannelId: undefined,
    levelingEnabled: false,
    levelUpChannelId: undefined,
    aiResponderEnabled: false,
    aiResponderChannelId: undefined,
    musicDjRoleId: undefined
  });

  await interaction.editReply({
    embeds: [
      embed("Server Cleanup Complete", "Removed marked builder channels and unused builder roles.", palette.warning).addFields(
        { name: "Deleted Channels/Categories", value: deletedChannels.length ? deletedChannels.map((name) => `\`${name}\``).join(" ") : "`none`", inline: false },
        { name: "Deleted Empty Roles", value: deletedRoles.length ? deletedRoles.map((name) => `\`${name}\``).join(" ") : "`none`", inline: false },
        { name: "Skipped Roles With Members", value: skippedRoles.length ? skippedRoles.map((name) => `\`${name}\``).join(" ") : "`none`", inline: false }
      )
    ]
  });
}

export const serverBuilderCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Preview, build, or clean a premium Discord server layout.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("preview")
        .setDescription("Preview a premium server build.")
        .addStringOption((option) =>
          option
            .setName("theme")
            .setDescription("Premium server theme.")
            .addChoices(...themeChoices)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("build")
        .setDescription("Build the premium server layout.")
        .addStringOption((option) =>
          option
            .setName("theme")
            .setDescription("Premium server theme.")
            .addChoices(...themeChoices)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cleanup")
        .setDescription("Remove marked channels from a server builder theme.")
        .addStringOption((option) =>
          option
            .setName("theme")
            .setDescription("Premium server theme.")
            .addChoices(...themeChoices)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "preview") return preview(interaction);
    if (subcommand === "build") return build(interaction);
    if (subcommand === "cleanup") return cleanup(interaction);
  }
};
