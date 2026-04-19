'use client'

interface MetricCardProps {
  label:    string
  value:    string | number
  emoji?:   string
  sub?:     string
  onClick?: () => void
  accent?:  boolean
}

export function MetricCard({ label, value, emoji, sub, onClick, accent }: MetricCardProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className="flex flex-col items-center py-4 px-2 rounded-2xl text-center w-full"
      style={{
        background: accent ? 'var(--brand)' : 'var(--surface)',
        border:     accent ? 'none' : '1px solid var(--border)',
        cursor:     onClick ? 'pointer' : 'default',
      }}
    >
      {emoji && <span className="text-2xl">{emoji}</span>}
      <span
        className="text-2xl font-bold mt-1 tabular-nums"
        style={{ color: accent ? '#fff' : 'var(--text-primary)' }}
      >
        {value}
      </span>
      <span
        className="text-[11px] font-semibold mt-0.5"
        style={{ color: accent ? 'rgba(255,255,255,0.75)' : 'var(--text-tertiary)' }}
      >
        {label}
      </span>
      {sub && (
        <span
          className="text-[10px] mt-0.5"
          style={{ color: accent ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)' }}
        >
          {sub}
        </span>
      )}
    </Tag>
  )
}
