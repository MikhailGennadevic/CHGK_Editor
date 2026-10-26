import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { Link } from '../router'

interface PackageColumnProps {
  title: string
  /** Ссылка на страницу пакета; без неё заголовок — просто текст (DragOverlay). */
  href?: string
  count: number
  isUnsorted?: boolean
  /** Содержимое колонки (список вопросов). */
  children: ReactNode
  /** Ручка перетаскивания колонки; не передаётся в DragOverlay. */
  handleProps?: HTMLAttributes<HTMLButtonElement>
  handleRef?: Ref<HTMLButtonElement>
  /** Мягкое удаление пакета; не передаётся для «Неотсортированного». */
  onDelete?: () => void
}

/** Презентационная колонка пакета: без dnd-хуков, чтобы её же можно было рисовать в DragOverlay. */
export default function PackageColumn({
  title,
  href,
  count,
  isUnsorted = false,
  children,
  handleProps,
  handleRef,
  onDelete,
}: PackageColumnProps) {
  return (
    <section className="flex h-full w-96 shrink-0 flex-col rounded-xl bg-column">
      {/* Шапка колонки (не скроллится) */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            ref={handleRef}
            type="button"
            title="Перетащить пакет"
            aria-label="Перетащить пакет"
            className="cursor-grab touch-none text-slate-500 hover:text-slate-200 active:cursor-grabbing"
            {...handleProps}
          >
            ⠿
          </button>
          {/* Число вопросов — в скобках, не обрезается вместе с длинным названием */}
          <h2 className="flex min-w-0 items-baseline gap-1 text-sm font-semibold text-slate-100">
            <span className="truncate">
              {href ? (
                <Link href={href} title="Открыть страницу пакета" className="hover:text-sky-300 hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </span>
            <span className="shrink-0 font-normal text-slate-400">({count})</span>
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isUnsorted && (
            <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">
              база
            </span>
          )}
          {onDelete && (
            <button
              type="button"
              title="Удалить пакет"
              aria-label="Удалить пакет"
              onClick={onDelete}
              className="text-slate-500 hover:text-red-400"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Вертикальный скролл вопросов */}
      {children}
    </section>
  )
}
