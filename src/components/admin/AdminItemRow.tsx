import { useState } from 'react'
import type { AdminItem } from '../../lib/adminApi'

export function AdminItemRow({
  item,
  onSave,
}: {
  item: AdminItem
  onSave: (id: string, patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>) => Promise<void>
}) {
  const [name, setName] = useState(item.name)
  const [fragmentsRequired, setFragmentsRequired] = useState(item.fragmentsRequired)
  const [active, setActive] = useState(item.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>> = {}
    if (name !== item.name) patch.name = name
    if (fragmentsRequired !== item.fragmentsRequired) patch.fragmentsRequired = fragmentsRequired
    if (active !== item.active) patch.active = active
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onSave(item.id, patch)
    } catch {
      setError('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="border p-1 text-xs">{item.id}</td>
      <td className="border p-1">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-1" />
      </td>
      <td className="border p-1">{item.grade}</td>
      <td className="border p-1">
        <input
          type="number"
          value={fragmentsRequired}
          onChange={(e) => setFragmentsRequired(Number(e.target.value))}
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
