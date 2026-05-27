# Swipe Job Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional "Tinder-for-Jobs" MVP with swiping, applications, and basic match logic.

**Architecture:** Next.js + Supabase. Heavy focus on Framer Motion for the gesture-based UI.

**Tech Stack:** Next.js, TypeScript, Tailwind, Framer Motion, Supabase.

---

### Task 1: Project Setup & Supabase Migration

**Files:**
- Create: `supabase/migrations/20260526_init.sql`
- Create: `.env.local`

- [ ] **Step 1: Initialize local setup**
Run: `npm create next-app@latest . --typescript --tailwind --app`

- [ ] **Step 2: Create Supabase Schema**
```sql
-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('candidate', 'recruiter')),
  name text,
  bio text,
  avatar_url text,
  updated_at timestamp with time zone default now()
);

-- Jobs table
create table jobs (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references profiles(id),
  title text,
  company text,
  location text,
  salary text,
  description text,
  images text[]
);

-- Swipes table
create table swipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  job_id uuid references jobs(id),
  direction text check (direction in ('left', 'right')),
  created_at timestamp with time zone default now(),
  unique(user_id, job_id)
);
```

- [ ] **Step 3: Setup Env**
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

### Task 2: The Swipe Logic (Framer Motion)

**Files:**
- Create: `components/SwipeDeck.tsx`
- Create: `components/JobCard.tsx`

- [ ] **Step 1: Implement JobCard with Gestures**
```tsx
import { motion, useMotionValue, useTransform } from 'framer-motion';

export const JobCard = ({ job, onSwipe }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  return (
    <motion.div
      drag="x"
      style={{ x, rotate, opacity }}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onSwipe('right');
        else if (info.offset.x < -100) onSwipe('left');
      }}
      className="absolute w-80 h-96 bg-white rounded-xl shadow-xl p-4 cursor-grab active:cursor-grabbing border text-black"
    >
      <img src={job.images[0]} className="h-48 w-full object-cover rounded-lg" />
      <h2 className="text-xl font-bold mt-2">{job.title}</h2>
      <p className="text-gray-600">{job.company}</p>
      <div className="mt-4 flex gap-2">
         <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{job.salary}</span>
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 2: Implement Deck State Management**
In `SwipeDeck.tsx`, manage an array of jobs. On swipe, pop the top job and call the Supabase `swipes` insert.

---

### Task 3: Application Flow & "Match" Logic

**Files:**
- Create: `app/api/swipe/route.ts`

- [ ] **Step 1: Create Swipe API**
Handle the insertion into the `swipes` table and check if the recruiter has a reciprocal interest (for future-proofing the match).

- [ ] **Step 2: Optimistic UI updates**
Ensure the card vanishes immediately, even if the database is slow.

---

### Task 4: Match View & Realtime Messaging

**Files:**
- Create: `app/matches/page.tsx`
- Create: `components/ChatRoom.tsx`

- [ ] **Step 1: Create Match List View**
Query the `matches` view in Supabase.
```tsx
const { data: matches } = await supabase
  .from('matches')
  .select('*, jobs(*), profiles(*)')
  .order('created_at', { ascending: false });
```

- [ ] **Step 2: Implement Realtime Chat Component**
```tsx
export const ChatRoom = ({ matchId }) => {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // 1. Initial Load
    // 2. Subscribe to new messages
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
       <div className="flex-1 overflow-y-auto p-4">
         {messages.map(m => <MessageBubble key={m.id} message={m} />)}
       </div>
       <ChatInput onSend={(text) => sendMessage(matchId, text)} />
    </div>
  );
};
```

- [ ] **Step 3: Add "It's a Match" Modal**
Create a visual overlay using `framer-motion` that triggers when a swipe results in a new match record.
