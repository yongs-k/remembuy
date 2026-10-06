import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HowToButton } from './HowTo'

describe('HowToButton', () => {
  it('opens the explainer for its topic and closes on 알겠어요', () => {
    render(<HowToButton topic="tiles" />)
    fireEvent.click(screen.getByRole('button', { name: '어떻게 하나요?' }))
    expect(screen.getByText('장소 타일 읽는 법')).toBeInTheDocument()
    expect(screen.getByText('+4 · 달성')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '알겠어요' }))
    expect(screen.queryByText('장소 타일 읽는 법')).not.toBeInTheDocument()
  })
})
