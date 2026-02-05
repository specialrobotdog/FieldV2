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
const PROXY_ERROR_MESSAGE =
  'This site blocks importing. Open image in a new tab and drag the direct image, or download and drag from desktop.'

const isAllowedFile = (file: File) => {
  if (ALLOWED_TYPES.has(file.type)) {
    return true
  }
  const name = file.name.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

const extractFiles = (dataTransfer: DataTransfer | null): File[] => {
  if (!dataTransfer) {
    return []
  }
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return Array.from(dataTransfer.files)
  }
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items)
      .map((item) => (item.kind === 'file' ? item.getAsFile() : null))
      .filter((file): file is File => Boolean(file))
  }
  return []
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const extractImageSrcFromHtml = (html: string) => {
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const img = doc.querySelector('img')
      const src = img?.getAttribute('src')
      if (src) {
        return src
      }
    } catch {
      // Ignore parse errors and fall back to regex.
    }
  }

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] ?? null
}

const extractUrls = (dataTransfer: DataTransfer | null): string[] => {
  if (!dataTransfer) {
    return []
  }

  const candidates: string[] = []
  const uriList = dataTransfer.getData('text/uri-list')
  if (uriList) {
    uriList
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => candidates.push(line))
  }

  if (candidates.length === 0) {
    const plain = dataTransfer.getData('text/plain')
    if (plain) {
      const match = plain.match(/https?:\/\/\S+/)
      if (match?.[0]) {
        candidates.push(match[0])
      }
    }
  }

  if (candidates.length === 0) {
    const html = dataTransfer.getData('text/html')
    if (html) {
      const src = extractImageSrcFromHtml(html)
      if (src) {
        candidates.push(src)
      }
    }
  }

  return candidates.map((value) => value.trim()).filter(isHttpUrl)
}

const fetchImageFromUrl = async (
  url: string
): Promise<{ file: File | null; error?: 'proxy' }> => {
  try {
    if (!isHttpUrl(url)) {
      return { file: null, error: 'proxy' }
    }

    const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)
    if (!response.ok) {
      return { file: null, error: 'proxy' }
    }

    const blob = await response.blob()
    const contentType =
      (response.headers.get('content-type') ?? blob.type).toLowerCase()
    const mimeType = contentType.split(';')[0].trim()
    if (!mimeType.startsWith('image/')) {
      return { file: null, error: 'proxy' }
    }

    const extension = mimeType.split('/')[1] ?? 'png'
    const filename = `image.${extension}`
    return { file: new File([blob], filename, { type: mimeType || blob.type }) }
  } catch {
    return { file: null, error: 'proxy' }
  }
}

const isFileDrag = (event: DragEvent<HTMLElement>) => {
  const dataTransfer = event.dataTransfer
  if (!dataTransfer) {
    return false
  }
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return true
  }
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some((item) => item.kind === 'file')
  }
  if (dataTransfer.types && dataTransfer.types.length > 0) {
    return Array.from(dataTransfer.types).some(
      (type) =>
        type === 'Files' ||
        type === 'application/x-moz-file' ||
        type === 'public.file-url' ||
        type === 'text/uri-list' ||
        type === 'text/plain' ||
        type === 'text/html'
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
    event.preventDefault()
    event.stopPropagation()
    setDropActive(false)
    const droppedFiles = extractFiles(event.dataTransfer ?? null)
    if (droppedFiles.length === 0) {
      const urls = extractUrls(event.dataTransfer ?? null)
      if (urls.length === 0) {
        setErrorMessage('No image URL found.')
        return
      }

      for (const url of urls) {
        const result = await fetchImageFromUrl(url)
        if (result.file) {
          await handleFiles([result.file])
          return
        }
      }

      setErrorMessage(PROXY_ERROR_MESSAGE)
      return
    }
    await handleFiles(droppedFiles)
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
      </div>
    </section>
  )
}
