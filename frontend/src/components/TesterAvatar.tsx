interface TesterAvatarProps {
  name: string
}

// Детерминированный цвет аватара по имени, чтобы тестер всегда выглядел одинаково.
function colorFromString(input: string): string {
  const palette = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ]
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function TesterAvatar({ name }: TesterAvatarProps) {
  return (
    <span
      title={name}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-slate-700"
      style={{ backgroundColor: colorFromString(name) }}
    >
      {initials(name)}
    </span>
  )
}
