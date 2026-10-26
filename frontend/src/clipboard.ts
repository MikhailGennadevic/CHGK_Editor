/** Копирует текст в буфер обмена; true — получилось. */
export async function copyText(text: string): Promise<boolean> {
  try {
    // Асинхронный API работает только в безопасном контексте (https или localhost).
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Запасной путь: открытие по IP в сети (http://172.x…) — не secure context.
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      document.body.removeChild(area)
    }
  }
}
