export function AdSlot({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <span>Sponsored</span>
      <p>A quiet space for considered work.</p>
    </aside>
  )
}
