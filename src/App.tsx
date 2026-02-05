import { useEffect } from 'react'
import './App.css'
import FieldBoard from './components/FieldBoard'
import Sidebar from './components/Sidebar'
import { useFieldState } from './hooks/useFieldState'

function App() {
  const { state, actions } = useFieldState()

  useEffect(() => {
    const preventDocumentDrop = (event: DragEvent) => {
      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
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
      />
      <main className="main">
        <div className="main-header">
          <div>
            <h2>Fields</h2>
            <p>Save images locally, reorder them, and compare side by side.</p>
          </div>
          <span className="storage-indicator">Local only</span>
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
