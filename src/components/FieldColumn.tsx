import { useEffect, useState, type ChangeEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { Field, ImageItem } from '../types'
import ImageCard from './ImageCard'

type FieldColumnProps = {
  field: Field
  images: ImageItem[]
  onAddImages: (fieldId: string, files: FileList | null) => Promise<void>
  onRenameField: (fieldId: string, name: string) => void
  onUpdateImageNote: (imageId: string, note: string) => void
  onRemoveImage: (imageId: string) => void
}

export default function FieldColumn({
  field,
  images,
  onAddImages,
  onRenameField,
  onUpdateImageNote,
  onRemoveImage,
}: FieldColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: field.id,
    data: { type: 'field', fieldId: field.id },
  })
  const [draftName, setDraftName] = useState(field.name)

  useEffect(() => {
    setDraftName(field.name)
  }, [field.name])

  const handleNameCommit = () => {
    const nextName = draftName.trim() || 'Untitled field'
    if (nextName !== field.name) {
      onRenameField(field.id, nextName)
    } else {
      setDraftName(nextName)
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await onAddImages(field.id, event.target.files)
    event.target.value = ''
  }

  return (
    <section className="field-column">
      <div className="field-header">
        <input
          className="field-name-input"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={handleNameCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          aria-label="Field name"
        />
        <span className="field-meta">{images.length} images</span>
      </div>

      <div className="field-actions">
        <label className="file-button">
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          Add images
        </label>
      </div>

      <SortableContext items={field.imageIds} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`field-images${isOver ? ' is-over' : ''}`}
        >
          {images.length === 0 ? (
            <div className="empty-state">Drop images here</div>
          ) : (
            images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onNoteChange={onUpdateImageNote}
                onRemove={onRemoveImage}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  )
}
