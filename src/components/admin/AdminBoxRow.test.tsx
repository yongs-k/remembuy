import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminBoxRow } from './AdminBoxRow'
import type { AdminBox } from '../../lib/adminApi'

const BOX: AdminBox = { id: 'box-starter', name: '시작 상자', costPoints: 500, active: true }

function renderRow(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <table>
      <tbody>
        <AdminBoxRow box={BOX} onSave={onSave} />
      </tbody>
    </table>
  )
  return { onSave }
}

describe('AdminBoxRow', () => {
  it('renders the current values', () => {
    renderRow()
    expect(screen.getByDisplayValue('시작 상자')).toBeInTheDocument()
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
  })

  it('does not call onSave when nothing changed', () => {
    const { onSave } = renderRow()
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave with only the changed field', async () => {
    const { onSave } = renderRow()
    fireEvent.change(screen.getByDisplayValue('500'), { target: { value: '700' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('box-starter', { costPoints: 700 }))
  })
})
