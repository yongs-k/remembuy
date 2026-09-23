import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminDropEntryRow } from './AdminDropEntryRow'
import type { AdminDropEntry } from '../../lib/adminApi'

const ENTRY: AdminDropEntry = {
  id: 1,
  boxId: 'box-starter',
  itemId: 'item-a',
  itemName: '기본 세면대',
  resultType: 'FRAGMENT',
  weight: 40,
  active: true,
}

function renderRow(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <table>
      <tbody>
        <AdminDropEntryRow entry={ENTRY} onSave={onSave} />
      </tbody>
    </table>
  )
  return { onSave }
}

describe('AdminDropEntryRow', () => {
  it('renders the item name (read-only) and the current weight', () => {
    renderRow()
    expect(screen.getByText('기본 세면대')).toBeInTheDocument()
    expect(screen.getByDisplayValue('40')).toBeInTheDocument()
  })

  it('does not call onSave when nothing changed', () => {
    const { onSave } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with only the changed weight', async () => {
    const { onSave } = renderRow()
    fireEvent.change(screen.getByDisplayValue('40'), { target: { value: '77' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(1, { weight: 77 }))
  })
})
