import { useState, type FormEvent } from 'react'

interface Props {
  onAdd: (title: string) => Promise<void>
}

export default function AddPackage({ onAdd }: Props) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => {
    setEditing(false)
    setTitle('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = title.trim()
    if (!value || busy) return
    setBusy(true)
    try {
      await onAdd(value)
      close()
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="h-12 w-96 shrink-0 rounded-xl border border-dashed border-slate-600 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-200"
      >
        + Добавить пакет
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="h-fit w-96 shrink-0 rounded-xl bg-column p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        placeholder="Название пакета"
        maxLength={255}
        className="w-full rounded border border-slate-600 bg-board px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-slate-400"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          Добавить
        </button>
        <button type="button" onClick={close} className="px-2 text-xs text-slate-400 hover:text-slate-200">
          Отмена
        </button>
      </div>
    </form>
  )
}
