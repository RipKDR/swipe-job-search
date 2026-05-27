/**
 * Expire Jobs Edge Function
 * 
 * Sets jobs to 'expired' status when expires_at passes
 * 
 * Triggered by:
 * - Cron: daily at 00:00 Australia/Melbourne
 * - Manual: HTTP POST
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Expire active jobs past their expires_at timestamp
    const { data: expired, error } = await supabase
      .from('jobs')
      .update({ 
        status: 'expired', 
        updated_at: new Date().toISOString() 
      })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id, title, employer_id')

    if (error) {
      throw error
    }

    console.log(`Expired ${expired?.length || 0} jobs`)

    // Optional: notify employers with interested candidates
    // for (const job of expired || []) {
    //   const { data: swipes } = await supabase
    //     .from('swipes')
    //     .select('id')
    //     .eq('job_id', job.id)
    //     .eq('direction', 'right')
    //
    //   if (swipes && swipes.length > 0) {
    //     // Enqueue notification to employer
    //   }
    // }

    return new Response(
      JSON.stringify({ 
        expired: expired?.length || 0,
        jobs: expired?.map(j => ({ id: j.id, title: j.title })) 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Expire jobs error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
