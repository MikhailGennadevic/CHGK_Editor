import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  value: string
  /** Сохранить новое значение (вызывается с обрезанным непустым текстом). Ошибка — исключение, режим не закрывается. */
  onCommit: (next: string) => Promise<void>
  /** Как отрисовать название в обычном режиме (по умолчанию — просто текст). */
  renderText?: (value: string) => ReactNode
  /** Классы контейнера. */
  className?: string
}

/** Название с редактированием на месте: ✎ — ввод, Enter/blur — сохранить, Esc — отмена. */
export default function EditableTitle({ value, onCommit, renderText, className }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const start = () => {
    setDraft(value)
    setError(false)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError(false)
  }

  const commit = async () => {
    if (busy) return
    const next = draft.trim()
    if (!next || next === value) {
      cancel()
      return
    }
    setBusy(true)
    setError(false)
    try {
      await onCommit(next)
      setEditing(false)
    } catch {
      setError(true) // остаёмся в режиме редактирования, рамка красная
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <span className={`group/edit inline-flex min-w-0 items-center gap-1 ${className ?? ''}`}>
        <span className="min-w-0 truncate">{renderText ? renderText(value) : value}</span>
        <button
          type="button"
          onClick={start}
          title="Переименовать пакет"
          aria-label="Переименовать пакет"
          className="shrink-0 text-[11px] text-slate-500 opacity-0 transition hover:text-slate-200 group-hover/edit:opacity-100 focus-visible:opacity-100"
        >
          ✎
        </button>
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void commit()
        else if (e.key === 'Escape') cancel()
      }}
      disabled={busy}
      aria-label="Название пакета"
      title={error ? 'Не удалось сохранить — Enter ещё раз' : undefined}
      className={`min-w-0 flex-1 rounded border bg-board px-1 py-0.5 text-sm font-semibold text-slate-100 outline-none ${
        error ? 'border-red-500' : 'border-slate-500 focus:border-sky-500'
      }`}
    />
  )
}
