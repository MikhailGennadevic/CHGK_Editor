// Доменные типы фронтенда. Поля соответствуют схемам бэкенда (app/schemas).

export interface AlternativeAnswer {
  id: number
  questionId: number
  text: string
}

export interface Source {
  id: number
  questionId: number
  text: string
}

export interface Tester {
  id: number
  name: string
}

export interface Question {
  id: number
  packageId: number
  order: number
  text: string
  answer: string
  comment: string | null
  /** Незачёт: что не засчитывается (необязательно). */
  rejectedAnswer: string | null
  /** Раздатка: имя файла картинки (см. handoutUrl в api.ts). */
  handout: string | null
  alternativeAnswers: AlternativeAnswer[]
  sources: Source[]
  testers: Tester[]
}

export interface Package {
  id: number
  title: string
  order: number
  isUnsorted: boolean
  questions: Question[]
}
