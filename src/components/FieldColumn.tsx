import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Field, ImageItem } from '../types'
import ImageCard from './ImageCard'

type FieldColumnProps = {
  field: Field
  images: ImageItem[]
  onAddImages: (fieldId: string, files: File[]) => Promise<void>
  onRenameField: (fieldId: string, name: string) => void
  onUpdateImageNote: (imageId: string, note: string) => void
  onRemoveImage: (imageId: string) => void
}

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const isAllowedFile = (file: File) => {
  if (ALLOWED_TYPES.has(file.type)) {
    return true
  }
  const name = file.name.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

const isFileDrag = (event: DragEvent<HTMLElement>) => {
  const types = event.dataTransfer?.types
  if (!types) {
    return false
  }
  return Array.from(types).some((type) => type === 'Files' || type === 'application/x-moz-file')
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
  const [dropActive, setDropActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) {
      return
    }

    const accepted: File[] = []
    let invalidTypeCount = 0
    let tooLargeCount = 0

    files.forEach((file) => {
      if (!isAllowedFile(file)) {
        invalidTypeCount += 1
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        tooLargeCount += 1
        return
      }
      accepted.push(file)
    })

    const messages: string[] = []
    if (invalidTypeCount > 0) {
      messages.push(
        `${invalidTypeCount} unsupported file type${invalidTypeCount > 1 ? 's' : ''}`
      )
    }
    if (tooLargeCount > 0) {
      messages.push(`${tooLargeCount} over 8MB`)
    }

    setErrorMessage(messages.length ? `Skipped ${messages.join(', ')}.` : '')

    if (accepted.length > 0) {
      await onAddImages(field.id, accepted)
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = event.target.files ? Array.from(event.target.files) : []
    await handleFiles(nextFiles)
    event.target.value = ''
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    setDropActive(false)
    const droppedFiles = Array.from(event.dataTransfer?.files ?? [])
    await handleFiles(droppedFiles)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget &&
      event.currentTarget.contains(event.relatedTarget as Node)
    ) {
      return
    }
    setDropActive(false)
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

      <div
        className={`field-dropzone${dropActive ? ' is-active' : ''}`}
        onDragEnter={(event) => {
          if (!isFileDrag(event)) {
            return
          }
          event.preventDefault()
          setDropActive(true)
        }}
        onDragOver={(event) => {
          if (!isFileDrag(event)) {
            return
          }
          event.preventDefault()
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="dropzone-label">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
          />
          <span className="dropzone-title">Drop images here</span>
          <span className="dropzone-subtitle">or click to browse (JPG, PNG, WEBP)</span>
        </label>
      </div>
      {errorMessage ? <p className="field-error">{errorMessage}</p> : null}

      <SortableContext items={field.imageIds} strategy={verticalListSortingStrategy}>
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
