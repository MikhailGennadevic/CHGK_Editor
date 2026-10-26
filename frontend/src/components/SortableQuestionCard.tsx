import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Question, Tester } from '../types'
import QuestionCard from './QuestionCard'

interface SortableQuestionCardProps {
  question: Question
  packageId: number
  index: number
  /** Страница пакета: крупная карточка, тянется только за ручку (текст можно выделять). */
  large?: boolean
  highlightTesters?: Tester[]
  selected?: boolean
  onToggleSelect?: (questionId: number) => void
  answerOpen?: boolean
  onToggleAnswer?: () => void
}

/**
 * Sortable-обёртка над QuestionCard.
 * memo + стабильные props, чтобы при drag перерисовывались только затронутые карточки.
 */
function SortableQuestionCardImpl({
  question,
  packageId,
  index,
  large = false,
  highlightTesters,
  selected,
  onToggleSelect,
  answerOpen,
  onToggleAnswer,
}: SortableQuestionCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    // Передаём packageId в data — на случай, если понадобится в кастомной коллизии.
    data: { packageId },
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // isDragging: саму карточку делаем «призраком» (placeholder), а реальное
      // перемещение рисует DragOverlay — это и убирает лаги перерисовки.
      className={isDragging ? 'opacity-40' : undefined}
      {...(large ? {} : { ...attributes, ...listeners })}
    >
      <QuestionCard
        question={question}
        index={index}
        large={large}
        highlightTesters={highlightTesters}
        selected={selected}
        onToggleSelect={onToggleSelect}
        answerOpen={answerOpen}
        onToggleAnswer={onToggleAnswer}
        handleRef={large ? setActivatorNodeRef : undefined}
        handleProps={large ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  )
}

const SortableQuestionCard = memo(SortableQuestionCardImpl)
export default SortableQuestionCard
