type ErrorPayload = {
  detail?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
};

type LegacyFileSystemModule = {
  cacheDirectory: string | null;
  downloadAsync: (
    uri: string,
    fileUri: string,
    options?: { headers?: Record<string, string> }
  ) => Promise<{ uri: string }>;
};

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (url: string) => Promise<void>;
};

export function buildCompliancePdfFilename(reportId: string): string {
  return `compliance-${reportId}.pdf`;
}

export function buildCompliancePdfUrl(apiBase: string, reportId: string): string {
  const base = apiBase.replace(/\/+$/, '');
  return `${base}/api/v1/compliance/reports/${encodeURIComponent(reportId)}/pdf`;
}

export function extractComplianceApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;

  const payload = body as ErrorPayload;
  if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
    return payload.error.message;
  }
  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail;
  }
  return fallback;
}

export async function downloadCompliancePdfNative(params: {
  apiBase: string;
  reportId: string;
  token: string;
  fileSystem: LegacyFileSystemModule;
  sharing: SharingModule;
}): Promise<{ localUri: string; shared: boolean }> {
  const { apiBase, reportId, token, fileSystem, sharing } = params;
  const cacheDirectory = fileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('PDF download cache is unavailable on this device.');
  }

  const localUri = `${cacheDirectory}${buildCompliancePdfFilename(reportId)}`;
  await fileSystem.downloadAsync(buildCompliancePdfUrl(apiBase, reportId), localUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const canShare = await sharing.isAvailableAsync();
  if (canShare) {
    await sharing.shareAsync(localUri);
  }

  return { localUri, shared: canShare };
}
