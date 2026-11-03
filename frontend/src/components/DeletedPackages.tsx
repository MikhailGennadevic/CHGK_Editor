import { useEffect, useState } from 'react'
import { fetchDeletedPackages, restorePackage } from '../api'
import type { DeletedPackage } from '../types'

interface Props {
  /** После восстановления — обновить доску (перезагрузка списка пакетов). */
  onRestored: () => void
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Панель «Удалённые пакеты»: список мягко удалённых пакетов с кнопкой восстановления. */
export default function DeletedPackages({ onRestored, onClose }: Props) {
  const [items, setItems] = useState<DeletedPackage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    fetchDeletedPackages()
      .then(setItems)
      .catch((err) => setError(String(err)))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const restore = async (id: number) => {
    setBusyId(id)
    setError(null)
    try {
      await restorePackage(id)
      setItems((prev) => (prev ?? []).filter((p) => p.id !== id))
      onRestored()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusyId(null)
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
        aria-label="Удалённые пакеты"
        className="flex max-h-full w-full max-w-md flex-col rounded-xl bg-column shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-100">Удалённые пакеты</h2>
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
          {error && <p className="text-xs text-red-400">{error}</p>}
          {items === null ? (
            <p className="text-sm text-slate-400">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">Удалённых пакетов нет</p>
          ) : (
            <ul className="space-y-2">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">{p.title}</p>
                    <p className="text-xs text-slate-400">
                      {p.questionsCount} вопр. · удалён {formatDate(p.deletedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restore(p.id)}
                    disabled={busyId === p.id}
                    className="shrink-0 rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {busyId === p.id ? '…' : 'Восстановить'}
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
