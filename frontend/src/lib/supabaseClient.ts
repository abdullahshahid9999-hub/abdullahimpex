import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in frontend/.env (see .env.example).'
  );
}

// IMPORTANT: this is the public ANON key, which is safe to ship to the
// browser by design. It is only ever used here for sign-in/sign-out.
// All actual data reads/writes go through the backend API (see lib/api.ts),
// which uses the secret service-role key on the server and is never
// exposed to this client.
export const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: true, persistSession: true },
});
