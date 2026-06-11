/**
 * delete-account Edge Function
 *
 * Permanently deletes the authenticated caller's account:
 *   1. Verifies the caller's JWT — only the account owner can delete it.
 *   2. Removes the user's storage objects (avatars + chat media) best-effort.
 *   3. Calls purge_user_data() to delete all DB rows referencing the profile.
 *   4. Deletes the auth.users row via the admin API.
 *
 * Required for App Store Guideline 5.1.1(v) and GDPR/APP right-to-erasure.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.2';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Authenticate the caller — the JWT is the only identity we trust.
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!jwt) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(jwt);

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401);
    }

    const userId = user.id;

    // 2. Best-effort storage cleanup (failures here must not block deletion).
    try {
      // Chat media referenced by the user's conversations
      const { data: matchRows } = await admin
        .from('matches')
        .select('id')
        .or(`candidate_id.eq.${userId},employer_id.eq.${userId}`);

      const matchIds = (matchRows ?? []).map((m: { id: string }) => m.id);
      if (matchIds.length > 0) {
        const { data: messageRows } = await admin
          .from('messages')
          .select('id')
          .in('match_id', matchIds);

        const messageIds = (messageRows ?? []).map((m: { id: string }) => m.id);
        if (messageIds.length > 0) {
          const { data: attachments } = await admin
            .from('message_attachments')
            .select('storage_path')
            .in('message_id', messageIds);

          const paths = (attachments ?? [])
            .map((a: { storage_path: string | null }) => a.storage_path)
            .filter((p: string | null): p is string => Boolean(p));
          if (paths.length > 0) {
            await admin.storage.from('chat-media').remove(paths);
          }
        }
      }

      // Avatars live under {userId}/...
      const { data: avatarFiles } = await admin.storage.from('avatars').list(userId);
      const avatarPaths = (avatarFiles ?? []).map(
        (f: { name: string }) => `${userId}/${f.name}`,
      );
      if (avatarPaths.length > 0) {
        await admin.storage.from('avatars').remove(avatarPaths);
      }
    } catch (storageErr) {
      console.error('[delete-account] storage cleanup failed (continuing):', storageErr);
    }

    // 3. Purge all DB rows referencing the profile.
    const { error: purgeError } = await admin.rpc('purge_user_data', {
      p_user_id: userId,
    });
    if (purgeError) {
      console.error('[delete-account] purge_user_data failed:', purgeError.message);
      return jsonResponse({ error: 'Failed to delete account data' }, 500);
    }

    // 4. Delete the auth user (sessions are revoked as part of this).
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[delete-account] auth deleteUser failed:', deleteError.message);
      return jsonResponse({ error: 'Failed to delete auth user' }, 500);
    }

    console.log(`[delete-account] account ${userId} deleted`);
    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error('[delete-account] unhandled error:', err);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
