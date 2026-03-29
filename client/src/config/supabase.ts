import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vite env vars
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
// @ts-ignore - Vite env vars
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Image upload will be disabled.');
}

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const STORAGE_BUCKET = 'auction-uploads';

// Helper to get public URL for uploaded files
export function getPublicUrl(path: string): string {
  if (!supabaseClient) return '';
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Check if Supabase storage is available
export function isStorageAvailable(): boolean {
  return supabaseClient !== null;
}
