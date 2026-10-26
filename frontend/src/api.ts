// Тонкий клиент к бэкенду. Все запросы идут через /api (см. vite proxy).
import type { Package, Question, Tester } from './types'

async function request<T = void>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${init?.method ?? 'GET'} ${path} ${res.status}: ${detail}`)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

// --- Маппинг snake_case (бэкенд) -> camelCase (types.ts) ---

/* eslint-disable @typescript-eslint/no-explicit-any */
const toQuestion = (q: any): Question => ({
  id: q.id,
  packageId: q.package_id,
  order: q.order,
  text: q.text,
  answer: q.answer,
  comment: q.comment,
  rejectedAnswer: q.rejected_answer,
  handout: q.handout,
  alternativeAnswers: q.alternative_answers.map((a: any) => ({
    id: a.id,
    questionId: a.question_id,
    text: a.text,
  })),
  sources: q.sources.map((s: any) => ({
    id: s.id,
    questionId: s.question_id,
    text: s.text,
  })),
  testers: q.testers,
})

const toPackage = (p: any): Package => ({
  id: p.id,
  title: p.title,
  order: p.order,
  isUnsorted: p.is_unsorted,
  questions: p.questions.map(toQuestion),
})
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchPackages(): Promise<Package[]> {
  return (await request<unknown[]>('/packages')).map(toPackage)
}

export async function createPackage(title: string): Promise<Package> {
  return toPackage(
    await request('/packages', { method: 'POST', body: JSON.stringify({ title }) }),
  )
}

/** Мягкое удаление пакета вместе с его вопросами (DELETE /packages/{id}). */
export async function deletePackage(packageId: number): Promise<void> {
  await request(`/packages/${packageId}`, { method: 'DELETE' })
}

/** Перенос колонки на позицию newOrder (PATCH /packages/{id}). */
export async function movePackage(packageId: number, newOrder: number): Promise<void> {
  await request(`/packages/${packageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ order: newOrder }),
  })
}

/** Перенос вопроса в другой пакет на позицию newOrder (PATCH /questions/{id}/move). */
export async function moveQuestion(
  questionId: number,
  newPackageId: number,
  newOrder: number,
): Promise<void> {
  await request(`/questions/${questionId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ new_package_id: newPackageId, new_order: newOrder }),
  })
}

/** Редактируемые поля вопроса (то, что вводится в окне добавления/редактирования). */
export interface QuestionInput {
  text: string
  answer: string
  comment: string | null
  rejectedAnswer: string | null
  handout: string | null
  alternativeAnswers: string[]
  sources: string[]
  testerIds: number[]
}

const toQuestionBody = (input: QuestionInput) => ({
  text: input.text,
  answer: input.answer,
  comment: input.comment,
  rejected_answer: input.rejectedAnswer,
  handout: input.handout,
  alternative_answers: input.alternativeAnswers.map((text) => ({ text })),
  sources: input.sources.map((text) => ({ text })),
  tester_ids: input.testerIds,
})

/** Новый вопрос в конце пакета (POST /questions). */
export async function createQuestion(packageId: number, input: QuestionInput): Promise<Question> {
  return toQuestion(
    await request('/questions', {
      method: 'POST',
      body: JSON.stringify({ package_id: packageId, ...toQuestionBody(input) }),
    }),
  )
}

/** Правка вопроса (PATCH /questions/{id}); списки зачётов и источников заменяются целиком. */
export async function updateQuestion(questionId: number, input: QuestionInput): Promise<Question> {
  return toQuestion(
    await request(`/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(toQuestionBody(input)),
    }),
  )
}

export async function fetchTesters(): Promise<Tester[]> {
  return request<Tester[]>('/testers')
}

/** Новый тестер; если с таким именем уже есть — вернётся существующий. */
export async function createTester(name: string): Promise<Tester> {
  return request<Tester>('/testers', { method: 'POST', body: JSON.stringify({ name }) })
}

/** Адрес картинки-раздатки по имени файла. */
export const handoutUrl = (filename: string) => `/api/uploads/${filename}`

/** Файл пакета в формате печатного тура (docx) для скачивания. */
export const packageDocxUrl = (packageId: number) => `/api/packages/${packageId}/docx`

/** Загрузка картинки; возвращает имя файла, которое кладётся в QuestionInput.handout. */
export async function uploadHandout(file: File): Promise<string> {
  const res = await request<{ filename: string }>('/uploads', {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  return res.filename
}

/** Мягкое удаление вопроса (DELETE /questions/{id}). */
export async function deleteQuestion(questionId: number): Promise<void> {
  await request(`/questions/${questionId}`, { method: 'DELETE' })
}

/** Массово добавляет тестеров ко всем перечисленным вопросам; возвращает обновлённые вопросы. */
export async function addTestersToQuestions(
  questionIds: number[],
  testerIds: number[],
): Promise<Question[]> {
  const res = await request<unknown[]>('/questions/bulk/testers', {
    method: 'POST',
    body: JSON.stringify({ question_ids: questionIds, tester_ids: testerIds }),
  })
  return res.map(toQuestion)
}
