import { useEffect, useState } from 'react'
import type { Package, Question } from '../types'

interface Props {
  question: Question
  /** Куда можно перенести (пакеты без текущего). */
  targets: Package[]
  /** Перенос в конец целевого пакета; при ошибке промис отклоняется — сообщение здесь. */
  onMove: (target: Package) => Promise<void>
  onClose: () => void
}

/** Диалог «Перенести в другой пакет»: список пакетов-целей, перенос в конец. */
export default function MoveQuestionDialog({ question, targets, onMove, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handle = async (target: Package) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await onMove(target)
    } catch (err) {
      setError(String(err))
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Перенести вопрос"
        className="flex max-h-full w-full max-w-md flex-col rounded-xl bg-column shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="min-w-0 truncate text-base font-semibold text-slate-100">Перенести в другой пакет</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-slate-400 hover:text-slate-100"
          >
            ✕
          </button>
        </header>

        <div className="space-y-2 overflow-y-auto p-4">
          <p className="min-w-0 truncate text-xs text-slate-400">Вопрос: {question.text}</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {targets.length === 0 ? (
            <p className="text-sm text-slate-400">Нет других пакетов</p>
          ) : (
            <ul className="space-y-2">
              {targets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handle(t)}
                    disabled={busy}
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-left transition hover:bg-slate-700/60 disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate text-sm text-slate-100">{t.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{t.questions.length} вопр.</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
