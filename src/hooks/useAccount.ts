import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { upsertProfile } from '../cloud/profileApi'
import { isSupabaseConfigured, supabase } from '../cloud/supabase'

export type AccountActionResult = {
  error: string | null
  message?: string
}

const ACCOUNT_NOT_CONFIGURED_MESSAGE =
  'Cloud account sync is not configured for this deployment.'

export function useAccount() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) {
      return
    }

    let isDisposed = false

    const syncProfile = async (nextUser: User | null) => {
      if (!nextUser || isDisposed) {
        return
      }
      try {
        await upsertProfile(nextUser)
      } catch (error) {
        if (!isDisposed) {
          setAuthError(
            error instanceof Error ? error.message : 'Failed to initialize profile.'
          )
        }
      }
    }

    const init = async () => {
      const { data, error } = await client.auth.getSession()
      if (isDisposed) {
        return
      }

      if (error) {
        setAuthError(error.message)
      }
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      void syncProfile(currentUser)
      setIsLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      void syncProfile(currentUser)
      setAuthError('')
    })

    return () => {
      isDisposed = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AccountActionResult> => {
      if (!supabase) {
        return { error: ACCOUNT_NOT_CONFIGURED_MESSAGE }
      }

      setAuthError('')
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setAuthError(error.message)
        return { error: error.message }
      }

      return { error: null }
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string): Promise<AccountActionResult> => {
      if (!supabase) {
        return { error: ACCOUNT_NOT_CONFIGURED_MESSAGE }
      }

      setAuthError('')
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setAuthError(error.message)
        return { error: error.message }
      }

      if (!data.session) {
        return {
          error: null,
          message:
            'Check your email to confirm your account before signing in.',
        }
      }

      return { error: null }
    },
    []
  )

  const signOut = useCallback(async (): Promise<AccountActionResult> => {
    if (!supabase) {
      return { error: ACCOUNT_NOT_CONFIGURED_MESSAGE }
    }

    setAuthError('')
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthError(error.message)
      return { error: error.message }
    }

    return { error: null }
  }, [])

  return useMemo(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      user,
      authError,
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, user, authError, signIn, signUp, signOut]
  )
}
