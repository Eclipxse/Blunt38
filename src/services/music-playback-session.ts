type PlaybackPreparation<T> = {
  acknowledged: Promise<unknown>;
  search: Promise<T>;
  connect: () => Promise<unknown>;
};

export async function prepareMusicRequest<T>({ acknowledged, search, connect }: PlaybackPreparation<T>): Promise<T> {
  const [result] = await Promise.all([search, acknowledged.then(connect)]);
  return result;
}

const commits = new WeakMap<object, Promise<void>>();

export function commitMusicRequest<T>(player: object, commit: () => Promise<T>): Promise<T> {
  const previous = commits.get(player) ?? Promise.resolve();
  const result = previous.then(commit);
  const settled = result.then(() => {}, () => {});
  commits.set(player, settled);
  void settled.then(() => {
    if (commits.get(player) === settled) commits.delete(player);
  });
  return result;
}
