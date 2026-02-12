import type { FieldState, Field, ImageItem } from './types'

const LEGACY_STORAGE_KEY = 'fieldv1.state'
const STORAGE_KEY_PREFIX = 'fieldv2.state'
const STORAGE_SCHEMA = 'field_v1'
const STORAGE_VERSION = 1
const SAVE_DEBOUNCE_MS = 250

type StoredState = {
  schema: string
  version: number
  state: FieldState
}

type LegacyStoredState = {
  version: number
  state: FieldState
}

const saveTimeoutByScope = new Map<string, number>()
const pendingStateByScope = new Map<string, FieldState>()

const getStorageKey = (scope: string) => `${STORAGE_KEY_PREFIX}.${scope}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isField = (value: unknown): value is Field =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.createdAt === 'number' &&
  isStringArray(value.imageIds)

const isImageItem = (value: unknown): value is ImageItem =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.fieldId === 'string' &&
  typeof value.src === 'string' &&
  typeof value.createdAt === 'number' &&
  (value.note === undefined || typeof value.note === 'string')

export const isFieldState = (value: unknown): value is FieldState =>
  isRecord(value) &&
  Array.isArray(value.fields) &&
  Array.isArray(value.images) &&
  value.fields.every(isField) &&
  value.images.every(isImageItem)

export const storageSchema = STORAGE_SCHEMA
export const storageVersion = STORAGE_VERSION

const parseStoredState = (raw: string): FieldState | null => {
  try {
    const parsed = JSON.parse(raw) as StoredState | LegacyStoredState
    if (!isRecord(parsed)) {
      return null
    }

    const schema = 'schema' in parsed ? parsed.schema : STORAGE_SCHEMA
    const version = parsed.version
    const state = parsed.state

    if ('schema' in parsed && typeof schema !== 'string') {
      return null
    }

    if (typeof version !== 'number') {
      return null
    }

    if (schema !== STORAGE_SCHEMA || version !== STORAGE_VERSION) {
      return null
    }

    if (!isFieldState(state)) {
      return null
    }

    return state
  } catch {
    return null
  }
}

const writeState = (state: FieldState, scope: string) => {
  const payload: StoredState = {
    schema: STORAGE_SCHEMA,
    version: STORAGE_VERSION,
    state,
  }
  const scopedKey = getStorageKey(scope)
  window.localStorage.setItem(scopedKey, JSON.stringify(payload))
}

export function loadState(scope = 'guest'): FieldState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const scopedKey = getStorageKey(scope)
  const scopedRaw = window.localStorage.getItem(scopedKey)
  if (scopedRaw) {
    return parseStoredState(scopedRaw)
  }

  if (scope !== 'guest') {
    return null
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacyRaw) {
    return null
  }

  const legacyState = parseStoredState(legacyRaw)
  if (!legacyState) {
    return null
  }

  // Migrate old single-key storage into scoped guest storage.
  try {
    writeState(legacyState, 'guest')
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Ignore migration errors and continue with the in-memory fallback.
  }
  return legacyState
}

export function saveState(state: FieldState, scope = 'guest') {
  if (typeof window === 'undefined') {
    return
  }

  const saveTimeout = saveTimeoutByScope.get(scope)
  pendingStateByScope.set(scope, state)
  if (saveTimeout) {
    window.clearTimeout(saveTimeout)
  }

  const nextTimeout = window.setTimeout(() => {
    const pendingState = pendingStateByScope.get(scope)
    if (!pendingState) {
      return
    }
    try {
      writeState(pendingState, scope)
    } catch {
      // Ignore quota or serialization errors.
    } finally {
      pendingStateByScope.delete(scope)
      saveTimeoutByScope.delete(scope)
    }
  }, SAVE_DEBOUNCE_MS)

  saveTimeoutByScope.set(scope, nextTimeout)
}

export function clearState(scope = 'guest') {
  if (typeof window === 'undefined') {
    return
  }

  const saveTimeout = saveTimeoutByScope.get(scope)
  if (saveTimeout) {
    window.clearTimeout(saveTimeout)
    saveTimeoutByScope.delete(scope)
  }

  pendingStateByScope.delete(scope)
  window.localStorage.removeItem(getStorageKey(scope))
  if (scope === 'guest') {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
}
