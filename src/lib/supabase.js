import { createClient } from '@supabase/supabase-js'

// Configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (.env.local locally, Vercel env vars when deployed).
// The anon key is meant to be public: access is limited by row level security (see supabase/checkins.sql).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
