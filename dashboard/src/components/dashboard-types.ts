import type { AiPersona, GuildConfig } from "@/lib/guild-config";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
};

export type MeResponse = {
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  guilds: Guild[];
};

export type Channel = {
  id: string;
  name: string;
  type: number;
};

export type Role = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

export type GuildPayload = {
  config: GuildConfig;
  channels: Channel[];
  roles: Role[];
};

export type PrimaryView = "home" | "automations" | "music" | "studio";

export type AutomationKey =
  | "ai"
  | "welcome"
  | "goodbye"
  | "roles"
  | "tickets"
  | "levels"
  | "voice"
  | "logs";

export const personaOptions: Array<{ key: AiPersona; label: string }> = [
  { key: "genz-girl", label: "Gen Z" },
  { key: "sassy", label: "Sassy" },
  { key: "default", label: "Chill" },
  { key: "professional", label: "Clean" }
];

export const colorOptions = [
  { label: "Moon Violet", value: 0x948ce8 },
  { label: "Ghost Teal", value: 0x53c9b8 },
  { label: "Wine Rose", value: 0xdb739e },
  { label: "Antique Gold", value: 0xd8ad5c },
  { label: "Moss Signal", value: 0x8abd82 },
  { label: "Night Orchid", value: 0xa17eca }
];

export function hexColor(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}

export function displayChannel(
  channels: Channel[],
  channelId: string | null | undefined
) {
  if (!channelId) return "Not configured";
  const channel = channels.find((item) => item.id === channelId);
  return channel ? `#${channel.name}` : "Channel unavailable";
}

export function displayRole(
  roles: Role[],
  roleId: string | null | undefined
) {
  if (!roleId) return "Not configured";
  const role = roles.find((item) => item.id === roleId);
  return role ? role.name : "Role unavailable";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function textChannels(channels: Channel[]) {
  return channels.filter((channel) => [0, 5, 15].includes(channel.type));
}

export function categoryChannels(channels: Channel[]) {
  return channels.filter((channel) => channel.type === 4);
}

export function voiceChannels(channels: Channel[]) {
  return channels.filter((channel) => [2, 13].includes(channel.type));
}
