import { createClient } from '@supabase/supabase-js';

// The project URL and the public key (the anon / publishable one) come from .env.local. The public key is meant
// to ship inside an app: what a signed-in person can read or change is limited by row-level security in the database.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  url && key
    ? createClient(url, key, {
        // The session is kept in the app's own storage, so people stay signed in between launches.
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;
