import { useState, type HTMLAttributes, type Ref } from 'react'
import type { Question, Tester } from '../types'
import { handoutUrl } from '../api'
import CopyButton from './CopyButton'
import { useQuestionEditor } from '../context/questionEditor'
import TesterAvatar from './TesterAvatar'

interface QuestionCardProps {
  question: Question
  /** Порядковый номер вопроса в пакете (для отображения). */
  index?: number
  /** Крупный режим для страницы пакета (шрифт и отступы больше, чем на доске). */
  large?: boolean
  /** Ручка перетаскивания в заголовке; без неё карточку тянут целиком (доска). */
  handleProps?: HTMLAttributes<HTMLButtonElement>
  handleRef?: Ref<HTMLButtonElement>
  /** Выбранные на странице пакета тестеры: если кто-то из них тестировал вопрос — лейбл. */
  highlightTesters?: Tester[]
  /** Массовый выбор (страница пакета): отмечена ли карточка и обработчик переключения. */
  selected?: boolean
  onToggleSelect?: (questionId: number) => void
  /** Управляемая видимость ответа (страница пакета); без неё видимость решает локальный стейт. */
  answerOpen?: boolean
  onToggleAnswer?: () => void
}

/** Всё, кроме текста вопроса: ответ, зачёты, незачёт, комментарий и источники. */
function answerBlockText(q: Question): string {
  const parts = [`Ответ: ${q.answer}`]
  if (q.alternativeAnswers.length > 0)
    parts.push(`Зачёт: ${q.alternativeAnswers.map((a) => a.text).join(', ')}`)
  if (q.rejectedAnswer) parts.push(`Незачёт: ${q.rejectedAnswer}`)
  if (q.comment) parts.push(`Комментарий: ${q.comment}`)
  if (q.sources.length > 0) parts.push(`Источник: ${q.sources.map((s) => s.text).join('\n')}`)
  return parts.join('\n')
}

// Сколько аватарок показывать в свёрнутом виде; остальные — счётчиком «+N».
const MAX_AVATARS = 5

const URL_RE = /(https?:\/\/[^\s]+)/g

/** Текст, в котором http(s)-адреса превращены в ссылки. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        // split с группой отдаёт найденные адреса на нечётных позициях.
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  )
}

export default function QuestionCard({
  question,
  index,
  large = false,
  handleProps,
  handleRef,
  highlightTesters,
  selected = false,
  onToggleSelect,
  answerOpen,
  onToggleAnswer,
}: QuestionCardProps) {
  const [localAnswer, setLocalAnswer] = useState(false)
  const [testersVisible, setTestersVisible] = useState(false)
  const { openEdit, requestDelete } = useQuestionEditor()

  const answerVisible = answerOpen ?? localAnswer
  const toggleAnswer = () => (onToggleAnswer ? onToggleAnswer() : setLocalAnswer((v) => !v))

  const matched = highlightTesters?.length
    ? question.testers.filter((tester) => highlightTesters.some((h) => h.id === tester.id))
    : []

  // Размеры текста: компактные для колонок доски, крупные для страницы пакета.
  const t = large
    ? { pad: 'p-5', body: 'text-lg', small: 'text-base', label: 'text-xs', badge: 'text-sm', btn: 'text-sm py-2' }
    : { pad: 'p-3', body: 'text-sm', small: 'text-xs', label: 'text-[11px]', badge: 'text-xs', btn: 'text-xs py-1' }

  return (
    <article
      data-question-id={question.id}
      className={`rounded-lg border border-slate-600/60 bg-card ${t.pad} shadow-sm transition hover:border-slate-400 ${
        // scroll-mt: при переходе из плавающей навигации липкая панель сверху не перекрывает карточку.
        large ? 'scroll-mt-36' : ''
      } ${selected ? 'ring-2 ring-sky-500' : ''}`}
    >
      {matched.length > 0 && (
        <p
          className={`mb-2 inline-block rounded bg-emerald-900/60 px-2 py-0.5 font-medium text-emerald-300 ${t.label}`}
        >
          ✓ Этот вопрос {matched.length > 1 ? 'тестировали' : 'тестировал'}:{' '}
          {matched.map((m) => m.name).join(', ')}
        </p>
      )}

      {/* Раздатка — часть условия, поэтому стоит выше текста и видна всегда; клик открывает оригинал */}
      {question.handout && (
        <a
          href={handoutUrl(question.handout)}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block"
        >
          <img
            src={handoutUrl(question.handout)}
            alt="Раздатка"
            loading="lazy"
            draggable={false}
            className={`w-full rounded border border-slate-600/60 bg-slate-900/40 object-contain ${
              large ? 'max-h-96' : 'max-h-40'
            }`}
          />
        </a>
      )}

      {/* Заголовок карточки: номер + текст вопроса */}
      <div className="flex items-start gap-2">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(question.id)}
            title="Выбрать вопрос"
            aria-label="Выбрать вопрос"
            className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer accent-sky-500"
          />
        )}
        {(handleProps || handleRef) && (
          <button
            ref={handleRef}
            type="button"
            title="Перетащить вопрос"
            aria-label="Перетащить вопрос"
            className={`shrink-0 cursor-grab touch-none ${t.body} text-slate-500 hover:text-slate-200 active:cursor-grabbing`}
            {...handleProps}
          >
            ⠿
          </button>
        )}
        {typeof index === 'number' && (
          <span className={`mt-0.5 shrink-0 rounded bg-slate-700 px-1.5 py-0.5 ${t.badge} font-semibold text-slate-300`}>
            {index + 1}
          </span>
        )}
        <p className={`min-w-0 flex-1 whitespace-pre-line ${t.body} leading-snug text-slate-100`}>{question.text}</p>
        {!question.comment && (
          <span
            title="Комментарий не заполнен"
            aria-label="Комментарий не заполнен"
            className={`mt-0.5 shrink-0 ${t.body} text-amber-400`}
          >
            ⚠
          </span>
        )}
        {question.sources.length === 0 && (
          <span
            title="Источник не указан"
            aria-label="Источник не указан"
            className={`mt-0.5 shrink-0 ${t.body} text-amber-400`}
          >
            ✒
          </span>
        )}
        <CopyButton
          getText={() => question.text}
          title="Копировать текст вопроса"
          className={`shrink-0 ${t.body} text-slate-500 hover:text-slate-100`}
        >
          ⧉
        </CopyButton>
        <button
          type="button"
          title="Редактировать вопрос"
          aria-label="Редактировать вопрос"
          onClick={() => openEdit(question)}
          className={`shrink-0 ${t.body} text-slate-500 hover:text-slate-100`}
        >
          ✎
        </button>
        <button
          type="button"
          title="Удалить вопрос"
          aria-label="Удалить вопрос"
          onClick={() => requestDelete(question)}
          className={`shrink-0 ${t.body} text-slate-500 hover:text-red-400`}
        >
          ✕
        </button>
      </div>

      {/* Ответ: скрыт по умолчанию, открывается по клику */}
      <button
        type="button"
        onClick={toggleAnswer}
        className={`mt-2 w-full rounded-md bg-slate-700/70 px-2 text-left font-medium text-slate-200 transition hover:bg-slate-600 ${t.btn}`}
      >
        {answerVisible ? 'Скрыть ответ ▲' : 'Показать ответ ▼'}
      </button>

      {answerVisible && (
        <div className={`mt-2 space-y-2 rounded-md bg-slate-800/60 ${large ? "p-3" : "p-2"}`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className={`${t.label} uppercase tracking-wide text-emerald-400`}>Ответ</span>
              <CopyButton
                getText={() => answerBlockText(question)}
                title="Копировать ответ, зачёты, комментарий и источники"
                doneLabel="Скопировано ✓"
                className="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-600"
              >
                Копировать
              </CopyButton>
            </div>
            <p className={`${t.body} font-semibold text-emerald-300`}>{question.answer}</p>
          </div>

          {question.alternativeAnswers.length > 0 && (
            <div>
              <span className={`${t.label} uppercase tracking-wide text-sky-400`}>
                Зачёты ({question.alternativeAnswers.length})
              </span>
              <ul className={`mt-1 list-disc space-y-0.5 pl-4 ${t.small} text-slate-300`}>
                {question.alternativeAnswers.map((alt) => (
                  <li key={alt.id}>{alt.text}</li>
                ))}
              </ul>
            </div>
          )}

          {question.rejectedAnswer && (
            <div>
              <span className={`${t.label} uppercase tracking-wide text-red-400`}>Незачёт</span>
              <p className={`${t.small} text-slate-300`}>{question.rejectedAnswer}</p>
            </div>
          )}

          {question.comment && (
            <div>
              <span className={`${t.label} uppercase tracking-wide text-amber-400`}>Комментарий</span>
              <p className={`whitespace-pre-line ${t.small} italic text-slate-300`}>{question.comment}</p>
            </div>
          )}

          {/* Источники: раскрываются вместе с ответом */}
          {question.sources.length > 0 && (
            <div>
              <span className={`${t.label} uppercase tracking-wide text-slate-400`}>
                Источники ({question.sources.length})
              </span>
              <ul className={`mt-1 space-y-0.5 ${t.small} text-slate-400`}>
                {question.sources.map((source) => (
                  <li key={source.id} className="break-words">
                    <Linkified text={source.text} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Тестеры: аватарки + имена; кнопка раскрывает полный список текстом */}
      {question.testers.length > 0 && (
        <div className="mt-3 border-t border-slate-600/50 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 -space-x-1.5">
              {question.testers.slice(0, MAX_AVATARS).map((tester) => (
                <TesterAvatar key={tester.id} name={tester.name} />
              ))}
              {question.testers.length > MAX_AVATARS && (
                <span className="flex h-6 shrink-0 items-center rounded-full bg-slate-600 px-1.5 text-[10px] font-bold text-slate-200 ring-2 ring-slate-700">
                  +{question.testers.length - MAX_AVATARS}
                </span>
              )}
            </div>
            {!testersVisible && (
              <span className={`min-w-0 flex-1 truncate ${t.label} text-slate-400`}>
                {question.testers.map((tester) => tester.name).join(', ')}
              </span>
            )}
            <button
              type="button"
              onClick={() => setTestersVisible((v) => !v)}
              className={`ml-auto shrink-0 ${t.label} text-sky-400 hover:underline`}
            >
              {testersVisible ? 'Скрыть ▲' : `Все тестеры (${question.testers.length}) ▼`}
            </button>
          </div>
          {testersVisible && (
            <p className={`mt-2 ${t.small} leading-snug text-slate-300`}>
              {question.testers.map((tester) => tester.name).join(', ')}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
