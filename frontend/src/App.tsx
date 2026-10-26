import { useCallback, useEffect, useMemo, useState } from 'react'
import Board from './components/Board'
import PackagePage from './components/PackagePage'
import { Link, parsePackagePath, usePath } from './router'
import { createPackage, createQuestion, deletePackage, deleteQuestion, fetchPackages, updateQuestion } from './api'
import type { QuestionInput } from './api'
import QuestionEditorModal from './components/QuestionEditorModal'
import { QuestionEditorContext } from './context/questionEditor'
import type { Package, Question } from './types'

export default function App() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const path = usePath()
  const routePackageId = parsePackagePath(path)
  const [error, setError] = useState<string | null>(null)

  // Окно вопроса: создание (в пакет) или редактирование (существующий вопрос).
  const [editor, setEditor] = useState<
    { mode: 'create'; packageId: number } | { mode: 'edit'; question: Question } | null
  >(null)

  // Мягкое удаление на сервере, затем убираем вопрос с доски и сжимаем порядок в его пакете.
  const removeQuestion = useCallback(async (id: number) => {
    await deleteQuestion(id)
    setPackages((prev) =>
      (prev ?? []).map((p) =>
        p.questions.some((q) => q.id === id)
          ? { ...p, questions: p.questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i })) }
          : p,
      ),
    )
  }, [])

  const editorActions = useMemo(
    () => ({
      openCreate: (packageId: number) => setEditor({ mode: 'create', packageId }),
      openEdit: (question: Question) => setEditor({ mode: 'edit', question }),
      requestDelete: (question: Question) => {
        if (!window.confirm('Удалить этот вопрос?')) return
        removeQuestion(question.id).catch((err) => window.alert(`Не удалось удалить вопрос: ${err}`))
      },
    }),
    [removeQuestion],
  )
  const closeEditor = useCallback(() => setEditor(null), [])

  const submitEditor = useCallback(
    async (input: QuestionInput) => {
      if (!editor) return
      if (editor.mode === 'create') {
        const created = await createQuestion(editor.packageId, input)
        setPackages((prev) =>
          (prev ?? []).map((p) =>
            p.id === editor.packageId ? { ...p, questions: [...p.questions, created] } : p,
          ),
        )
      } else {
        const updated = await updateQuestion(editor.question.id, input)
        setPackages((prev) =>
          (prev ?? []).map((p) => ({
            ...p,
            questions: p.questions.map((q) => (q.id === updated.id ? updated : q)),
          })),
        )
        // Редактирование: окно не закрываем — остаёмся для дальнейшей работы.
        return
      }
      setEditor(null)
    },
    [editor],
  )

  const deleteEditorQuestion = useCallback(async () => {
    if (!editor || editor.mode !== 'edit') return
    await removeQuestion(editor.question.id)
    setEditor(null)
  }, [editor, removeQuestion])

  const load = useCallback(() => {
    setError(null)
    fetchPackages()
      .then((list) => setPackages([...list].sort((a, b) => a.order - b.order)))
      .catch((err) => setError(String(err)))
  }, [])

  useEffect(load, [load])

  const handleAddPackage = useCallback(async (title: string) => {
    const created = await createPackage(title)
    setPackages((prev) => [...(prev ?? []), created])
  }, [])

  const handleDeletePackage = useCallback(
    (pkg: Package) => {
      const n = pkg.questions.length
      if (!window.confirm(`Удалить пакет «${pkg.title}» вместе с вопросами (${n})?`)) return

      // Оптимистично убираем колонку; при ошибке подтягиваем актуальное состояние с сервера.
      setPackages((prev) =>
        (prev ?? []).filter((p) => p.id !== pkg.id).map((p, i) => ({ ...p, order: i })),
      )
      deletePackage(pkg.id).catch((err) => {
        console.error('deletePackage failed', err)
        load()
      })
    },
    [load],
  )

  return (
    <QuestionEditorContext.Provider value={editorActions}>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-slate-100 hover:text-sky-300">
            CHGK Editor
          </Link>
          {packages && (
            <span className="text-xs text-slate-400">
              {packages.length} пакетов ·{' '}
              {packages.reduce((sum, p) => sum + p.questions.length, 0)} вопросов
            </span>
          )}
        </header>

        <main className="min-h-0 flex-1">
          {error ? (
            <div className="p-4 text-sm text-red-400">
              Не удалось загрузить пакеты: {error}{' '}
              <button type="button" onClick={load} className="underline">
                Повторить
              </button>
            </div>
          ) : packages && routePackageId != null ? (
            (() => {
              const pkg = packages.find((p) => p.id === routePackageId)
              return pkg ? (
                <PackagePage
                  key={pkg.id}
                  pkg={pkg}
                  packages={packages}
                  onPackagesChange={setPackages}
                />
              ) : (
                <div className="p-4 text-sm text-slate-400">
                  Пакет не найден (возможно, он удалён).{' '}
                  <Link href="/" className="text-sky-400 hover:underline">
                    К доске
                  </Link>
                </div>
              )
            })()
          ) : packages ? (
            <Board
              packages={packages}
              onPackagesChange={setPackages}
              onAddPackage={handleAddPackage}
              onDeletePackage={handleDeletePackage}
            />
          ) : (
            <div className="p-4 text-sm text-slate-400">Загрузка…</div>
          )}
        </main>

        {editor && (
          <QuestionEditorModal
            // key: при смене вопроса форма пересоздаётся с новыми начальными значениями.
            key={editor.mode === 'edit' ? editor.question.id : `new-${editor.packageId}`}
            question={editor.mode === 'edit' ? editor.question : null}
            onSubmit={submitEditor}
            onDelete={editor.mode === 'edit' ? deleteEditorQuestion : undefined}
            onClose={closeEditor}
          />
        )}
      </div>
    </QuestionEditorContext.Provider>
  )
}
