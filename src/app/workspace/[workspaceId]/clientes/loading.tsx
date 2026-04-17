export default function Loading() {
  return (
    <div className="space-y-3 mt-2 animate-pulse">
      <div className="h-8 rounded-xl w-40" style={{ background: 'var(--surface-2)' }} />
      {[1,2,3,4].map(i => (
        <div key={i} className="h-16 rounded-2xl" style={{ background: 'var(--surface-2)' }} />
      ))}
    </div>
  )
}
