import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('closes on a backdrop tap and on Escape, but not on taps inside its content', () => {
    const onClose = vi.fn()
    render(
      <Sheet labelledBy="t" onClose={onClose}>
        <h2 id="t">제목</h2>
        <button type="button">안쪽 버튼</button>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog', { name: '제목' })

    fireEvent.click(screen.getByText('안쪽 버튼'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
