import './App.css'
import FieldBoard from './components/FieldBoard'
import Sidebar from './components/Sidebar'
import { useFieldState } from './hooks/useFieldState'

function App() {
  const { state, actions } = useFieldState()

  return (
    <div className="app">
      <Sidebar
        fields={state.fields}
        images={state.images}
        onAddField={actions.addField}
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
