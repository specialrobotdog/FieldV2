import { useEffect } from 'react'
import './App.css'
import FieldBoard from './components/FieldBoard'
import Sidebar from './components/Sidebar'
import { useAccount } from './hooks/useAccount'
import { useFieldState } from './hooks/useFieldState'

function App() {
  const account = useAccount()
  const sessionUser = account.session?.user ?? null
  const { state, actions, persistence } = useFieldState({
    cloudUserId: sessionUser?.id ?? null,
    cloudEnabled: account.isConfigured,
  })

  const storageIndicator = !account.isConfigured
    ? 'Local only'
    : account.isLoading
      ? 'Checking account'
      : !sessionUser
        ? 'Guest mode'
        : persistence.status === 'saving'
          ? 'Syncing...'
          : persistence.status === 'loading'
            ? 'Loading cloud...'
            : persistence.status === 'error'
              ? 'Sync error'
              : 'Cloud synced'

  const headerDescription = !account.isConfigured
    ? 'Save images locally, reorder them, and compare side by side.'
    : sessionUser
      ? 'Signed in: your workspace syncs to your account across devices.'
      : 'Sign in to sync your workspace across devices.'

  useEffect(() => {
    const preventDocumentDrop = (event: DragEvent) => {
      const dataTransfer = event.dataTransfer
      if (!dataTransfer) {
        return
      }

      const hasFiles = dataTransfer.files && dataTransfer.files.length > 0
      const types = dataTransfer.types ? Array.from(dataTransfer.types) : []
      const hasUrl =
        types.includes('text/uri-list') ||
        types.includes('text/plain') ||
        types.includes('text/html')

      if (hasFiles || hasUrl) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('dragover', preventDocumentDrop)
    document.addEventListener('drop', preventDocumentDrop)

    return () => {
      document.removeEventListener('dragover', preventDocumentDrop)
      document.removeEventListener('drop', preventDocumentDrop)
    }
  }, [])

  return (
    <div className="app">
      <Sidebar
        fields={state.fields}
        images={state.images}
        onAddField={actions.addField}
        onResetLibrary={actions.resetLibrary}
        onRemoveField={actions.removeField}
        account={{
          isCloudConfigured: account.isConfigured,
          configurationError: account.configurationError,
          isAccountLoading: account.isLoading,
          userEmail: sessionUser?.email ?? null,
          authError: account.authError,
          syncStatus: persistence.status,
          syncError: persistence.error,
          lastSyncedAt: persistence.lastSyncedAt,
          onSignIn: account.signIn,
          onSignUp: account.signUp,
          onSignOut: account.signOut,
        }}
      />
      <main className="main">
        <div className="main-header">
          <div>
            <h2>Your Fields</h2>
            <p>{headerDescription}</p>
          </div>
          <span className="storage-indicator">{storageIndicator}</span>
        </div>
        <FieldBoard
          fields={state.fields}
          images={state.images}
          onAddImages={actions.addImages}
          onRenameField={actions.renameField}
          onUpdateImageNote={actions.updateImageNote}
          onRemoveImage={actions.removeImage}
          onMoveImage={actions.moveImage}
        />
      </main>
    </div>
  )
}

export default App
