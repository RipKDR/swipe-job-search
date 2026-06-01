import { describe, expect, it, vi } from 'vitest';
import {
  buildCompliancePdfFilename,
  buildCompliancePdfUrl,
  extractComplianceApiErrorMessage,
  downloadCompliancePdfNative,
} from '@/lib/compliance';

describe('compliance helpers', () => {
  it('builds stable PDF filenames', () => {
    expect(buildCompliancePdfFilename('report-123')).toBe(
      'compliance-report-123.pdf',
    );
  });

  it('builds PDF URLs without trailing slash on API base', () => {
    expect(buildCompliancePdfUrl('http://localhost:8000', 'report-123')).toBe(
      'http://localhost:8000/api/v1/compliance/reports/report-123/pdf',
    );
  });

  it('builds PDF URLs with trailing slash on API base', () => {
    expect(
      buildCompliancePdfUrl('http://localhost:8000/', 'report-123'),
    ).toBe(
      'http://localhost:8000/api/v1/compliance/reports/report-123/pdf',
    );
  });

  it('extracts structured FastAPI app errors', () => {
    expect(
      extractComplianceApiErrorMessage(
        { error: { code: 'INVALID_STATE', message: 'Report is not completed' } },
        'Fallback',
      ),
    ).toBe('Report is not completed');
  });

  it('extracts legacy FastAPI detail errors', () => {
    expect(
      extractComplianceApiErrorMessage({ detail: 'Candidate not found' }, 'Fallback'),
    ).toBe('Candidate not found');
  });

  it('falls back for unknown error payloads', () => {
    expect(extractComplianceApiErrorMessage({ nope: true }, 'Fallback')).toBe(
      'Fallback',
    );
    expect(extractComplianceApiErrorMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('downloads and shares a native PDF with injected Expo modules', async () => {
    const downloadAsync = vi
      .fn()
      .mockResolvedValue({ uri: 'file:///cache/compliance-1.pdf' });
    const isAvailableAsync = vi.fn().mockResolvedValue(true);
    const shareAsync = vi.fn().mockResolvedValue(undefined);

    const result = await downloadCompliancePdfNative({
      apiBase: 'http://localhost:8000',
      reportId: '1',
      token: 'jwt-token',
      fileSystem: {
        cacheDirectory: 'file:///cache/',
        downloadAsync,
      },
      sharing: {
        isAvailableAsync,
        shareAsync,
      },
    });

    expect(result.localUri).toBe('file:///cache/compliance-1.pdf');
    expect(result.shared).toBe(true);
    expect(downloadAsync).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/compliance/reports/1/pdf',
      'file:///cache/compliance-1.pdf',
      { headers: { Authorization: 'Bearer jwt-token' } },
    );
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/compliance-1.pdf');
  });

  it('does not fail when native sharing is unavailable', async () => {
    const result = await downloadCompliancePdfNative({
      apiBase: 'http://localhost:8000',
      reportId: '1',
      token: 'jwt-token',
      fileSystem: {
        cacheDirectory: 'file:///cache/',
        downloadAsync: vi
          .fn()
          .mockResolvedValue({ uri: 'file:///cache/compliance-1.pdf' }),
      },
      sharing: {
        isAvailableAsync: vi.fn().mockResolvedValue(false),
        shareAsync: vi.fn(),
      },
    });

    expect(result.shared).toBe(false);
  });

  it('throws when cache directory is unavailable', async () => {
    await expect(
      downloadCompliancePdfNative({
        apiBase: 'http://localhost:8000',
        reportId: '1',
        token: 'jwt-token',
        fileSystem: {
          cacheDirectory: null,
          downloadAsync: vi.fn(),
        },
        sharing: {
          isAvailableAsync: vi.fn(),
          shareAsync: vi.fn(),
        },
      }),
    ).rejects.toThrow('PDF download cache is unavailable on this device.');
  });
});
