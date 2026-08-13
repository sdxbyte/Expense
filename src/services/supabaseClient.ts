import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { createLocalAuthClient, getLocalSessionUser } from './localAuthClient';

const CUSTOM_SUPABASE_URL_KEY = 'ledger_custom_supabase_url';
const CUSTOM_SUPABASE_KEY_KEY = 'ledger_custom_supabase_key';

export function getSupabaseCredentials(): { url: string; key: string } {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = (metaEnv.VITE_SUPABASE_URL as string) || '';
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = localStorage.getItem(CUSTOM_SUPABASE_URL_KEY) || '';
  const storedKey = localStorage.getItem(CUSTOM_SUPABASE_KEY_KEY) || '';

  return {
    url: storedUrl || envUrl,
    key: storedKey || envKey,
  };
}

export function saveCustomSupabaseCredentials(url: string, key: string): void {
  if (url && key) {
    localStorage.setItem(CUSTOM_SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(CUSTOM_SUPABASE_KEY_KEY, key.trim());
  } else {
    localStorage.removeItem(CUSTOM_SUPABASE_URL_KEY);
    localStorage.removeItem(CUSTOM_SUPABASE_KEY_KEY);
  }
}

let supabaseInstance: SupabaseClient | null = null;
let currentInstanceConfig = '';

export function getSupabaseClient(): any {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    return createLocalAuthClient();
  }

  const configSignature = `${url}_${key}`;
  if (!supabaseInstance || currentInstanceConfig !== configSignature) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      currentInstanceConfig = configSignature;
    } catch (err) {
      console.error('Failed to initialize Supabase client, using local auth client fallback:', err);
      return createLocalAuthClient();
    }
  }

  return supabaseInstance;
}

export async function getCurrentSupabaseUser(): Promise<User | null> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    return getLocalSessionUser();
  }

  const client = getSupabaseClient();
  if (!client) return getLocalSessionUser();

  try {
    const { data } = await client.auth.getUser();
    return data.user || getLocalSessionUser();
  } catch (err) {
    return getLocalSessionUser();
  }
}
