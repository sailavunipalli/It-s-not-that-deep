// =========================================================
//   INTD — Supabase client (single source of truth)
//   The anon key is designed to be public. All actual access
//   control lives in Postgres Row Level Security, not here.
//   Rotate the key in one place: here.
// =========================================================

const SUPABASE_URL = "https://uydfxwnppzglcrxkaxlf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZGZ4d25wcHpnbGNyeGtheGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMjQxNjgsImV4cCI6MjEwNTgwMDE2OH0.zCRirCvgtB18lFgB0Q48eLSIbKTJvfaJlx-WIhrYNJI";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EVIDENCE_BUCKET = "evidence";
const GALLERY_BUCKET = "fly-images";
const MAX_GALLERY_IMAGES = 5;

// Avatars live under the user's own folder in GALLERY_BUCKET, matching the
// path shape the existing storage policies already allow. Promote to a
// dedicated 'avatars' bucket later if you want them separated at the
// storage layer.
const AVATAR_PREFIX = "avatars";
const DISPLAY_NAME_COOLDOWN_DAYS = 14;

// Shared HTML escaping. Every value rendered into innerHTML goes through this.
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
