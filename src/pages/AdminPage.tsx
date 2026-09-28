import { useEffect, useState } from 'react'
import {
  getAdminKey,
  setAdminKey,
  fetchAdminItems,
  updateAdminItem,
  fetchAdminBoxes,
  updateAdminBox,
  fetchAdminDropEntries,
  updateAdminDropEntry,
  type AdminItem,
  type AdminBox,
  type AdminDropEntry,
} from '../lib/adminApi'
import { AdminItemRow } from '../components/admin/AdminItemRow'
import { AdminBoxRow } from '../components/admin/AdminBoxRow'
import { AdminDropEntryRow } from '../components/admin/AdminDropEntryRow'

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === 'admin api 401'
}

function isUnconfigured(error: unknown): boolean {
  return error instanceof Error && error.message === 'admin api 503'
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => getAdminKey() !== '')
  const [keyInput, setKeyInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [items, setItems] = useState<AdminItem[]>([])
  const [boxes, setBoxes] = useState<AdminBox[]>([])
  const [entries, setEntries] = useState<AdminDropEntry[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  function handleUnauthorized() {
    setAdminKey('')
    setUnlocked(false)
    setAuthError('키가 올바르지 않습니다')
  }

  async function loadAll() {
    try {
      const [itemsRes, boxesRes, entriesRes] = await Promise.all([
        fetchAdminItems(),
        fetchAdminBoxes(),
        fetchAdminDropEntries(),
      ])
      setItems(itemsRes.items)
      setBoxes(boxesRes.boxes)
      setEntries(entriesRes.entries)
      setLoadError(null)
    } catch (error) {
      if (isUnauthorized(error)) {
        handleUnauthorized()
      } else {
        setLoadError('데이터를 불러오지 못했어요')
      }
    }
  }

  useEffect(() => {
    if (unlocked) void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  async function handleUnlockSubmit() {
    setAuthError(null)
    setAdminKey(keyInput)
    try {
      const res = await fetchAdminItems()
      setItems(res.items)
      setUnlocked(true)
    } catch (error) {
      if (isUnauthorized(error)) {
        setAdminKey('')
        setAuthError('키가 올바르지 않습니다')
      } else if (isUnconfigured(error)) {
        setAuthError('관리자 기능이 아직 설정되지 않았어요')
      } else {
        setAuthError('서버에 연결하지 못했어요')
      }
    }
  }

  async function saveItem(id: string, patch: Partial<Pick<AdminItem, 'name' | 'fragmentsRequired' | 'active'>>) {
    try {
      const updated = await updateAdminItem(id, patch)
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
    } catch (error) {
      if (isUnauthorized(error)) handleUnauthorized()
      throw error
    }
  }

  async function saveBox(id: string, patch: Partial<Pick<AdminBox, 'name' | 'costPoints' | 'active'>>) {
    try {
      const updated = await updateAdminBox(id, patch)
      setBoxes((prev) => prev.map((b) => (b.id === id ? updated : b)))
    } catch (error) {
      if (isUnauthorized(error)) handleUnauthorized()
      throw error
    }
  }

  async function saveDropEntry(id: number, patch: Partial<Pick<AdminDropEntry, 'weight' | 'active'>>) {
    try {
      const updated = await updateAdminDropEntry(id, patch)
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
    } catch (error) {
      if (isUnauthorized(error)) handleUnauthorized()
      throw error
    }
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-6">
        <h1 className="text-lg font-bold">관리자 로그인</h1>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="관리자 키"
          className="w-full rounded border p-2"
        />
        {authError && <p className="text-sm text-red-600">{authError}</p>}
        <button type="button" onClick={handleUnlockSubmit} className="w-full rounded bg-black p-2 text-white">
          입장
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-lg font-bold">관리자</h1>
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <section>
        <h2 className="mb-2 font-bold">아이템</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1">ID</th>
              <th className="border p-1">이름</th>
              <th className="border p-1">등급</th>
              <th className="border p-1">필요 조각</th>
              <th className="border p-1">활성</th>
              <th className="border p-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <AdminItemRow key={item.id} item={item} onSave={saveItem} />
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">상자</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1">ID</th>
              <th className="border p-1">이름</th>
              <th className="border p-1">가격</th>
              <th className="border p-1">활성</th>
              <th className="border p-1" />
            </tr>
          </thead>
          <tbody>
            {boxes.map((box) => (
              <AdminBoxRow key={box.id} box={box} onSave={saveBox} />
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">드롭 테이블</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-1">상자</th>
              <th className="border p-1">아이템</th>
              <th className="border p-1">타입</th>
              <th className="border p-1">weight</th>
              <th className="border p-1">활성</th>
              <th className="border p-1" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <AdminDropEntryRow key={entry.id} entry={entry} onSave={saveDropEntry} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
