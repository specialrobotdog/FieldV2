import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

const PROFILES_TABLE = 'profiles'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error'

export async function upsertProfile(user: User): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from(PROFILES_TABLE).upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to upsert profile: ${getErrorMessage(error)}`)
  }
}
