import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminItemRow } from './AdminItemRow'
import type { AdminItem } from '../../lib/adminApi'

const ITEM: AdminItem = { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, active: true }

function renderRow(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <table>
      <tbody>
        <AdminItemRow item={ITEM} onSave={onSave} />
      </tbody>
    </table>
  )
  return { onSave }
}

describe('AdminItemRow', () => {
  it('renders the current values', () => {
    renderRow()
    expect(screen.getByDisplayValue('기본 세면대')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('does not call onSave when nothing changed', () => {
    const { onSave } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with only the changed field', async () => {
    const { onSave } = renderRow()
    fireEvent.change(screen.getByDisplayValue('기본 세면대'), { target: { value: '새 이름' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('item-a', { name: '새 이름' }))
  })

  it('shows an inline error when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'))
    renderRow(onSave)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.getByText('저장 실패')).toBeInTheDocument())
  })
})
