import { useMemo, useState } from 'react'
import type { Tester } from '../types'
import TesterAvatar from './TesterAvatar'

interface Props {
  all: Tester[]
  selected: Tester[]
  onChange: (next: Tester[]) => void
  /** Создаёт тестера с таким именем и возвращает его; без него пункта «Создать» нет. */
  onCreate?: (name: string) => Promise<Tester>
  /** Куда раскрывается список: в окне вопроса — вверх, на странице — вниз. */
  dropDown?: boolean
}

/** Выбор тестеров: чипы выбранных + поле с автокомплитом по остальным. */
export default function TesterPicker({ all, selected, onChange, onCreate, dropDown = false }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const taken = new Set(selected.map((t) => t.id))
    return all.filter((t) => !taken.has(t.id) && t.name.toLowerCase().includes(q))
  }, [all, selected, query])

  const add = (tester: Tester) => {
    if (selected.some((t) => t.id === tester.id)) return
    onChange([...selected, tester])
    setQuery('')
    setHighlight(0)
    setError(null)
  }

  // Предлагаем создать нового, если введённого имени нет среди всех тестеров.
  const newName = query.trim().replace(/\s+/g, ' ')
  const canCreate =
    onCreate !== undefined &&
    newName !== '' && !all.some((t) => t.name.toLowerCase() === newName.toLowerCase())
  // Позиции в списке: сначала найденные тестеры, затем (если можно) пункт «Создать».
  const itemCount = options.length + (canCreate ? 1 : 0)

  const create = async () => {
    if (creating || !onCreate) return
    setCreating(true)
    setError(null)
    try {
      add(await onCreate(newName))
    } catch (err) {
      setError(String(err))
    } finally {
      setCreating(false)
    }
  }

  const pick = (index: number) => {
    if (index < options.length) add(options[index])
    else if (canCreate) void create()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, itemCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      // Enter в поле не должен отправлять форму.
      e.preventDefault()
      if (open && highlight < itemCount) pick(highlight)
    } else if (e.key === 'Escape' && open) {
      // Закрываем только список, а не всё окно.
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      setOpen(false)
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      onChange(selected.slice(0, -1))
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-slate-600 bg-board px-2 py-1.5 focus-within:border-slate-400">
        {selected.map((t) => (
          <span
            key={t.id}
            className="flex items-center gap-1 rounded-full bg-slate-700 py-0.5 pl-0.5 pr-2 text-xs text-slate-100"
          >
            <TesterAvatar name={t.name} />
            {t.name}
            <button
              type="button"
              aria-label={`Убрать ${t.name}`}
              onClick={() => onChange(selected.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-red-400"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={query}
          placeholder={selected.length ? '' : 'Начните вводить имя…'}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-slate-100 outline-none"
        />
      </div>

      {open && (
        <ul className={`absolute z-10 max-h-48 w-full overflow-y-auto rounded border border-slate-600 bg-column py-1 shadow-lg ${
            dropDown ? 'top-full mt-1' : 'bottom-full mb-1'
          }`}>
          {itemCount === 0 && (
            <li className="px-3 py-1.5 text-xs text-slate-500">Никого не найдено</li>
          )}
          {options.map((t, i) => (
              <li
                key={t.id}
                // mousedown, а не click: иначе blur у поля закроет список раньше клика.
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(t)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer px-3 py-1.5 text-sm text-slate-100 ${
                  i === highlight ? 'bg-slate-600' : ''
                }`}
              >
                {t.name}
              </li>
            ))}
          {canCreate && (
            <li
              onMouseDown={(e) => {
                e.preventDefault()
                void create()
              }}
              onMouseEnter={() => setHighlight(options.length)}
              className={`cursor-pointer px-3 py-1.5 text-sm text-sky-300 ${
                highlight === options.length ? 'bg-slate-600' : ''
              }`}
            >
              + Создать «{newName}»
            </li>
          )}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
