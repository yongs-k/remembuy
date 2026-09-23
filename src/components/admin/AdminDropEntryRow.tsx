import { useState } from 'react'
import type { AdminDropEntry } from '../../lib/adminApi'

export function AdminDropEntryRow({
  entry,
  onSave,
}: {
  entry: AdminDropEntry
  onSave: (id: number, patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>) => Promise<void>
}) {
  const [weight, setWeight] = useState(entry.weight)
  const [active, setActive] = useState(entry.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>> = {}
    if (weight !== entry.weight) patch.weight = weight
    if (active !== entry.active) patch.active = active
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(entry.id, patch)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="border p-1 text-xs">{entry.boxId}</td>
      <td className="border p-1">{entry.itemName}</td>
      <td className="border p-1">{entry.resultType}</td>
      <td className="border p-1">
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-20 border p-1"
        />
      </td>
      <td className="border p-1 text-center">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="border p-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          저장
        </button>
        {error && <span className="ml-1 text-xs text-red-600">{error}</span>}
      </td>
    </tr>
  )
}
