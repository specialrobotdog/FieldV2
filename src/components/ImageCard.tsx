import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { ImageItem } from '../types'

type ImageCardProps = {
  image: ImageItem
  onNoteChange: (imageId: string, note: string) => void
  onRemove: (imageId: string) => void
}

export default function ImageCard({ image, onNoteChange, onRemove }: ImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: image.id,
      data: { type: 'image', fieldId: image.fieldId },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  }

  return (
    <article ref={setNodeRef} className="image-card" style={style}>
      <div className="image-toolbar">
        <button
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
        >
          Drag
        </button>
        <button
          type="button"
          className="image-remove"
          onClick={() => onRemove(image.id)}
        >
          Remove
        </button>
      </div>
      <div className="image-wrapper">
        <img
          src={image.src}
          alt={image.note ? `Reference: ${image.note}` : 'Saved reference'}
          loading="lazy"
        />
      </div>
      <input
        className="image-note"
        type="text"
        placeholder="Add a note"
        value={image.note ?? ''}
        onChange={(event) => onNoteChange(image.id, event.target.value)}
      />
    </article>
  )
}
