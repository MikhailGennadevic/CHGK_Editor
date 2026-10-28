import type { Question, Tester } from './types'

// Состояние окна редактирования вопроса переживает перезагрузку страницы:
// вкладку может выгрузить браузер («Экономия памяти») или перезагрузить Vite в dev-режиме.
// sessionStorage, а не localStorage: черновик живёт в рамках вкладки и не «уезжает» в другие.

const EDITOR_KEY = 'chgk:editor'
const DRAFT_KEY = 'chgk:editorDraft'

export type EditorState =
  | { mode: 'create'; packageId: number }
  | { mode: 'edit'; question: Question }

/** Черновик полей формы; key привязан к конкретному редактору (вопросу или пакету). */
export interface EditorDraft {
  key: string
  text: string
  answer: string
  rejected: string
  comment: string
  alts: string[]
  sources: string[]
  testers: Tester[]
  handout: string | null
}

/** Ключ черновика = ключ remount модалки: один открытый редактор — один черновик. */
export const editorDraftKey = (e: EditorState): string =>
  e.mode === 'edit' ? `edit-${e.question.id}` : `create-${e.packageId}`

export function saveEditorState(editor: EditorState): void {
  try {
    sessionStorage.setItem(EDITOR_KEY, JSON.stringify(editor))
  } catch {
    /* приватный режим и т. п. — не критично */
  }
}

export function loadEditorState(): EditorState | null {
  try {
    const raw = sessionStorage.getItem(EDITOR_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as EditorState
    if (v?.mode === 'create' && typeof v.packageId === 'number') return v
    if (v?.mode === 'edit' && typeof v.question?.id === 'number') return v
  } catch {
    /* битый JSON — считаем, что черновика нет */
  }
  return null
}

export function clearEditorState(): void {
  try {
    sessionStorage.removeItem(EDITOR_KEY)
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* не критично */
  }
}

export function saveEditorDraft(draft: EditorDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* не критично */
  }
}

/** Черновик этого редактора; если записан другим — null. */
export function loadEditorDraft(key: string): EditorDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as EditorDraft
    return d?.key === key ? d : null
  } catch {
    return null
  }
}
