import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

// Минимальный роутинг на History API — без внешних зависимостей.

const listeners = new Set<() => void>()

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('popstate', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('popstate', cb)
  }
}

export const usePath = () => useSyncExternalStore(subscribe, () => window.location.pathname)

export function navigate(path: string) {
  if (path === window.location.pathname) return
  window.history.pushState(null, '', path)
  listeners.forEach((cb) => cb())
}

/** Ссылка без перезагрузки страницы; Ctrl/Cmd/средняя кнопка работают как у обычной. */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(href)
  }
  return <a href={href} onClick={handle} {...rest} />
}

export const packagePath = (packageId: number) => `/packages/${packageId}`

/** id пакета из пути /packages/:id или null, если это не страница пакета. */
export function parsePackagePath(path: string): number | null {
  const m = /^\/packages\/(\d+)\/?$/.exec(path)
  return m ? Number(m[1]) : null
}
