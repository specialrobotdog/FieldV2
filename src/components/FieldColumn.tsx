import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react'
import type React from 'react'
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

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const extractUrlFromTransfer = (dt: DataTransfer | null): string | null => {
  if (!dt) {
    return null
  }

  const uriList = dt.getData('text/uri-list')
  if (uriList) {
    const lines = uriList
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#'))
    const first = lines[0]
    if (first && isHttpUrl(first)) {
      return first
    }
  }

  const plain = dt.getData('text/plain')
  if (plain) {
    const match = plain.match(/https?:\/\/\S+/)
    if (match?.[0] && isHttpUrl(match[0])) {
      return match[0]
    }
  }

  return null
}

const fetchImageFileFromUrl = async (
  url: string,
  blockedMessage: string
): Promise<{ file: File | null; error?: string }> => {
  if (!isHttpUrl(url)) {
    return { file: null, error: 'Please enter a valid http/https URL.' }
  }

  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) {
      return { file: null, error: blockedMessage }
    }
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) {
      return { file: null, error: blockedMessage }
    }
    if (!ALLOWED_TYPES.has(blob.type)) {
      return { file: null, error: 'Only JPG, PNG, or WEBP images are supported.' }
    }

    const extension = blob.type.split('/')[1] ?? 'png'
    const filename = `image.${extension}`
    return { file: new File([blob], filename, { type: blob.type }) }
  } catch {
    return { file: null, error: blockedMessage }
  }
}

const extractImageFromTransfer = async (
  dt: DataTransfer | null
): Promise<{ files: File[]; error?: string }> => {
  if (!dt) {
    return { files: [], error: 'No image data found.' }
  }

  if (dt.files && dt.files.length > 0) {
    return { files: Array.from(dt.files) }
  }

  if (dt.items && dt.items.length > 0) {
    const items = Array.from(dt.items) as DataTransferItem[]
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          return { files: [file] }
        }
      }
    }
  }

  const url = extractUrlFromTransfer(dt)
  if (!url) {
    return { files: [], error: 'No image URL found.' }
  }

  const result = await fetchImageFileFromUrl(
    url,
    'This site blocks direct import — try copy image, then paste here.'
  )
  if (result.file) {
    return { files: [result.file] }
  }
  return { files: [], error: result.error }
}

const isFileDrag = (event: DragEvent<HTMLElement>) => {
  const dt = event.dataTransfer
  if (!dt) {
    return false
  }
  if (dt.files && dt.files.length > 0) {
    return true
  }
  if (dt.items && dt.items.length > 0) {
    const items = Array.from(dt.items) as DataTransferItem[]
    return items.some((item) => item.kind === 'file')
  }
  if (dt.types && dt.types.length > 0) {
    return Array.from(dt.types).some(
      (type) =>
        type === 'Files' ||
        type === 'application/x-moz-file' ||
        type === 'public.file-url' ||
        type === 'text/uri-list' ||
        type === 'text/plain'
    )
  }
  return false
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
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

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
    event.preventDefault()
    event.stopPropagation()
    setDropActive(false)
    const dt = event.dataTransfer
    const result = await extractImageFromTransfer(dt)
    if (result.files.length === 0) {
      if (result.error) {
        setErrorMessage(result.error)
      }
      return
    }
    await handleFiles(result.files)
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const dt = event.clipboardData
    const result = await extractImageFromTransfer(dt)
    if (result.files.length === 0) {
      if (result.error) {
        setErrorMessage(result.error)
      }
      return
    }
    await handleFiles(result.files)
  }

  const handleUrlSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = urlInput.trim()
    if (!value) {
      setUrlError('Please enter an image URL.')
      return
    }
    setUrlError('')
    const result = await fetchImageFileFromUrl(
      value,
      'Must be a direct image URL (.jpg, .png, .webp). Open the image in a new tab and copy that URL.'
    )
    if (result.file) {
      await handleFiles([result.file])
      setUrlInput('')
      return
    }
    if (result.error) {
      setUrlError(result.error)
    }
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
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

      <div className="field-body">
        <div
          className={`field-dropzone${dropActive ? ' is-active' : ''}`}
          tabIndex={0}
          onDragEnter={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (isFileDrag(event)) {
              setDropActive(true)
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (isFileDrag(event)) {
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy'
              }
            }
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          <label className="dropzone-label">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
            />
            <span className="dropzone-title">Drop images here</span>
            <span className="dropzone-subtitle">
              or click to browse (JPG, PNG, WEBP)
            </span>
            <span className="dropzone-tip">
              Tip: Copy an image and press ⌘V / Ctrl+V
            </span>
          </label>
        </div>
        <form className="url-form" onSubmit={handleUrlSubmit}>
          <label className="sr-only" htmlFor={`url-input-${field.id}`}>
            Paste image URL
          </label>
          <input
            id={`url-input-${field.id}`}
            className="url-input"
            type="url"
            placeholder="Paste image URL"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
          />
          <button type="submit" className="url-button">
            Add
          </button>
        </form>
        {urlError ? <p className="url-error">{urlError}</p> : null}
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
      </div>
    </section>
  )
}
