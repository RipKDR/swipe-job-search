# Notifications — Swipe Job Search

## 1. Notification Architecture

```
DB Event (Supabase)
  → Supabase Database Trigger
    → Supabase Edge Function
      → Notification Dispatcher
        ├── Push (OneSignal → APNs/FCM)
        ├── In-App (Supabase Realtime → client)
        └── Email (Resend)
```

**Notification providers:**
| Channel | Provider | When |
|---------|---------|------|
| Push (mobile) | OneSignal | App is backgrounded/closed |
| In-App | Supabase Realtime | App is open |
| Email | Resend | User hasn't opened app in 24h+ |

The dispatcher checks app presence before routing: if the user is connected via Supabase Realtime, send in-app only. Otherwise send push + queue email (with 2h delay to give push a chance to convert).

---

## 2. Notification Types & Triggers

### Candidate Notifications

| Event | Trigger | Message | Priority |
|-------|---------|---------|----------|
| New Match | Recruiter swipes right on candidate | "🎉 You matched with [Company]! Start chatting." | Critical |
| New Message | Recruiter sends message | "💬 [Company]: [message preview...]" | High |
| Super Apply received | Recruiter marks candidate as top pick | "⭐ [Company] marked you as a top pick!" | High |
| Trial Shift invite | Recruiter sends trial shift | "☕ [Company] invited you to a trial shift on [date]" | High |
| New jobs in area | Daily digest if < 10 swipes in 2 days | "🔥 47 new jobs near Carlton this week" | Low |
| Streak reminder | User hasn't opened app in 24h | "🔥 Keep your streak — 3 new barista roles just dropped" | Low |
| Application status | Job closed (candidate had right-swiped) | "ℹ️ [Job] at [Company] has been filled" | Low |

### Recruiter Notifications

| Event | Trigger | Message | Priority |
|-------|---------|---------|----------|
| New Match | Candidate swipes right + reciprocal | "🎉 New match for [Job Title]! [Candidate] is interested." | Critical |
| New Message | Candidate sends message | "💬 [Candidate]: [message preview...]" | High |
| Application surge | 10+ new right swipes in 1 hour | "📈 Your [Job] post is trending — 10 new applicants!" | Medium |
| Job expiring | 7 days until close date | "⏰ Your [Job] posting expires in 7 days — extend it?" | Medium |
| Unread matches | Matches not messaged in 48h | "👋 You have 3 matches waiting to hear from you" | Low |

### Provider (Asuria) Notifications

| Event | Trigger | Message | Priority |
|-------|---------|---------|----------|
| Compliance report ready | Weekly (Monday 8am AEDT) | "📋 Weekly activity report for your 12 candidates is ready" | High |
| Candidate milestone | Candidate gets hired | "🏆 [Candidate] has been hired by [Company]!" | High |
| Candidate inactive | Candidate < 5 swipes this week | "⚠️ [Candidate] has been inactive — may need check-in" | Medium |

---

## 3. Supabase Edge Function: `match-notification`

This is the most critical notification — fires immediately when a match is created.

### Database Trigger
```sql
-- Fires when a new row is inserted into matches table
create or replace function notify_on_match()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url := current_setting('app.edge_function_url') || '/match-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'match_id', new.id,
      'candidate_id', new.candidate_id,
      'job_id', new.job_id,
      'created_at', new.created_at
    )
  );
  return new;
end;
$$;

create trigger on_match_created
  after insert on matches
  for each row execute procedure notify_on_match();
```

### Edge Function (`supabase/functions/match-notification/index.ts`)
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { match_id, candidate_id, job_id } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch related data
  const [{ data: candidate }, { data: job }] = await Promise.all([
    supabase.from('profiles').select('push_token, email, full_name').eq('user_id', candidate_id).single(),
    supabase.from('jobs').select('title, company, recruiter_id').eq('id', job_id).single(),
  ])

  const { data: recruiter } = await supabase
    .from('profiles')
    .select('push_token, email, full_name')
    .eq('user_id', job.recruiter_id)
    .single()

  // Dispatch in parallel: push to both candidate and recruiter
  await Promise.all([
    sendPushNotification(candidate.push_token, {
      title: "It's a Match! 🎉",
      body: `You matched with ${job.company} for ${job.title}`,
      data: { type: 'match', match_id }
    }),
    sendPushNotification(recruiter.push_token, {
      title: "New Match! 🎉",
      body: `${candidate.full_name} matched with your ${job.title} role`,
      data: { type: 'match', match_id }
    }),
    // Realtime broadcast for in-app notification
    supabase.channel('matches').send({
      type: 'broadcast',
      event: 'new_match',
      payload: { match_id, candidate_id, job_id }
    })
  ])

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})

async function sendPushNotification(token: string | null, payload: object) {
  if (!token) return  // user hasn't granted push permission
  
  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: Deno.env.get('ONESIGNAL_APP_ID'),
      include_player_ids: [token],
      ...payload,
      ios_sound: 'match.caf',
      android_sound: 'match',
    })
  })
}
```

---

## 4. In-App Notification System

When the user is active in the app, push notifications are suppressed in favour of in-app toasts and badge updates.

### Realtime Subscription (Client)
```typescript
// hooks/useMatchListener.ts
export function useMatchListener(userId: string) {
  const router = useRouter()
  
  useEffect(() => {
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `candidate_id=eq.${userId}`,
      }, (payload) => {
        showMatchOverlay(payload.new.id)  // full-screen match celebration
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        showToast(`New message`, 'info')
        updateUnreadBadge()
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [userId])
}
```

---

## 5. Email Notifications (Re-engagement)

Powered by **Resend** + React Email templates. Only sent if push notification not opened within 2 hours.

### Triggers & Templates

| Template | Subject | Send Condition |
|----------|---------|---------------|
| `match-email` | "You have a new match on Swipe Jobs! 🎉" | Push not opened in 2h |
| `weekly-digest` | "47 new jobs near you this week" | Every Monday 8am AEDT if DAU < 2 last week |
| `streak-break` | "Your streak is about to break 🔥" | 22h since last session, had a streak |
| `hired-congrats` | "Congratulations on your new role! 🏆" | `hire_confirmed` event |

### Email Setup
```typescript
// supabase/functions/send-email/index.ts
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'Swipe Jobs <hello@swipejobs.com.au>',
  to: recipientEmail,
  subject: '🎉 You have a new match!',
  react: MatchEmailTemplate({ candidateName, jobTitle, company, matchId })
})
```

---

## 6. Notification Preferences

Users can manage notification preferences in Settings:

```
Notifications
─────────────
Matches           [ON]   ← never allow off for critical path
New Messages      [ON]
Trial Shift Invites [ON]
New Jobs Nearby   [ON]
Streak Reminders  [OFF by default]
Weekly Digest     [ON]

Email Notifications
───────────────────
When I haven't opened the app in 24h   [ON]
Weekly digest email                     [ON]
```

Preferences stored in `profiles.notification_prefs JSONB`. Edge functions check this before dispatching.

---

## 7. Streak Mechanic (Retention Engine)

The streak is a daily engagement loop. Inspired by Duolingo's streak.

- A **streak day** = at least 5 swipes made before midnight AEDT
- Streak displayed prominently on the deck: "🔥 4-day streak"
- At 22:00 AEDT: if no swipes today, send "Streak at risk!" push
- Streak broken → sympathetic message, not shame: "Your streak reset. Start a new one today?"
- Streak milestones: 7 days → "+2 Super Applies today", 30 days → profile "Active Seeker" badge

### Streak tracking (Supabase)
```sql
create table streaks (
  user_id uuid references profiles(user_id) primary key,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  updated_at timestamptz default now()
);

-- Update streak after each swipe (via DB trigger or Edge Function)
```
