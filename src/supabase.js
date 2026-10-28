import { createClient } from '@supabase/supabase-js';

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(projectUrl && publicKey);
export const supabase = hasSupabaseConfig ? createClient(projectUrl, publicKey) : null;