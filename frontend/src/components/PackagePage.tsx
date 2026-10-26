import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Link } from '../router'
import { containerId, useBoardDnd } from '../hooks/useBoardDnd'
import { useQuestionEditor } from '../context/questionEditor'
import { addTestersToQuestions, createTester, fetchTesters, packageDocxUrl } from '../api'
import type { Package, Tester } from '../types'
import QuestionCard from './QuestionCard'
import SortableQuestionCard from './SortableQuestionCard'
import TesterPicker from './TesterPicker'
import CopyButton from './CopyButton'

interface Props {
  pkg: Package
  /** Все пакеты и их сеттер: перестановка использует ту же логику, что и доска. */
  packages: Package[]
  onPackagesChange: (next: Package[]) => void
}

/** Страница пакета: все вопросы одним вертикальным списком. */
export default function PackagePage({ pkg, packages, onPackagesChange }: Props) {
  const { openCreate } = useQuestionEditor()
  const [allTesters, setAllTesters] = useState<Tester[]>([])
  const [marked, setMarked] = useMarkedTesters()
  useEffect(() => {
    fetchTesters().then(setAllTesters).catch((err) => console.error('fetchTesters failed', err))
  }, [])

  // Массовое добавление тестеров: выбранные вопросы + кого к ним добавить.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkTesters, setBulkTesters] = useState<Tester[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Открытые ответы: общий список позволяет кнопке раскрыть/скрыть все ответы разом.
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(() => new Set())
  const allAnswersOpen = pkg.questions.length > 0 && pkg.questions.every((q) => openAnswers.has(q.id))

  const toggleAnswer = useCallback((id: number) => {
    setOpenAnswers((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const toggleAllAnswers = () => {
    setOpenAnswers(allAnswersOpen ? new Set() : new Set(pkg.questions.map((q) => q.id)))
  }

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  // Вопрос могли удалить уже после выбора — такие id не считаем.
  const selectedCount = pkg.questions.filter((q) => selectedIds.has(q.id)).length
  const allSelected = pkg.questions.length > 0 && selectedCount === pkg.questions.length

  // Все тестеры пакета по порядку появления, без дублей — для кнопки «Скопировать тестеров».
  const testerNames = useMemo(() => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const q of pkg.questions)
      for (const t of q.testers)
        if (!seen.has(t.name)) {
          seen.add(t.name)
          names.push(t.name)
        }
    return names.join(', ')
  }, [pkg.questions])

  // Номера вопросов, кратных 6 — концы туров; для плавающей навигации.
  const roundMarks: number[] = []
  for (let n = 6; n <= pkg.questions.length; n += 6) roundMarks.push(n)

  // Карточки отмечают data-question-id — по нему находим цель прокрутки.
  const scrollToQuestion = (id: number) => {
    document
      .querySelector(`[data-question-id="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Новый тестер из поля: создаём на сервере и сразу добавляем в общий список для автокомплита.
  const createBulkTester = async (name: string) => {
    const created = await createTester(name)
    setAllTesters((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]))
    return created
  }

  const applyBulk = async () => {
    const ids = pkg.questions.filter((q) => selectedIds.has(q.id)).map((q) => q.id)
    if (ids.length === 0 || bulkTesters.length === 0 || bulkBusy) return
    setBulkBusy(true)
    setBulkError(null)
    try {
      const updated = new Map(
        (await addTestersToQuestions(ids, bulkTesters.map((t) => t.id))).map((q) => [q.id, q]),
      )
      onPackagesChange(
        packages.map((p) => ({ ...p, questions: p.questions.map((q) => updated.get(q.id) ?? q) })),
      )
      setSelectedIds(new Set())
      setBulkTesters([])
    } catch (err) {
      setBulkError(String(err))
    } finally {
      setBulkBusy(false)
    }
  }

  const { sensors, collisionDetection, activeQuestion, handleDragStart, handleDragEnd, handleDragCancel } =
    useBoardDnd(packages, onPackagesChange)

  // Одна и та же кнопка сверху и снизу списка — длинный пакет не нужно прокручивать до конца.
  const addButton = (
    <button
      type="button"
      onClick={() => openCreate(pkg.id)}
      className="w-full rounded-md border border-dashed border-slate-600 py-3 text-base text-slate-400 hover:border-slate-400 hover:text-slate-200"
    >
      + Добавить вопрос
    </button>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <Link href="/" className="inline-block text-base text-sky-400 hover:underline">
          ← Все пакеты
        </Link>

        <div className="flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-baseline gap-2 text-2xl font-bold text-slate-100">
            <span className="truncate">{pkg.title}</span>
            <span className="shrink-0 font-normal text-slate-400">({pkg.questions.length})</span>
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {testerNames && (
              <CopyButton
                getText={() => testerNames}
                title="Скопировать всех тестеров пакета через запятую"
                doneLabel="Скопировано ✓"
                className="shrink-0 rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600"
              >
                Скопировать тестеров
              </CopyButton>
            )}
            <a
              href={packageDocxUrl(pkg.id)}
              title="Скачать docx с вопросами пакета (формат печатного тура)"
              className="shrink-0 rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600"
            >
              Скачать docx
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-column p-3">
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
            Отметить вопросы, которые тестировали
          </label>
          <TesterPicker all={allTesters} selected={marked} onChange={setMarked} dropDown />
        </div>

        {addButton}

        {/* Панель массовых действий: прилипает к верху при прокрутке длинного пакета */}
        <div className="sticky top-0 z-20 space-y-3 rounded-lg bg-column p-3 shadow-md">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={pkg.questions.length === 0}
                onChange={() =>
                  setSelectedIds(allSelected ? new Set() : new Set(pkg.questions.map((q) => q.id)))
                }
                className="h-4 w-4 accent-sky-500"
              />
              Выбрать все
            </label>
            <span className="text-slate-400">Выбрано: {selectedCount}</span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sky-400 hover:underline"
              >
                Снять выбор
              </button>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Добавить тестеров ко всем выбранным вопросам
              </label>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <TesterPicker
                    all={allTesters}
                    selected={bulkTesters}
                    onChange={setBulkTesters}
                    onCreate={createBulkTester}
                    dropDown
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBulk}
                  disabled={bulkTesters.length === 0 || bulkBusy}
                  className="shrink-0 rounded bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {bulkBusy ? 'Добавляю…' : `Добавить к ${selectedCount}`}
                </button>
              </div>
              {bulkError && <p className="text-xs text-red-400">{bulkError}</p>}
            </div>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <QuestionList
            pkg={pkg}
            marked={marked}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            openAnswers={openAnswers}
            onToggleAnswer={toggleAnswer}
          />
          <DragOverlay>
            {activeQuestion ? (
              <div className="cursor-grabbing opacity-95 shadow-2xl">
                <QuestionCard
                  question={activeQuestion}
                  large
                  highlightTesters={marked}
                  selected={selectedIds.has(activeQuestion.id)}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {addButton}
      </div>

      {/* Плавающая навигация: к началу/концу пакета и к вопросам с номерами, кратными 6 */}
      {pkg.questions.length > 0 && (
        <nav
          aria-label="Навигация по вопросам"
          className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-xl border border-slate-600/60 bg-column/95 p-2 shadow-lg backdrop-blur"
        >
          <NavButton
            primary
            title="К первому вопросу"
            onClick={() => scrollToQuestion(pkg.questions[0].id)}
          >
            ↑ Начало
          </NavButton>
          {roundMarks.map((n) => (
            <NavButton
              key={n}
              title={`К вопросу ${n} (конец тура)`}
              onClick={() => scrollToQuestion(pkg.questions[n - 1].id)}
            >
              {n}
            </NavButton>
          ))}
          <NavButton
            primary
            title="К последнему вопросу"
            onClick={() => scrollToQuestion(pkg.questions[pkg.questions.length - 1].id)}
          >
            Конец ↓
          </NavButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-slate-600" />
          <button
            type="button"
            onClick={toggleAllAnswers}
            title="Показать или скрыть ответы всех вопросов пакета"
            className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-100 transition hover:bg-slate-600"
          >
            {allAnswersOpen ? 'Скрыть все ответы' : 'Показать все ответы'}
          </button>
        </nav>
      )}
    </div>
  )
}

/** Вертикальный сортируемый список вопросов; сам контейнер — droppable (для пустого пакета). */
function QuestionList({
  pkg,
  marked,
  selectedIds,
  onToggleSelect,
  openAnswers,
  onToggleAnswer,
}: {
  pkg: Package
  marked: Tester[]
  selectedIds: Set<number>
  onToggleSelect: (questionId: number) => void
  openAnswers: Set<number>
  onToggleAnswer: (questionId: number) => void
}) {
  const { setNodeRef } = useDroppable({ id: containerId(pkg.id) })

  if (pkg.questions.length === 0) {
    return (
      <div ref={setNodeRef}>
        <p className="py-10 text-center text-base text-slate-500">В пакете пока нет вопросов</p>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="space-y-3">
      <SortableContext items={pkg.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        {pkg.questions.map((q, idx) => (
          <SortableQuestionCard
            key={q.id}
            question={q}
            packageId={pkg.id}
            index={idx}
            large
            highlightTesters={marked}
            selected={selectedIds.has(q.id)}
            onToggleSelect={onToggleSelect}
            answerOpen={openAnswers.has(q.id)}
            onToggleAnswer={() => onToggleAnswer(q.id)}
          />
        ))}
      </SortableContext>
    </div>
  )
}

/** Кнопка плавающей навигации; primary — «Начало»/«Конец» (подсвечены фоном). */
function NavButton({
  title,
  onClick,
  primary = false,
  children,
}: {
  title: string
  onClick: () => void
  primary?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`min-w-[2rem] rounded-md px-2 py-1 text-xs font-medium transition ${
        primary
          ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
          : 'text-slate-300 hover:bg-slate-600 hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

const MARKED_KEY = 'chgk:markedTesters'

/** Отмеченные тестеры; запоминаются в браузере (если localStorage недоступен — просто не запоминаются). */
function useMarkedTesters(): [Tester[], (next: Tester[]) => void] {
  const [marked, setMarkedState] = useState<Tester[]>(() => {
    try {
      const raw = window.localStorage.getItem(MARKED_KEY)
      return raw ? (JSON.parse(raw) as Tester[]) : []
    } catch {
      return []
    }
  })
  const setMarked = useMemo(
    () => (next: Tester[]) => {
      setMarkedState(next)
      try {
        window.localStorage.setItem(MARKED_KEY, JSON.stringify(next))
      } catch {
        /* не критично */
      }
    },
    [],
  )
  return [marked, setMarked]
}
