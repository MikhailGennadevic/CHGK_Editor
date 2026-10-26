import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Package } from '../types'
import { containerId, packageSortableId } from '../hooks/useBoardDnd'
import { packagePath } from '../router'
import { useQuestionEditor } from '../context/questionEditor'
import PackageColumn from './PackageColumn'
import SortableQuestionCard from './SortableQuestionCard'

interface Props {
  pkg: Package
  onDelete: (pkg: Package) => void
}

/** Колонка, которую можно переставлять (за ручку) и в которую можно бросать вопросы. */
export default function SortablePackageColumn({ pkg, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: packageSortableId(pkg.id), data: { type: 'package' } })

  const { openCreate } = useQuestionEditor()

  // Фон колонки — droppable для «бросить в конец / в пустой пакет».
  const { setNodeRef: setDropRef } = useDroppable({ id: containerId(pkg.id) })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`h-full shrink-0 ${isDragging ? 'opacity-40' : ''}`}
    >
      <PackageColumn
        title={pkg.title}
        href={packagePath(pkg.id)}
        count={pkg.questions.length}
        isUnsorted={pkg.isUnsorted}
        handleRef={setActivatorNodeRef}
        handleProps={{ ...attributes, ...listeners }}
        onDelete={pkg.isUnsorted ? undefined : () => onDelete(pkg)}
      >
        <div ref={setDropRef} className="flex-1 space-y-2 overflow-y-auto p-2">
          <SortableContext
            items={pkg.questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {pkg.questions.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-500">
                Пусто — перетащите вопрос сюда
              </p>
            ) : (
              pkg.questions.map((q, idx) => (
                <SortableQuestionCard key={q.id} question={q} packageId={pkg.id} index={idx} />
              ))
            )}
          </SortableContext>
        </div>
        <button
          type="button"
          onClick={() => openCreate(pkg.id)}
          className="m-2 mt-0 rounded-md border border-dashed border-slate-600 py-1.5 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-200"
        >
          + Добавить вопрос
        </button>
      </PackageColumn>
    </div>
  )
}
