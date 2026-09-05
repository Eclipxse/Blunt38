export type MusicRecoveryJob = { readonly trackKey: string };

/** A late recovery may finish, but it must never take over a newer session. */
export class MusicRecoveryJobs {
  private readonly jobs = new WeakMap<object, MusicRecoveryJob>();

  begin(player: object, trackKey: string) {
    if (this.jobs.get(player)?.trackKey === trackKey) return null;
    const job = { trackKey };
    this.jobs.set(player, job);
    return job;
  }

  has(player: object) {
    return this.jobs.has(player);
  }

  isCurrent(player: object, job: MusicRecoveryJob) {
    return this.jobs.get(player) === job;
  }

  finish(player: object, job: MusicRecoveryJob) {
    if (this.isCurrent(player, job)) this.jobs.delete(player);
  }

  cancel(player: object) {
    this.jobs.delete(player);
  }
}

export function friendlyPlaybackFailure(detail: string) {
  if (/confirm.*not a bot|bot.?check|unusual traffic/i.test(detail)) {
    return "YouTube rejected this server with an anti-bot check. The fallback could not open the stream either. Try a different source; retrying this link repeatedly will not fix that restriction.";
  }
  if (/\b429\b|rate.?limit/i.test(detail)) {
    return "The music source rate-limited this server (HTTP 429). Try again later or choose a different source.";
  }
  if (/\b403\b|forbidden/i.test(detail)) {
    return "The music source rejected the audio stream (HTTP 403). It may be restricted or the stream link may have expired.";
  }
  if (/age.?restrict|copyright|not available|region/i.test(detail)) {
    return "That upload is restricted or unavailable to this music server. Try another upload or source.";
  }
  if (/oauth|sign.?in|login|authentication/i.test(detail)) {
    return "YouTube rejected the source's authentication. The server owner needs to check the source logs; this is not a Discord permission error.";
  }
  if (/timed?\s*out|timeout|stuck/i.test(detail)) {
    return "The audio source did not respond in time. Try another track or source.";
  }
  if (/all clients failed|page needs to be reloaded/i.test(detail)) {
    return "YouTube's playback clients could not open this stream, and no usable fallback was found. Try a different source.";
  }
  return "The music source could not open this audio stream. Try another track or source. Technical details are in the server logs.";
}
