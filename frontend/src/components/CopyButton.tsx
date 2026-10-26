import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copyText } from '../clipboard'

interface Props {
  /** Что копировать; вычисляется в момент клика. */
  getText: () => string
  title: string
  className?: string
  /** Содержимое кнопки в обычном состоянии. */
  children: ReactNode
  /** Что показать после копирования. */
  doneLabel?: ReactNode
}

/** Кнопка «копировать»: на секунду показывает ✓ (или ✗, если буфер недоступен). */
export default function CopyButton({ getText, title, className, children, doneLabel = '✓' }: Props) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = async () => {
    setState((await copyText(getText())) ? 'done' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1500)
  }

  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={className}>
      {state === 'done' ? doneLabel : state === 'failed' ? '✗' : children}
    </button>
  )
}
