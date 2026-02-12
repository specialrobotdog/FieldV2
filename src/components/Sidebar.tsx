import { useMemo, useState, type FormEvent } from 'react'
import type { Field, ImageItem } from '../types'
import type { AccountActionResult } from '../hooks/useAccount'
import type { SyncStatus } from '../hooks/useFieldState'
import AccountPanel from './AccountPanel'

type SidebarProps = {
  fields: Field[]
  images: ImageItem[]
  onAddField: (name?: string) => void
  onResetLibrary: () => void
  onRemoveField: (fieldId: string) => void
  account: {
    isCloudConfigured: boolean
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
}

const countImages = (fields: Field[], images: ImageItem[]) => {
  const counts = new Map<string, number>()
  fields.forEach((field) => counts.set(field.id, 0))
  images.forEach((image) => {
    counts.set(image.fieldId, (counts.get(image.fieldId) ?? 0) + 1)
  })
  return counts
}

export default function Sidebar({
  fields,
  images,
  onAddField,
  onResetLibrary,
  onRemoveField,
  account,
}: SidebarProps) {
  const [draft, setDraft] = useState('')
  const counts = useMemo(() => countImages(fields, images), [fields, images])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onAddField(draft.trim())
    setDraft('')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Field</h1>
        <p>Visual research workspace</p>
      </div>

      <AccountPanel
        isCloudConfigured={account.isCloudConfigured}
        isAccountLoading={account.isAccountLoading}
        userEmail={account.userEmail}
        authError={account.authError}
        syncStatus={account.syncStatus}
        syncError={account.syncError}
        lastSyncedAt={account.lastSyncedAt}
        onSignIn={account.onSignIn}
        onSignUp={account.onSignUp}
        onSignOut={account.onSignOut}
      />

      <form className="add-field" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="new-field-input">
          New field name
        </label>
        <input
          id="new-field-input"
          type="text"
          placeholder="New field name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">Add field</button>
      </form>

      <div className="sidebar-section">
        <p className="sidebar-title">Fields</p>
        <ul className="field-list">
          {fields.map((field) => (
            <li key={field.id} className="field-item">
              <span className="field-name">
                {field.name}{' '}
                <span className="field-count">({counts.get(field.id) ?? 0})</span>
              </span>
              <button
                type="button"
                className="field-delete"
                onClick={() => onRemoveField(field.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button type="button" className="reset-button" onClick={onResetLibrary}>
          Reset library
        </button>
        <p className="sidebar-hint">
          {account.userEmail
            ? 'Resets this account workspace and local cache.'
            : 'Clears local data for this browser.'}
        </p>
      </div>
    </aside>
  )
}
