import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from './AdminPage'
import * as adminApi from '../lib/adminApi'

vi.mock('../lib/adminApi')

const ITEM: adminApi.AdminItem = { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, active: true }
const BOX: adminApi.AdminBox = { id: 'box-starter', name: '시작 상자', costPoints: 500, active: true }
const ENTRY: adminApi.AdminDropEntry = {
  id: 1,
  boxId: 'box-starter',
  itemId: 'item-a',
  itemName: '기본 세면대',
  resultType: 'FRAGMENT',
  weight: 40,
  active: true,
}

describe('AdminPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetAllMocks()
    vi.mocked(adminApi.getAdminKey).mockReturnValue('')
    vi.mocked(adminApi.fetchAdminBoxes).mockResolvedValue({ boxes: [BOX] })
    vi.mocked(adminApi.fetchAdminDropEntries).mockResolvedValue({ entries: [ENTRY] })
  })

  it('shows the key gate when no key is stored', () => {
    render(<AdminPage />)
    expect(screen.getByPlaceholderText('관리자 키')).toBeInTheDocument()
  })

  it('shows an inline error and stays on the gate for a wrong key', async () => {
    vi.mocked(adminApi.fetchAdminItems).mockRejectedValue(new Error('admin api 401'))
    render(<AdminPage />)
    fireEvent.change(screen.getByPlaceholderText('관리자 키'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() => expect(screen.getByText('키가 올바르지 않습니다')).toBeInTheDocument())
    expect(adminApi.setAdminKey).toHaveBeenLastCalledWith('')
  })

  it('loads and renders all three tables for the right key', async () => {
    vi.mocked(adminApi.fetchAdminItems).mockResolvedValue({ items: [ITEM] })
    render(<AdminPage />)
    fireEvent.change(screen.getByPlaceholderText('관리자 키'), { target: { value: 'right' } })
    fireEvent.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() => expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument())
    expect(screen.getByDisplayValue('시작 상자')).toBeInTheDocument()
    expect(screen.getByText('기본 세면대', { selector: 'td' })).toBeInTheDocument()
  })

  it('already-unlocked (stored key) loads tables on mount without the gate', async () => {
    vi.mocked(adminApi.getAdminKey).mockReturnValue('stored-key')
    vi.mocked(adminApi.fetchAdminItems).mockResolvedValue({ items: [ITEM] })
    render(<AdminPage />)
    expect(screen.queryByPlaceholderText('관리자 키')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument())
  })

  it('a 401 during a later save clears the key and returns to the gate', async () => {
    vi.mocked(adminApi.getAdminKey).mockReturnValue('stored-key')
    vi.mocked(adminApi.fetchAdminItems).mockResolvedValue({ items: [ITEM] })
    vi.mocked(adminApi.updateAdminItem).mockRejectedValue(new Error('admin api 401'))
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('기본 세면대'), { target: { value: '변경' } })
    fireEvent.click(screen.getAllByRole('button', { name: '저장' })[0])
    await waitFor(() => expect(screen.getByPlaceholderText('관리자 키')).toBeInTheDocument())
  })
})
