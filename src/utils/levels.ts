export function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}

export function xpForNextLevel(level: number) {
  return (level + 1) ** 2 * 100;
}

export function randomXp() {
  return 15 + Math.floor(Math.random() * 11);
}
