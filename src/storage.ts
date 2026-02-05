import type { FieldState } from './types'

const STORAGE_KEY = 'fieldv1.state'
const STORAGE_VERSION = 1

type StoredState = {
  version: number
  state: FieldState
}

export const storageVersion = STORAGE_VERSION

export function loadState(): FieldState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as StoredState
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      return null
    }
    return parsed.state
  } catch {
    return null
  }
}

export function saveState(state: FieldState) {
  if (typeof window === 'undefined') {
    return
  }

  const payload: StoredState = { version: STORAGE_VERSION, state }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
