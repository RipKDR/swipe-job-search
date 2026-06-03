/**
 * Supabase Auth (GoTrue) rate-limits magic-link OTP sends per email and IP.
 * Hosted projects typically allow a small number of OTP emails per hour; exceeding
 * that returns HTTP 429 regardless of client-side debouncing. OAuth (Google) avoids
 * this path during local dev.
 */
export const OTP_RESEND_COOLDOWN_MS = 60_000;

/** Client guard after 429 — server block may last longer; use Retry-After when present. */
export const OTP_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;

const STORAGE_KEY = 'hi-hired:otp-cooldown-until';

/** In-memory fallback when sessionStorage is unavailable (native). */
let memoryCooldownUntil = 0;

function readCooldownUntil(): number {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return memoryCooldownUntil;
    }
  }
  return memoryCooldownUntil;
}

function writeCooldownUntil(until: number): void {
  memoryCooldownUntil = until;
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (until <= Date.now()) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, String(until));
      }
    } catch {
      // ignore quota / private mode
    }
  }
}

export function getOtpCooldownUntil(): number {
  const until = readCooldownUntil();
  if (until <= Date.now()) {
    if (until > 0) writeCooldownUntil(0);
    return 0;
  }
  return until;
}

export function setOtpCooldown(durationMs: number): number {
  const until = Date.now() + Math.max(0, durationMs);
  writeCooldownUntil(until);
  return until;
}

export function getOtpCooldownRemainingMs(now = Date.now()): number {
  return Math.max(0, getOtpCooldownUntil() - now);
}

/** Parse Retry-After from Supabase AuthError when exposed (seconds or HTTP-date). */
export function parseRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as Record<string, unknown>;

  const direct = record.retryAfter ?? record.retry_after;
  if (typeof direct === 'number' && direct > 0) return direct * 1000;
  if (typeof direct === 'string') return parseRetryAfterValue(direct);

  const headers = record.headers;
  if (headers && typeof headers === 'object') {
    const h = headers as Record<string, unknown>;
    const value = h['retry-after'] ?? h['Retry-After'];
    if (typeof value === 'string' || typeof value === 'number') {
      return parseRetryAfterValue(String(value));
    }
  }

  return null;
}

function parseRetryAfterValue(value: string): number | null {
  const asSeconds = Number(value);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return asSeconds * 1000;
  }
  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return null;
}

export function formatRateLimitMessage(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  if (totalSec >= 60) {
    const minutes = Math.ceil(totalSec / 60);
    return `Too many attempts — wait ${minutes} minute${minutes === 1 ? '' : 's'} before trying again.`;
  }
  return `Too many attempts — wait ${totalSec} second${totalSec === 1 ? '' : 's'} before trying again.`;
}

export function formatResendWaitMessage(remainingMs: number): string {
  const sec = Math.ceil(remainingMs / 1000);
  return `Wait ${sec}s before requesting another magic link, or check your inbox.`;
}

export function formatButtonCountdown(remainingMs: number): string {
  const sec = Math.ceil(remainingMs / 1000);
  if (sec >= 60) {
    const min = Math.ceil(sec / 60);
    return `Wait ${min}m`;
  }
  return `Wait ${sec}s`;
}

export function resolveRateLimitCooldownMs(error: unknown): number {
  return parseRetryAfterMs(error) ?? OTP_RATE_LIMIT_COOLDOWN_MS;
}
