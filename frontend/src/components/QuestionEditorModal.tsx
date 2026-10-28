import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createTester, fetchTesters, handoutUrl, uploadHandout, type QuestionInput } from '../api'
import { loadEditorDraft, saveEditorDraft } from '../editorStorage'
import type { Question, Tester } from '../types'
import TesterPicker from './TesterPicker'

interface Props {
  /** Вопрос для редактирования; null — создание нового. */
  question: Question | null
  /** Ключ черновика в sessionStorage (привязан к вопросу или пакету). */
  draftKey: string
  onSubmit: (input: QuestionInput) => Promise<void>
  /** Удаление вопроса; передаётся только при редактировании. */
  onDelete?: () => Promise<void>
  onClose: () => void
}

const inputCls =
  'w-full rounded border border-slate-600 bg-board px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-slate-400'
const labelCls = 'mb-1 block text-[11px] uppercase tracking-wide text-slate-400'

const MIN_WIDTH = 480
const MAX_WIDTH = 1600
const DEFAULT_WIDTH = 576 // = бывший max-w-xl
const WIDTH_KEY = 'chgk:editorWidth'

/** Ограничить ширину: не уже MIN, не шире MAX и ширины экрана (с учётом отступов оверлея p-4). */
function clampWidth(w: number): number {
  return Math.min(Math.max(w, MIN_WIDTH), MAX_WIDTH, window.innerWidth - 32)
}

/** Запомнить ширину; localStorage может быть недоступен — не критично. */
function saveWidth(w: number) {
  try {
    window.localStorage.setItem(WIDTH_KEY, String(w))
  } catch {
    /* не критично */
  }
}

export default function QuestionEditorModal({ question, draftKey, onSubmit, onDelete, onClose }: Props) {
  // Черновик после перезагрузки страницы (вкладку мог выгрузить браузер) приоритетнее
  // начальных значений вопроса — восстанавливаем то, что пользователь успел ввести.
  const [draft] = useState(() => loadEditorDraft(draftKey))
  const [text, setText] = useState(draft?.text ?? question?.text ?? '')
  const [answer, setAnswer] = useState(draft?.answer ?? question?.answer ?? '')
  const [rejected, setRejected] = useState(draft?.rejected ?? question?.rejectedAnswer ?? '')
  const [comment, setComment] = useState(draft?.comment ?? question?.comment ?? '')
  const [alts, setAlts] = useState<string[]>(
    draft?.alts ?? question?.alternativeAnswers.map((a) => a.text) ?? [],
  )
  const [sources, setSources] = useState<string[]>(
    draft?.sources ?? question?.sources.map((s) => s.text) ?? [],
  )
  const [testers, setTesters] = useState<Tester[]>(draft?.testers ?? question?.testers ?? [])
  const [allTesters, setAllTesters] = useState<Tester[]>([])
  const [handout, setHandout] = useState<string | null>(draft?.handout ?? question?.handout ?? null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<number>()

  // Пока окно открыто, держим черновик полей в sessionStorage.
  useEffect(() => {
    saveEditorDraft({ key: draftKey, text, answer, rejected, comment, alts, sources, testers, handout })
  }, [draftKey, text, answer, rejected, comment, alts, sources, testers, handout])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  useEffect(() => {
    fetchTesters().then(setAllTesters).catch((err) => setError(String(err)))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const [width, setWidth] = useState(() => {
    try {
      const stored = Number(window.localStorage.getItem(WIDTH_KEY))
      if (stored > 0) return clampWidth(stored)
    } catch {
      /* localStorage может быть недоступен */
    }
    return clampWidth(DEFAULT_WIDTH)
  })

  // Окно браузера сузилось — подгоняем ширину модалки под экран.
  useEffect(() => {
    const onResize = () => setWidth((w) => clampWidth(w))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /** Начать перетаскивание правого края: ширина следует за курсором. */
  const startResize = (e: ReactMouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    let last = startWidth
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const onMove = (ev: MouseEvent) => {
      // ×2: модалка по центру — при изменении ширины на dW её правый край сдвигается на dW/2,
      // поэтому dx умножаем на 2, чтобы край оставался под курсором.
      last = clampWidth(startWidth + (ev.clientX - startX) * 2)
      setWidth(last)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      saveWidth(last)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /** Двойной клик по ручке — вернуть ширину по умолчанию. */
  const resetWidth = () => {
    const w = clampWidth(DEFAULT_WIDTH)
    setWidth(w)
    saveWidth(w)
  }

  const canSave = text.trim() !== '' && answer.trim() !== '' && !uploading

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      setHandout(await uploadHandout(file))
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!onDelete || busy) return
    if (!window.confirm('Удалить этот вопрос?')) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      setError(String(err))
      setBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        text: text.trim(),
        answer: answer.trim(),
        comment: comment.trim() || null,
        rejectedAnswer: rejected.trim() || null,
        handout,
        alternativeAnswers: alts.map((a) => a.trim()).filter(Boolean),
        sources: sources.map((s) => s.trim()).filter(Boolean),
        testerIds: testers.map((t) => t.id),
      })
      setBusy(false)
      // В режиме редактирования окно не закрывается — кратко подтверждаем сохранение.
      if (question) {
        setSaved(true)
        window.clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => setSaved(false), 1500)
      }
    } catch (err) {
      setError(String(err))
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        style={{ width }}
        className="relative flex max-h-full max-w-full flex-col rounded-xl bg-column shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-100">
            {question ? 'Редактирование вопроса' : 'Новый вопрос'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-slate-400 hover:text-slate-100"
          >
            ✕
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto p-4">
          <div>
            <label className={labelCls}>Текст вопроса *</label>
            <textarea
              autoFocus
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className={labelCls}>Раздатка (картинка)</label>
            {handout && (
              <div className="mb-2 flex items-start gap-3">
                <img
                  src={handoutUrl(handout)}
                  alt="Раздатка"
                  className="max-h-40 max-w-full rounded border border-slate-600 object-contain"
                />
                <RemoveButton onClick={() => setHandout(null)} />
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              disabled={uploading}
              onChange={(e) => {
                void pickFile(e.target.files?.[0])
                e.target.value = '' // чтобы тот же файл можно было выбрать повторно
              }}
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-600 file:px-3 file:py-1.5 file:text-xs file:text-slate-100 hover:file:bg-slate-500"
            />
            {uploading && <p className="mt-1 text-xs text-slate-400">Загрузка…</p>}
          </div>

          <div>
            <label className={labelCls}>Ответ *</label>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Зачёты</label>
            <div className="space-y-2">
              {alts.map((alt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={alt}
                    onChange={(e) => setAlts(alts.map((a, j) => (j === i ? e.target.value : a)))}
                    className={inputCls}
                  />
                  <RemoveButton onClick={() => setAlts(alts.filter((_, j) => j !== i))} />
                </div>
              ))}
              <AddButton onClick={() => setAlts([...alts, ''])}>+ Добавить зачёт</AddButton>
            </div>
          </div>

          <div>
            <label className={labelCls}>Незачёт</label>
            <input value={rejected} onChange={(e) => setRejected(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Комментарий</label>
            <textarea
              rows={8}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className={labelCls}>Источники</label>
            <div className="space-y-2">
              {sources.map((src, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={src}
                    placeholder="Название, ссылка и т. п."
                    onChange={(e) => setSources(sources.map((s, j) => (j === i ? e.target.value : s)))}
                    className={inputCls}
                  />
                  <RemoveButton onClick={() => setSources(sources.filter((_, j) => j !== i))} />
                </div>
              ))}
              <AddButton onClick={() => setSources([...sources, ''])}>
                + Добавить источник
              </AddButton>
            </div>
          </div>

          <div>
            <label className={labelCls}>Тестеры</label>
            <TesterPicker
              all={allTesters}
              selected={testers}
              onChange={setTesters}
              onCreate={async (name) => {
                const created = await createTester(name)
                setAllTesters((prev) =>
                  prev.some((t) => t.id === created.id) ? prev : [...prev, created],
                )
                return created
              }}
            />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-700 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {onDelete && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="shrink-0 rounded px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/50 disabled:opacity-50"
              >
                Удалить
              </button>
            )}
            <p className="min-w-0 truncate text-xs text-red-400">{error}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-slate-300 hover:text-slate-100"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!canSave || busy}
              className="rounded bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saved ? 'Сохранено ✓' : question ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </footer>

        {/* Ручка изменения ширины: тянуть горизонтально; двойной клик — сброс */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину окна"
          title="Тяните, чтобы изменить ширину (двойной клик — сброс)"
          onMouseDown={startResize}
          onDoubleClick={resetWidth}
          className="absolute inset-y-0 right-0 w-2 cursor-col-resize rounded-r-xl transition-colors hover:bg-sky-500/40 active:bg-sky-500/60"
        />
      </form>
    </div>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Убрать"
      className="shrink-0 px-1 text-slate-500 hover:text-red-400"
    >
      ✕
    </button>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="text-xs text-sky-400 hover:underline">
      {children}
    </button>
  )
}
