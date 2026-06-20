import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Fail loudly at boot rather than silently misbehaving in production.
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'Set them in your backend .env (local) or Vercel project settings (production).'
  );
}

// This client uses the SERVICE ROLE key, which bypasses Row Level Security.
// It must NEVER be imported into any frontend code or sent to a browser.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
