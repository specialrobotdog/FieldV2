import type { FieldState, ImageItem } from '../types'
import { supabase } from './supabase'

const FIELDS_TABLE = 'fields'
const ITEMS_TABLE = 'items'

type FieldRow = {
  id: string
  name: string
  created_at: string
}

type ItemRow = {
  id: string
  field_id: string
  src: string
  note: string | null
  position: number
  created_at: string
}

type FieldWriteRow = {
  user_id: string
  id: string
  name: string
  created_at: string
  updated_at: string
}

type ItemWriteRow = {
  user_id: string
  id: string
  field_id: string
  src: string
  note: string | null
  position: number
  created_at: string
  updated_at: string
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error'

const parseMillis = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return Date.now()
}

const toIsoString = (timestamp: number) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }
  return date.toISOString()
}

const buildItemRows = (state: FieldState, userId: string, nowIso: string) => {
  const imageById = new Map(state.images.map((image) => [image.id, image]))
  const emittedImageIds = new Set<string>()
  const rows: ItemWriteRow[] = []

  state.fields.forEach((field) => {
    field.imageIds.forEach((imageId, position) => {
      const image = imageById.get(imageId)
      if (!image || image.fieldId !== field.id || emittedImageIds.has(image.id)) {
        return
      }

      emittedImageIds.add(image.id)
      rows.push({
        user_id: userId,
        id: image.id,
        field_id: field.id,
        src: image.src,
        note: image.note?.trim() ? image.note : null,
        position,
        created_at: toIsoString(image.createdAt),
        updated_at: nowIso,
      })
    })
  })

  return rows
}

export async function loadCloudState(userId: string): Promise<FieldState | null> {
  if (!supabase) {
    return null
  }

  const { data: rawFields, error: fieldsError } = await supabase
    .from(FIELDS_TABLE)
    .select('id,name,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (fieldsError) {
    throw new Error(`Failed to load cloud fields: ${getErrorMessage(fieldsError)}`)
  }

  const fields = (rawFields ?? []) as FieldRow[]
  if (fields.length === 0) {
    return null
  }

  const { data: rawItems, error: itemsError } = await supabase
    .from(ITEMS_TABLE)
    .select('id,field_id,src,note,position,created_at')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (itemsError) {
    throw new Error(`Failed to load cloud items: ${getErrorMessage(itemsError)}`)
  }

  const items = (rawItems ?? []) as ItemRow[]
  const fieldIdSet = new Set(fields.map((field) => field.id))
  const imageIdsByField = new Map<string, string[]>(fields.map((field) => [field.id, []]))
  const images: ImageItem[] = []

  items.forEach((item) => {
    if (!fieldIdSet.has(item.field_id)) {
      return
    }
    const fieldImageIds = imageIdsByField.get(item.field_id)
    if (fieldImageIds) {
      fieldImageIds.push(item.id)
    }
    images.push({
      id: item.id,
      fieldId: item.field_id,
      src: item.src,
      note: item.note ?? '',
      createdAt: parseMillis(item.created_at),
    })
  })

  return {
    fields: fields.map((field) => ({
      id: field.id,
      name: field.name,
      createdAt: parseMillis(field.created_at),
      imageIds: imageIdsByField.get(field.id) ?? [],
    })),
    images,
  }
}

export async function saveCloudState(userId: string, state: FieldState): Promise<void> {
  if (!supabase) {
    return
  }

  const nowIso = new Date().toISOString()
  const fieldIds = new Set(state.fields.map((field) => field.id))

  const fieldRows: FieldWriteRow[] = state.fields.map((field) => ({
    user_id: userId,
    id: field.id,
    name: field.name,
    created_at: toIsoString(field.createdAt),
    updated_at: nowIso,
  }))

  const itemRows = buildItemRows(state, userId, nowIso)
  const itemIds = new Set(itemRows.map((item) => item.id))

  if (fieldRows.length > 0) {
    const { error: upsertFieldsError } = await supabase
      .from(FIELDS_TABLE)
      .upsert(fieldRows, { onConflict: 'user_id,id' })

    if (upsertFieldsError) {
      throw new Error(`Failed to save cloud fields: ${getErrorMessage(upsertFieldsError)}`)
    }
  }

  if (itemRows.length > 0) {
    const { error: upsertItemsError } = await supabase
      .from(ITEMS_TABLE)
      .upsert(itemRows, { onConflict: 'user_id,id' })

    if (upsertItemsError) {
      throw new Error(`Failed to save cloud items: ${getErrorMessage(upsertItemsError)}`)
    }
  }

  const { data: existingItems, error: existingItemsError } = await supabase
    .from(ITEMS_TABLE)
    .select('id')
    .eq('user_id', userId)

  if (existingItemsError) {
    throw new Error(`Failed to load existing cloud items: ${getErrorMessage(existingItemsError)}`)
  }

  const staleItemIds = (existingItems ?? [])
    .map((row) => (typeof row.id === 'string' ? row.id : ''))
    .filter((id) => id && !itemIds.has(id))

  if (staleItemIds.length > 0) {
    const { error: deleteItemsError } = await supabase
      .from(ITEMS_TABLE)
      .delete()
      .eq('user_id', userId)
      .in('id', staleItemIds)

    if (deleteItemsError) {
      throw new Error(`Failed to prune cloud items: ${getErrorMessage(deleteItemsError)}`)
    }
  }

  const { data: existingFields, error: existingFieldsError } = await supabase
    .from(FIELDS_TABLE)
    .select('id')
    .eq('user_id', userId)

  if (existingFieldsError) {
    throw new Error(
      `Failed to load existing cloud fields: ${getErrorMessage(existingFieldsError)}`
    )
  }

  const staleFieldIds = (existingFields ?? [])
    .map((row) => (typeof row.id === 'string' ? row.id : ''))
    .filter((id) => id && !fieldIds.has(id))

  if (staleFieldIds.length > 0) {
    const { error: deleteFieldsError } = await supabase
      .from(FIELDS_TABLE)
      .delete()
      .eq('user_id', userId)
      .in('id', staleFieldIds)

    if (deleteFieldsError) {
      throw new Error(`Failed to prune cloud fields: ${getErrorMessage(deleteFieldsError)}`)
    }
  }
}
