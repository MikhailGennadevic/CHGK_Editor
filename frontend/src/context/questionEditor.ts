import { createContext, useContext } from 'react'
import type { Question } from '../types'

export interface QuestionEditorActions {
  openCreate: (packageId: number) => void
  openEdit: (question: Question) => void
  /** Удаление вопроса с подтверждением (кнопка на карточке). */
  requestDelete: (question: Question) => void
}

const noop = () => {}

// Через контекст, чтобы не прокидывать колбэки через Board -> колонку -> карточку.
export const QuestionEditorContext = createContext<QuestionEditorActions>({
  openCreate: noop,
  openEdit: noop,
  requestDelete: noop,
})

export const useQuestionEditor = () => useContext(QuestionEditorContext)
