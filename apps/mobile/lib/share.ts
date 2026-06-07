/**
 * Share library — constants, URL builders, and text formatters
 * for job sharing and invite/referral features.
 *
 * @see share-jordan-handoff.md §3.2
 */

// ── Constants ───────────────────────────────────────────

export const SHARE_URL_BASE = 'https://hihired.app';
export const APP_SCHEME = 'hihired://';
export const DAILY_SHARE_LIMIT = 30;

export const SHARE_TEXT_TEMPLATES = {
  job: {
    title: (title: string) => `Hi-Hired — ${title}`,
    subject: (title: string) => `${title} on Hi-Hired`,
    dialogTitle: 'Share this job',
    message: (params: {
      title: string;
      payDisplay: string;
      suburb: string;
      jobTypeLabel: string;
      sharerName?: string | null;
      deepLink: string;
      webLink: string;
    }): string => {
      const lines: string[] = [];
      if (params.sharerName) {
        lines.push(`👤 Shared by ${params.sharerName}`);
        lines.push('');
      }
      lines.push(
        `📋 Job: ${params.title}`,
        `💰 ${params.payDisplay || 'Rate not specified'}`,
        `📍 ${params.suburb}`,
        `🕒 ${params.jobTypeLabel}`,
        '',
        'Join Hi-Hired to browse local jobs:',
        params.deepLink,
        params.webLink,
      );
      return lines.join('\n');
    },
  },
  invite: {
    title: 'Join me on Hi-Hired',
    dialogTitle: 'Invite friends to Hi-Hired',
    subject: 'Join me on Hi-Hired',
    message: (params: {
      sharerName?: string | null;
      referralCode: string;
      deepLink: string;
      webLink: string;
    }): string => {
      const lines: string[] = [];
      lines.push(
        `${params.sharerName || 'Someone'} invited you to join Hi-Hired! 🎉`,
        '',
        'Find local casual and part-time jobs near you.',
        'Swipe through roles, apply in one tap, and chat with employers.',
        '',
        `Use my referral code: ${params.referralCode}`,
        '',
        'Download Hi-Hired:',
        params.webLink,
        '',
        `Or open the app: ${params.deepLink}`,
      );
      return lines.join('\n');
    },
  },
} as const;

// ── URL Builders ─────────────────────────────────────────

export function buildJobShareUrl(
  jobId: string,
  sharerId: string,
  shareToken: string,
): { appDeepLink: string; webFallback: string; fullUrl: string } {
  const appDeepLink = `${APP_SCHEME}job/${jobId}`;
  const webFallback = `${SHARE_URL_BASE}/job/${jobId}?ref=${sharerId}&stkn=${shareToken}`;
  return {
    appDeepLink,
    webFallback,
    fullUrl: webFallback,
  };
}

export function buildInviteShareUrl(
  referralCode: string,
  sharerId: string,
): { appDeepLink: string; webFallback: string; fullUrl: string } {
  const appDeepLink = `${APP_SCHEME}invite/${referralCode}`;
  const webFallback = `${SHARE_URL_BASE}/join?ref=${referralCode}&uid=${sharerId}`;
  return {
    appDeepLink,
    webFallback,
    fullUrl: webFallback,
  };
}

// ── Simple helpers (no RPC required) ─────────────────────

export function buildShareJobUrlSimple(jobId: string): string {
  return `${SHARE_URL_BASE}/job/${jobId}`;
}

export function buildShareJobText(
  title: string,
  employer: string,
  payRate: string,
  url: string,
): string {
  return `Check out this job on Hi-Hired! ${title} at ${employer} — ${payRate}\n\n${url}`;
}

export function buildInviteShareUrlSimple(code: string): string {
  return `${SHARE_URL_BASE}/invite/${code}`;
}

export function buildInviteShareText(code: string, url: string): string {
  return `Join me on Hi-Hired — an easy way to find casual work! Use my invite code: ${code}\n\n${url}`;
}

// ── Formatting ───────────────────────────────────────────

export function formatJobTypeLabel(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
