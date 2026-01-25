import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  // Return null if Supabase is not configured (for local development without auth)
  if (!supabaseUrl || !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseAnonKey.includes('placeholder')) {
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export function isSupabaseConfigured() {
  return supabaseUrl && supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
}
