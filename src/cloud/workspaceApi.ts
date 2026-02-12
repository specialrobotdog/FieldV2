import type { FieldState } from '../types'
import { isFieldState } from '../storage'
import { supabase } from './supabase'

const USER_WORKSPACES_TABLE = 'user_workspaces'

type WorkspaceRow = {
  state: unknown
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error'

export async function loadCloudState(userId: string): Promise<FieldState | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(USER_WORKSPACES_TABLE)
    .select('state')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load cloud workspace: ${getErrorMessage(error)}`)
  }

  const row = data as WorkspaceRow | null
  if (!row || !isFieldState(row.state)) {
    return null
  }

  return row.state
}

export async function saveCloudState(userId: string, state: FieldState): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from(USER_WORKSPACES_TABLE).upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(`Failed to save cloud workspace: ${getErrorMessage(error)}`)
  }
}
