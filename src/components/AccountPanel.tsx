import { useMemo, useState, type FormEvent } from 'react'
import type { AccountActionResult } from '../hooks/useAccount'
import type { SyncStatus } from '../hooks/useFieldState'

type AccountPanelProps = {
  isCloudConfigured: boolean
  configurationError: string
  isAccountLoading: boolean
  userEmail: string | null
  authError: string
  syncStatus: SyncStatus
  syncError: string
  lastSyncedAt: number | null
  onSignIn: (email: string, password: string) => Promise<AccountActionResult>
  onSignUp: (email: string, password: string) => Promise<AccountActionResult>
  onSignOut: () => Promise<AccountActionResult>
}

const getSyncLabel = (
  syncStatus: SyncStatus,
  syncError: string,
  lastSyncedAt: number | null
) => {
  if (syncStatus === 'loading') {
    return 'Loading your cloud workspace...'
  }
  if (syncStatus === 'saving') {
    return 'Saving to cloud...'
  }
  if (syncStatus === 'saved') {
    if (!lastSyncedAt) {
      return 'Synced to cloud'
    }
    return `Synced at ${new Date(lastSyncedAt).toLocaleTimeString()}`
  }
  if (syncStatus === 'error') {
    return syncError || 'Cloud sync failed.'
  }
  return 'Local-only mode'
}

export default function AccountPanel({
  isCloudConfigured,
  configurationError,
  isAccountLoading,
  userEmail,
  authError,
  syncStatus,
  syncError,
  lastSyncedAt,
  onSignIn,
  onSignUp,
  onSignOut,
}: AccountPanelProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [message, setMessage] = useState('')

  const syncLabel = useMemo(
    () => getSyncLabel(syncStatus, syncError, lastSyncedAt),
    [lastSyncedAt, syncError, syncStatus]
  )

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const runAuthAction = async (action: 'sign-in' | 'sign-up') => {
    const trimmedEmail = email.trim()
    setInlineError('')
    setMessage('')

    if (!isValidEmail(trimmedEmail)) {
      setInlineError('Enter a valid email address.')
      return
    }

    if (!password) {
      setInlineError('Enter your password.')
      return
    }

    if (action === 'sign-up' && password.length < 6) {
      setInlineError('Password must be at least 6 characters.')
      return
    }

    setIsSubmitting(true)

    const result =
      action === 'sign-in'
        ? await onSignIn(trimmedEmail, password)
        : await onSignUp(trimmedEmail, password)

    if (result.error) {
      setInlineError(result.error)
      setIsSubmitting(false)
      return
    }

    setMessage(result.message ?? (action === 'sign-in' ? 'Signed in.' : 'Account created.'))
    setPassword('')
    setIsSubmitting(false)
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await runAuthAction('sign-in')
  }

  const handleSignOut = async () => {
    setIsSubmitting(true)
    setInlineError('')
    setMessage('')
    const result = await onSignOut()
    if (result.error) {
      setInlineError(result.error)
    } else {
      setMessage('Logged out.')
      setPassword('')
    }
    setIsSubmitting(false)
  }

  if (!isCloudConfigured) {
    return (
      <div className="account-panel">
        <p className="account-title">Account</p>
        <p className="account-note">
          Account login unavailable. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
          enable cross-device sync.
        </p>
        {configurationError ? <p className="account-error">{configurationError}</p> : null}
      </div>
    )
  }

  if (isAccountLoading) {
    return (
      <div className="account-panel">
        <p className="account-title">Account</p>
        <p className="account-note">Loading account...</p>
      </div>
    )
  }

  return (
    <div className="account-panel">
      <p className="account-title">Account</p>

      {userEmail ? (
        <>
          <p className="account-note">
            Signed in as <strong>{userEmail}</strong>
          </p>
          <p className={`account-sync${syncStatus === 'error' ? ' is-error' : ''}`}>
            {syncLabel}
          </p>
          <button
            type="button"
            className="account-action"
            disabled={isSubmitting}
            onClick={handleSignOut}
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <form className="account-form" onSubmit={handleLoginSubmit}>
            <label className="sr-only" htmlFor="account-email">
              Email
            </label>
            <input
              id="account-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <label className="sr-only" htmlFor="account-password">
              Password
            </label>
            <input
              id="account-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <div className="account-form-actions">
              <button
                type="button"
                className="account-action"
                disabled={isSubmitting}
                onClick={() => void runAuthAction('sign-up')}
              >
                {isSubmitting ? 'Working...' : 'Sign up'}
              </button>
              <button type="submit" className="account-action" disabled={isSubmitting}>
                {isSubmitting ? 'Working...' : 'Log in'}
              </button>
            </div>
          </form>
        </>
      )}

      {authError ? <p className="account-error">{authError}</p> : null}
      {inlineError ? <p className="account-error">{inlineError}</p> : null}
      {message ? <p className="account-note">{message}</p> : null}
    </div>
  )
}
