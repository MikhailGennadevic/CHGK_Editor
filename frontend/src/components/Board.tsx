import { DndContext, DragOverlay } from '@dnd-kit/core'
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import type { Package } from '../types'
import { packageSortableId, useBoardDnd } from '../hooks/useBoardDnd'
import AddPackage from './AddPackage'
import PackageColumn from './PackageColumn'
import QuestionCard from './QuestionCard'
import SortablePackageColumn from './SortablePackageColumn'

interface BoardProps {
  /** Пакеты в порядке отображения (по order). */
  packages: Package[]
  onPackagesChange: (next: Package[]) => void
  onAddPackage: (title: string) => Promise<void>
  onDeletePackage: (pkg: Package) => void
}

/**
 * Доска: горизонтальный скролл колонок, внутри каждой колонки — вертикальный скролл вопросов.
 * heights: h-full опирается на то, что цепочка родителей до #root имеет высоту (см. index.css).
 */
export default function Board({
  packages,
  onPackagesChange,
  onAddPackage,
  onDeletePackage,
}: BoardProps) {
  const {
    sensors,
    collisionDetection,
    activeQuestion,
    activePackage,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useBoardDnd(packages, onPackagesChange)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-full overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max items-stretch gap-4 p-4">
          <SortableContext
            items={packages.map((p) => packageSortableId(p.id))}
            strategy={horizontalListSortingStrategy}
          >
            {packages.map((pkg) => (
              <SortablePackageColumn key={pkg.id} pkg={pkg} onDelete={onDeletePackage} />
            ))}
          </SortableContext>
          <AddPackage onAdd={onAddPackage} />
        </div>
      </div>

      <DragOverlay>
        {activeQuestion ? (
          <div className="rotate-1 cursor-grabbing">
            <QuestionCard question={activeQuestion} />
          </div>
        ) : activePackage ? (
          <div className="h-full cursor-grabbing">
            <PackageColumn
              title={activePackage.title}
              count={activePackage.questions.length}
              isUnsorted={activePackage.isUnsorted}
            >
              <div className="flex-1 space-y-2 overflow-hidden p-2">
                {activePackage.questions.map((q, idx) => (
                  <QuestionCard key={q.id} question={q} index={idx} />
                ))}
              </div>
            </PackageColumn>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
