import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../data/materialIcons'
import { Sheet } from '../components/Sheet'
import { adoptDeviceId, DEVICE_ID_PATTERN, getDeviceId } from '../lib/deviceId'
import { fetchRemoteLocker, fetchShortCode, normalizeShortCode, resolveShortCode } from '../lib/lockerSync'

type Found = { code: string; itemCount: number; updatedAt: string }

export default function SettingsPage() {
  const navigate = useNavigate()
  const myCode = getDeviceId()
  const [copied, setCopied] = useState(false)
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<Found | null>(null)
  // Short code from the server; null while loading or when the server is down
  // (the long code still works then).
  const [shortCode, setShortCode] = useState<string | null>(null)

  useEffect(() => {
    fetchShortCode().then(setShortCode, (error) => console.warn('short code unavailable', error))
  }, [])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(shortCode ?? myCode)
      setCopied(true)
    } catch {
      setCopied(false)
      setError('복사하지 못했어요. 코드를 길게 눌러 직접 복사해 주세요.')
    }
  }

  async function checkCode(e: React.FormEvent) {
    e.preventDefault()
    const raw = input.trim()
    setError(null)
    const short = normalizeShortCode(raw)
    if (!short && !DEVICE_ID_PATTERN.test(raw)) {
      setError('복구 코드 형식이 아니에요. 다른 기기의 설정 화면에 보이는 8자리 코드를 입력해 주세요.')
      return
    }
    setChecking(true)
    try {
      const code = short ? await resolveShortCode(short) : raw
      if (!code) {
        setError('이 코드로 저장된 기록이 없어요. 코드를 다시 확인해 주세요.')
        return
      }
      if (code === myCode) {
        setError('지금 이 기기의 코드예요.')
        return
      }
      const remote = await fetchRemoteLocker<{ items: unknown[] }>(code)
      if (!remote) setError('이 코드로 저장된 기록이 없어요. 코드를 다시 확인해 주세요.')
      else setFound({ code, itemCount: remote.state.items.length, updatedAt: remote.updatedAt })
    } catch {
      setError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-space-lg p-margin">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="relative inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-on-surface-variant transition-colors before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-surface-container-high"
      >
        <Icon name="arrow_back" className="text-[16px]" />
        뒤로
      </button>
      <h1 className="font-heading text-display-sm text-on-surface">설정</h1>

      <section
        aria-labelledby="my-code-title"
        className="space-y-space-sm rounded-2xl border border-hairline bg-surface-container-lowest p-space-md shadow-card"
      >
        <h2 id="my-code-title" className="font-heading text-headline-md text-on-surface">
          내 복구 코드
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          기록은 이 코드로 서버에 저장돼요. 브라우저 데이터를 지우거나 기기를 바꿀 때 이 코드로 기록을
          불러올 수 있어요. 코드를 아는 사람은 기록을 볼 수 있으니 다른 사람에게 알려주지 마세요.
        </p>
        <p className="rounded-lg bg-surface-container-low p-space-md text-center font-mono text-stat-counter tracking-widest text-on-surface">
          {shortCode ?? '········'}
        </p>
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-label-md text-on-surface-variant underline underline-offset-4">
            긴 코드 보기
          </summary>
          <p className="break-all rounded-lg bg-surface-container-low p-2.5 font-mono text-body-sm text-on-surface-variant">
            {myCode}
          </p>
        </details>
        <button
          type="button"
          onClick={copyCode}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-hairline text-label-lg text-on-surface transition-colors hover:bg-surface-container-low"
        >
          <Icon name={copied ? 'check' : 'content_copy'} className="text-[18px]" />
          {copied ? '복사했어요' : '코드 복사'}
        </button>
      </section>

      <section
        aria-labelledby="restore-title"
        className="space-y-space-sm rounded-2xl border border-hairline bg-surface-container-lowest p-space-md shadow-card"
      >
        <h2 id="restore-title" className="font-heading text-headline-md text-on-surface">
          다른 기기 기록 불러오기
        </h2>
        <form onSubmit={checkCode} className="space-y-space-sm">
          <label className="block text-label-md text-on-surface-variant">
            복구 코드
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-describedby={error ? 'restore-error' : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder="예: ABCD-2345"
              className="mt-1 w-full rounded-lg border-2 border-transparent bg-surface-container-low p-2.5 font-mono text-body-md text-on-surface focus:border-primary focus:outline-none"
            />
          </label>
          {error && (
            <p id="restore-error" role="alert" className="text-body-sm text-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={checking || !input.trim()}
            className="min-h-12 w-full rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98] disabled:bg-surface-container-high disabled:text-on-surface-variant"
          >
            {checking ? '확인하는 중...' : '기록 확인하기'}
          </button>
        </form>
      </section>

      {found && (
        <Sheet labelledBy="restore-sheet-title" onClose={() => setFound(null)}>
          <h2 id="restore-sheet-title" className="text-center text-label-lg text-on-surface">
            이 기록으로 바꿀까요?
          </h2>
          <p className="text-center text-body-sm text-on-surface-variant">
            상품 {found.itemCount}개 · 마지막 저장 {new Date(found.updatedAt).toLocaleDateString('ko-KR')}
          </p>
          <p className="text-center text-body-sm text-on-surface-variant">
            지금 기기의 기록은 사라지지 않고 위의 내 복구 코드로 서버에 남아요. 다시 돌아오려면 그 코드를
            입력하세요.
          </p>
          <button
            type="button"
            onClick={() => {
              adoptDeviceId(found.code)
              window.location.assign('/')
            }}
            className="min-h-12 w-full rounded-xl bg-primary text-label-lg text-on-primary active:scale-[0.98]"
          >
            이 기록 불러오기
          </button>
          <button
            type="button"
            data-autofocus
            onClick={() => setFound(null)}
            className="min-h-11 w-full text-center text-body-md text-on-surface-variant"
          >
            취소
          </button>
        </Sheet>
      )}
    </div>
  )
}
