import { useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Field, ImageItem } from '../types'
import FieldColumn from './FieldColumn'

type FieldBoardProps = {
  fields: Field[]
  images: ImageItem[]
  onAddImages: (fieldId: string, files: FileList | null) => Promise<void>
  onRenameField: (fieldId: string, name: string) => void
  onUpdateImageNote: (imageId: string, note: string) => void
  onRemoveImage: (imageId: string) => void
  onMoveImage: (imageId: string, targetFieldId: string, targetIndex: number) => void
}

export default function FieldBoard({
  fields,
  images,
  onAddImages,
  onRenameField,
  onUpdateImageNote,
  onRemoveImage,
  onMoveImage,
}: FieldBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const imagesById = useMemo(() => {
    const map = new Map<string, ImageItem>()
    images.forEach((image) => map.set(image.id, image))
    return map
  }, [images])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      return
    }

    const activeId = String(active.id)
    const activeFieldId = active.data.current?.fieldId as string | undefined
    const overFieldId = over.data.current?.fieldId as string | undefined

    if (!activeFieldId || !overFieldId) {
      return
    }

    const targetField = fields.find((field) => field.id === overFieldId)
    if (!targetField) {
      return
    }

    let targetIndex = targetField.imageIds.length
    if (over.data.current?.type === 'image') {
      const overIndex = targetField.imageIds.indexOf(String(over.id))
      if (overIndex !== -1) {
        targetIndex = overIndex
      }
    }

    onMoveImage(activeId, overFieldId, targetIndex)
  }

  return (
    <div className="field-board">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="field-board-inner">
          {fields.map((field) => {
            const fieldImages = field.imageIds
              .map((id) => imagesById.get(id))
              .filter((image): image is ImageItem => Boolean(image))

            return (
              <FieldColumn
                key={field.id}
                field={field}
                images={fieldImages}
                onAddImages={onAddImages}
                onRenameField={onRenameField}
                onUpdateImageNote={onUpdateImageNote}
                onRemoveImage={onRemoveImage}
              />
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}
