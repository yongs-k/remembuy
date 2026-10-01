import { useNavigate } from 'react-router-dom'

/**
 * In-app back buttons: step back through history when the app pushed an entry,
 * otherwise (opened from a deep link) run the fallback instead of leaving the app.
 */
export function useBack() {
  const navigate = useNavigate()
  return (fallback: () => void) => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else fallback()
  }
}
