import { createClient } from "@supabase/supabase-js";

// Use SUPABASE_URL (server-side) or fall back to public URL
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Check if SUPABASE_SERVICE_ROLE_KEY is explicitly set
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
let supabaseKeyName = serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : "";

// If service role key not found, check alternatives in order of preference
const keyAlternatives = [
  { name: "SUPABASE_SERVICE_KEY", value: process.env.SUPABASE_SERVICE_KEY },
  { name: "SUPABASE_ANON_KEY", value: process.env.SUPABASE_ANON_KEY },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
];

// Select the first available key if service role key not found
let supabaseKey = serviceRoleKey;
if (!supabaseKey) {
  for (const alt of keyAlternatives) {
    if (alt.value) {
      supabaseKey = alt.value;
      supabaseKeyName = alt.name;
      break;
    }
  }
}

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not set. Set SUPABASE_URL in your .env.local for server-side Supabase access."
  );
}

if (!supabaseKey) {
  throw new Error(
    "No Supabase server-side key found. Set SUPABASE_SERVICE_ROLE_KEY in your .env.local file."
  );
}

// Log which key is being used (useful for debugging)
console.log(`Server using supabase key from: ${supabaseKeyName || "unknown"}`);

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false } // Avoid storing session for server client
});

// Export which env var name was selected (do NOT export the key itself)
export const supabaseServerKeyName = supabaseKeyName;
