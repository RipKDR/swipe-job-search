import type { Session } from '@supabase/supabase-js';

export type AuthCallbackParams = {
  code?: string;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
  type?: string;
};

export type AuthCallbackClient = {
  auth: {
    exchangeCodeForSession: (
      code: string
    ) => Promise<{ data: { session: Session | null }; error: { message: string } | null }>;
    setSession: (tokens: {
      access_token: string;
      refresh_token: string;
    }) => Promise<{ data: { session: Session | null }; error: { message: string } | null }>;
    getSession: () => Promise<{ data: { session: Session | null } }>;
  };
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseAuthCallbackParams(
  params: Record<string, string | string[] | undefined>
): AuthCallbackParams {
  return {
    code: firstParam(params.code),
    access_token: firstParam(params.access_token),
    refresh_token: firstParam(params.refresh_token),
    error: firstParam(params.error),
    error_description: firstParam(params.error_description),
    type: firstParam(params.type),
  };
}

export function parseAuthCallbackUrl(url: string): AuthCallbackParams {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return {};

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(url.slice(queryIndex + 1));
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return parseAuthCallbackParams(params);
}

export async function completeAuthCallback(
  client: AuthCallbackClient,
  params: AuthCallbackParams
): Promise<{ session: Session | null; error: string | null }> {
  if (params.type === 'recovery') {
    return { session: null, error: 'Password recovery not yet implemented' };
  }

  if (params.error) {
    return { session: null, error: params.error_description ?? params.error };
  }

  if (params.code) {
    const { data, error } = await client.auth.exchangeCodeForSession(params.code);
    if (error) return { session: null, error: error.message };
    return { session: data.session, error: null };
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await client.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) return { session: null, error: error.message };
    return { session: data.session, error: null };
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (session) return { session, error: null };

  return { session: null, error: 'No session found. Please try again.' };
}
