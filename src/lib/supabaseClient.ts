import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const getMissingEnvMessage = () => {
  const missing: string[] = []
  if (!url) {
    missing.push('VITE_SUPABASE_URL')
  }
  if (!anonKey) {
    missing.push('VITE_SUPABASE_ANON_KEY')
  }
  return `Missing Supabase env var${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
}

export const createSupabaseClientOrThrow = (): SupabaseClient => {
  if (!url || !anonKey) {
    throw new Error(getMissingEnvMessage())
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

let supabaseClient: SupabaseClient | null = null
let supabaseConfigError: string | null = null

try {
  supabaseClient = createSupabaseClientOrThrow()
} catch (error) {
  supabaseConfigError =
    error instanceof Error
      ? error.message
      : 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
}

export const supabase = supabaseClient
export const isSupabaseConfigured = Boolean(supabaseClient)
export const supabaseConfigurationError = supabaseConfigError
