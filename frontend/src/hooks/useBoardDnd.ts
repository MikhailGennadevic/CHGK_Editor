import { useCallback, useMemo, useState } from 'react'
import {
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Package, Question } from '../types'
import { moveQuestion, movePackage } from '../api'

// Id в dnd-kit должны быть уникальны среди ВСЕХ draggable/droppable сразу, а у вопросов
// и пакетов числовые id пересекаются — поэтому у пакетов и контейнеров есть префиксы.
const CONTAINER_PREFIX = 'container:'
const PACKAGE_PREFIX = 'package:'

export const containerId = (packageId: number) => `${CONTAINER_PREFIX}${packageId}`
export const packageSortableId = (packageId: number) => `${PACKAGE_PREFIX}${packageId}`

const isContainerId = (id: UniqueIdentifier): id is string =>
  typeof id === 'string' && id.startsWith(CONTAINER_PREFIX)
const isPackageId = (id: UniqueIdentifier): id is string =>
  typeof id === 'string' && id.startsWith(PACKAGE_PREFIX)

const parsePackageId = (id: string) => Number(id.slice(PACKAGE_PREFIX.length))

/** Плотная нумерация order 0..n-1. */
const renumber = <T extends { order: number }>(list: T[]): T[] =>
  list.map((item, i) => ({ ...item, order: i }))

interface UseBoardDndResult {
  sensors: ReturnType<typeof useSensors>
  collisionDetection: CollisionDetection
  activeQuestion: Question | null
  activePackage: Package | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragCancel: () => void
}

/**
 * Вся логика multi-container DnD для Kanban-доски ЧГК: перенос вопросов между
 * пакетами и перестановка самих пакетов (вопросы едут вместе с пакетом, т.к. лежат в нём).
 *
 * Ключевые решения по производительности (чтобы доска не лагала):
 *  1. Порядок пересчитываем ОДИН раз в handleDragEnd. Никакого setState в
 *     onDragOver/onDragMove — именно они в multi-container вызывают каскад
 *     ре-рендеров на каждый кадр и «дёрганье» карточек.
 *  2. Визуальное перемещение во время drag делает @dnd-kit через CSS transform
 *     (Translate) + DragOverlay, а не перестановкой узлов в DOM.
 *  3. Плотная пере-нумерация order на фронте и на бэкенде (0..n-1) — нет дыр.
 */
export function useBoardDnd(
  packages: Package[],
  onPackagesChange: (next: Package[]) => void,
): UseBoardDndResult {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  // distance: 6px — чтобы обычный клик/скролл не запускал перетаскивание.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Пакет конкурирует только с другими пакетами, вопрос — только с вопросами/контейнерами.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (isPackageId(args.active.id)) {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => isPackageId(c.id)),
      })
    }
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => !isPackageId(c.id)),
    })
  }, [])

  /** По id (контейнер или вопрос) возвращает packageId контейнера, в котором он лежит. */
  const findContainer = useCallback(
    (id: UniqueIdentifier): number | null => {
      if (isContainerId(id)) return Number(id.slice(CONTAINER_PREFIX.length))
      const pkg = packages.find((p) => p.questions.some((q) => q.id === id))
      return pkg ? pkg.id : null
    },
    [packages],
  )

  const activeQuestion = useMemo(() => {
    if (activeId == null || isContainerId(activeId) || isPackageId(activeId)) return null
    for (const pkg of packages) {
      const found = pkg.questions.find((q) => q.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, packages])

  const activePackage = useMemo(() => {
    if (activeId == null || !isPackageId(activeId)) return null
    return packages.find((p) => p.id === parsePackageId(activeId)) ?? null
  }, [activeId, packages])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  /** Перестановка колонок. Вопросы лежат внутри пакета, поэтому переезжают вместе с ним. */
  const handlePackageDragEnd = useCallback(
    (activeKey: string, overKey: string) => {
      const oldIndex = packages.findIndex((p) => p.id === parsePackageId(activeKey))
      const newIndex = packages.findIndex((p) => p.id === parsePackageId(overKey))
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

      const prevPackages = packages
      const packageId = packages[oldIndex].id
      onPackagesChange(renumber(arrayMove(packages, oldIndex, newIndex)))

      movePackage(packageId, newIndex).catch((err) => {
        console.error('movePackage failed, rolling back', err)
        onPackagesChange(prevPackages)
      })
    },
    [packages, onPackagesChange],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (!over) return

      if (isPackageId(active.id)) {
        if (isPackageId(over.id) && active.id !== over.id) handlePackageDragEnd(active.id, over.id)
        return
      }

      const questionId = active.id as number
      if (questionId === over.id) return

      const fromId = findContainer(active.id)
      const toId = findContainer(over.id)
      if (fromId == null || toId == null) return

      const fromPkg = packages.find((p) => p.id === fromId)
      const question = fromPkg?.questions.find((q) => q.id === questionId)
      if (!fromPkg || !question) return

      const prevPackages = packages

      // Индекс вставки = индекс целевого элемента (over-вопрос) либо «в конец»
      // (over — это фон контейнера). Совпадает с логикой бэкенда move_question.
      const resolveInsertIndex = (list: Question[]): number => {
        if (isContainerId(over.id)) return list.length
        const idx = list.findIndex((q) => q.id === over.id)
        return idx < 0 ? list.length : idx
      }

      let nextPackages: Package[]
      let newOrder: number

      if (fromId === toId) {
        // Пересортировка внутри одного пакета.
        const oldIndex = fromPkg.questions.findIndex((q) => q.id === questionId)
        const withoutDragged = fromPkg.questions.filter((q) => q.id !== questionId)
        const newIndex = resolveInsertIndex(withoutDragged)
        if (newIndex === oldIndex) return
        newOrder = newIndex
        const reordered = arrayMove(fromPkg.questions, oldIndex, newIndex)
        nextPackages = packages.map((p) =>
          p.id === fromId ? { ...p, questions: renumber(reordered) } : p,
        )
      } else {
        // Перенос в другой пакет.
        const toPkg = packages.find((p) => p.id === toId)
        if (!toPkg) return

        const remainingFrom = fromPkg.questions.filter((q) => q.id !== questionId)
        const newIndex = resolveInsertIndex(toPkg.questions)
        newOrder = newIndex
        const inserted = [...toPkg.questions]
        inserted.splice(newIndex, 0, { ...question, packageId: toId })

        nextPackages = packages.map((p) => {
          if (p.id === fromId) return { ...p, questions: renumber(remainingFrom) }
          if (p.id === toId) return { ...p, questions: renumber(inserted) }
          return p
        })
      }

      // Оптимистичное обновление UI.
      onPackagesChange(nextPackages)

      // Затем синхронизируем с бэкендом; при ошибке — откатываемся к prevPackages.
      moveQuestion(questionId, toId, newOrder).catch((err) => {
        console.error('moveQuestion failed, rolling back', err)
        onPackagesChange(prevPackages)
      })
    },
    [packages, findContainer, onPackagesChange, handlePackageDragEnd],
  )

  return {
    sensors,
    collisionDetection,
    activeQuestion,
    activePackage,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
