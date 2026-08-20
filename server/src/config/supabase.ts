import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Keep-alive ping to prevent cold starts (every 4 minutes)
let keepAliveInterval: NodeJS.Timeout | null = null;

// Custom fetch with timeout and retry logic
const fetchWithRetry = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const maxRetries = 1; // Reduced from 2 to prevent long waits
  const timeout = 45000; // Increased to 45 seconds (Supabase can be slow)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Log slow requests for debugging
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        const urlPath = typeof url === 'string' ? url.split('?')[0].split('/').pop() : 'unknown';
        console.log(`[Supabase] Slow request to ${urlPath}: ${duration}ms`);
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        const urlPath = typeof url === 'string' ? url.split('?')[0].split('/').pop() : 'unknown';
        console.error(`[Supabase] Request failed after ${attempt + 1} attempts to ${urlPath}:`, error.name || error.message);
        throw error;
      }

      // Wait before retrying (short delay)
      const delay = 1000;
      console.log(`[Supabase] Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
};

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    fetch: fetchWithRetry,
  },
});

// Keep-alive ping function
async function pingSupabase() {
  try {
    await supabase.from('tournaments').select('id').limit(1);
    return true;
  } catch {
    return false;
  }
}

// Start keep-alive ping to prevent Supabase cold starts
function startKeepAlive() {
  if (keepAliveInterval) return;

  // Initial ping
  pingSupabase().then((success) => {
    if (success) {
      console.log('[Supabase] Connection warmed up');
    }
  });

  // Ping every 4 minutes to keep connection warm
  keepAliveInterval = setInterval(() => {
    pingSupabase();
  }, 4 * 60 * 1000);
}

// Start keep-alive in non-test environments
if (process.env.NODE_ENV !== 'test') {
  startKeepAlive();
}

export default supabase;
