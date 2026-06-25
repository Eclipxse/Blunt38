export function safeChannelName(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return cleaned || "user";
}

export function parseDuration(input: string) {
  const match = input.trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  const ms = amount * multiplier;

  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms;
}

export function formatDuration(ms?: number) {
  if (!ms) return "n/a";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
