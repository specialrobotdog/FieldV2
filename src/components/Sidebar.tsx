import { useMemo, useState, type FormEvent } from 'react'
import type { Field, ImageItem } from '../types'

type SidebarProps = {
  fields: Field[]
  images: ImageItem[]
  onAddField: (name?: string) => void
  onResetLibrary: () => void
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
        <img src="/field_wordmark.png" alt="Field" className="wordmark" />
        <p>Local visual research</p>
      </div>

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
              <span className="field-name">{field.name}</span>
              <span className="field-count">{counts.get(field.id) ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button type="button" className="reset-button" onClick={onResetLibrary}>
          Reset library
        </button>
        <p className="sidebar-hint">Clears local data for this browser.</p>
      </div>
    </aside>
  )
}
