import { useCallback, useEffect, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import { arrayMove } from '@dnd-kit/sortable'
import type { Field, FieldState } from '../types'
import { clearState, loadState, saveState } from '../storage'

const DEFAULT_FIELD_NAME = 'Untitled field'

const createDefaultField = (name?: string): Field => ({
  id: nanoid(),
  name: name?.trim() || DEFAULT_FIELD_NAME,
  imageIds: [],
  createdAt: Date.now(),
})

const createDefaultState = (): FieldState => ({
  fields: [createDefaultField('Field 1')],
  images: [],
})

const normalizeState = (state: FieldState): FieldState => {
  const validFieldIds = new Set(state.fields.map((field) => field.id))
  const images = state.images.filter((image) => validFieldIds.has(image.fieldId))
  const validImageIds = new Set(images.map((image) => image.id))
  const fields = state.fields.map((field) => ({
    ...field,
    imageIds: field.imageIds.filter((id) => validImageIds.has(id)),
  }))

  return {
    fields: fields.length > 0 ? fields : createDefaultState().fields,
    images,
  }
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to load file'))
    reader.readAsDataURL(file)
  })

export type FieldActions = {
  addField: (name?: string) => void
  renameField: (fieldId: string, name: string) => void
  addImages: (fieldId: string, files: File[]) => Promise<void>
  updateImageNote: (imageId: string, note: string) => void
  removeImage: (imageId: string) => void
  moveImage: (imageId: string, targetFieldId: string, targetIndex: number) => void
  resetLibrary: () => void
  removeField: (fieldId: string) => void
}

export function useFieldState() {
  const [state, setState] = useState<FieldState>(() => {
    const loaded = loadState()
    if (loaded) {
      return normalizeState(loaded)
    }
    return createDefaultState()
  })

  useEffect(() => {
    saveState(state)
  }, [state])

  const addField = useCallback((name?: string) => {
    setState((prev) => {
      const nextField = createDefaultField(
        name?.trim() || `Field ${prev.fields.length + 1}`
      )
      return {
        ...prev,
        fields: [...prev.fields, nextField],
      }
    })
  }, [])

  const renameField = useCallback((fieldId: string, name: string) => {
    const trimmed = name.trim() || DEFAULT_FIELD_NAME
    setState((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId ? { ...field, name: trimmed } : field
      ),
    }))
  }, [])

  const addImages = useCallback(async (fieldId: string, files: File[]) => {
    if (files.length === 0) {
      return
    }

    const startTime = Date.now()
    const items = await Promise.all(
      files.map(async (file, index) => ({
        id: nanoid(),
        fieldId,
        src: await readFileAsDataUrl(file),
        createdAt: startTime + index,
        note: '',
      }))
    )

    setState((prev) => ({
      fields: prev.fields.map((field) =>
        field.id === fieldId
          ? { ...field, imageIds: [...items.map((item) => item.id), ...field.imageIds] }
          : field
      ),
      images: [...prev.images, ...items],
    }))
  }, [])

  const updateImageNote = useCallback((imageId: string, note: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.map((image) =>
        image.id === imageId ? { ...image, note } : image
      ),
    }))
  }, [])

  const removeImage = useCallback((imageId: string) => {
    setState((prev) => {
      const image = prev.images.find((item) => item.id === imageId)
      if (!image) {
        return prev
      }

      return {
        fields: prev.fields.map((field) =>
          field.id === image.fieldId
            ? { ...field, imageIds: field.imageIds.filter((id) => id !== imageId) }
            : field
        ),
        images: prev.images.filter((item) => item.id !== imageId),
      }
    })
  }, [])

  const moveImage = useCallback(
    (imageId: string, targetFieldId: string, targetIndex: number) => {
      setState((prev) => {
        const image = prev.images.find((item) => item.id === imageId)
        if (!image) {
          return prev
        }

        const sourceFieldId = image.fieldId
        const sourceField = prev.fields.find((field) => field.id === sourceFieldId)
        const targetField = prev.fields.find((field) => field.id === targetFieldId)

        if (!sourceField || !targetField) {
          return prev
        }

        if (sourceFieldId !== targetFieldId) {
          return prev
        }

        const clampedIndex = Math.max(
          0,
          Math.min(targetIndex, targetField.imageIds.length)
        )

        const currentIndex = sourceField.imageIds.indexOf(imageId)
        if (currentIndex === -1 || currentIndex === clampedIndex) {
          return prev
        }

        const reordered = arrayMove(
          sourceField.imageIds,
          currentIndex,
          clampedIndex
        )

        return {
          ...prev,
          fields: prev.fields.map((field) =>
            field.id === sourceFieldId ? { ...field, imageIds: reordered } : field
          ),
        }
      })
    },
    []
  )

  const resetLibrary = useCallback(() => {
    clearState()
    setState(createDefaultState())
  }, [])

  const removeField = useCallback((fieldId: string) => {
    setState((prev) => {
      const remainingFields = prev.fields.filter((field) => field.id !== fieldId)
      const remainingFieldIds = new Set(remainingFields.map((field) => field.id))
      const images = prev.images.filter((image) => remainingFieldIds.has(image.fieldId))
      const fields =
        remainingFields.length > 0 ? remainingFields : createDefaultState().fields

      return {
        fields,
        images,
      }
    })
  }, [])

  const actions: FieldActions = useMemo(
    () => ({
      addField,
      renameField,
      addImages,
      updateImageNote,
      removeImage,
      moveImage,
      resetLibrary,
      removeField,
    }),
    [
      addField,
      renameField,
      addImages,
      updateImageNote,
      removeImage,
      moveImage,
      resetLibrary,
      removeField,
    ]
  )

  return {
    state,
    actions,
  }
}
