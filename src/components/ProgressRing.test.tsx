import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressRing } from './ProgressRing'

describe('ProgressRing', () => {
  it('renders the percent label', () => {
    render(<ProgressRing percent={62} color="#6E8F87" size={64} strokeWidth={4} />)
    expect(screen.getByText('62%')).toBeInTheDocument()
  })

  it('sets a full-circle dasharray and a dashoffset proportional to percent', () => {
    const { container } = render(
      <ProgressRing percent={50} color="#6E8F87" size={64} strokeWidth={4} />
    )
    const progressCircle = container.querySelector('circle.progress-ring__progress')!
    const radius = 32 - 4 / 2 // (size / 2) - strokeWidth / 2
    const circumference = 2 * Math.PI * radius
    expect(progressCircle.getAttribute('stroke-dasharray')).toBe(String(circumference))
    expect(Number(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      circumference * 0.5,
      2
    )
  })

  it('clamps percent to the 0-100 range', () => {
    render(<ProgressRing percent={150} color="#6E8F87" size={64} strokeWidth={4} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
