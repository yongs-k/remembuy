import { useState } from 'react'
import type { AdminBox } from '../../lib/adminApi'

export function AdminBoxRow({
  box,
  onSave,
}: {
  box: AdminBox
  onSave: (id: string, patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>) => Promise<void>
}) {
  const [name, setName] = useState(box.name)
  const [costPoints, setCostPoints] = useState(box.costPoints)
  const [active, setActive] = useState(box.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>> = {}
    if (name !== box.name) patch.name = name
    if (costPoints !== box.costPoints) patch.costPoints = costPoints
    if (active !== box.active) patch.active = active
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(box.id, patch)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="border p-1 text-xs">{box.id}</td>
      <td className="border p-1">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-1" />
      </td>
      <td className="border p-1">
        <input
          type="number"
          value={costPoints}
          onChange={(e) => setCostPoints(Number(e.target.value))}
          className="w-24 border p-1"
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
