import { Icon } from '../data/materialIcons'

type StepState = 'done' | 'active' | 'waiting'

const STEPS: Array<{ title: string; desc: string; state: StepState }> = [
  { title: '이미지 OCR · 상품 텍스트 감정', desc: '상품명 · 용량 라벨 식별', state: 'done' },
  { title: '도감 슬롯 매칭', desc: '장소 · 카테고리 후보 확인', state: 'done' },
  { title: '가구원 기준 소모 주기 계산', desc: '재구매 주기를 산출 중이에요', state: 'active' },
  { title: '온라인 최저가 · 핫딜 알림 추적', desc: '쿠팡 와우 · 네이버플러스 최저 시세 대조', state: 'waiting' },
]

const ROW_STYLE: Record<StepState, string> = {
  done: 'bg-secondary-container/50',
  active: 'bg-error-container/50',
  waiting: 'bg-surface-container-low',
}

export function AnalyzingOverlay({
  url,
  entryNumber,
  onCancel,
}: {
  url: string
  entryNumber: number
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="링크 분석 중"
      className="fixed inset-0 z-[60] overflow-y-auto bg-surface"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-space-md p-margin">
        <div className="flex items-center pt-space-sm">
          <span className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-md text-primary">
            <Icon name="document_scanner" className="text-[16px]" />
            AI 도감 스캐너 V2.4
          </span>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-on-secondary-container">
            <Icon name="auto_awesome" className="text-[14px]" />
            인벤토리 자동 등록 모드
          </span>
          <h2 className="mt-2 font-heading text-headline-lg text-on-surface">
            업로드한 정보를 분석하고 있어요
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            영수증 · 링크 · 사진에서 규격과 소비 주기를 정밀 추출 중입니다
          </p>
        </div>

        <div className="rounded-2xl bg-surface-container p-space-md shadow-[0_4px_0px_#e1bfb8]">
          <div className="flex items-center justify-between gap-2 text-label-sm">
            <span className="flex items-center gap-1 rounded bg-inverse-surface px-2 py-1 text-inverse-on-surface">
              <Icon name="qr_code_scanner" className="text-[14px]" />
              INDEX #{String(entryNumber).padStart(3, '0')} 감지
            </span>
            <span className="flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              감정 중
            </span>
          </div>
          <div className="mt-space-sm flex items-center gap-2 rounded-xl bg-surface-container-lowest p-space-sm">
            <Icon name="link" className="text-[20px] text-primary" />
            <span className="min-w-0 truncate text-body-sm text-on-surface">{url}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-heading text-headline-md text-on-surface">
              <Icon name="checklist" className="text-[22px] text-primary" />
              도감 추출 공정
            </h3>
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <Icon name="hourglass_top" className="text-[14px]" />약 3초 남음
            </span>
          </div>
          <div className="mt-space-sm h-2 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container to-tertiary"
              style={{ width: '70%' }}
            />
          </div>
          <ul className="mt-space-sm space-y-1.5">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className={`flex items-center gap-2.5 rounded-xl p-space-sm ${ROW_STYLE[step.state]}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    step.state === 'done'
                      ? 'bg-secondary text-on-secondary'
                      : step.state === 'active'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <Icon
                    name={step.state === 'done' ? 'check' : step.state === 'active' ? 'calculate' : 'sell'}
                    className="text-[20px]"
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label-lg text-on-surface">{step.title}</span>
                  <span className="truncate text-body-sm text-on-surface-variant">{step.desc}</span>
                </div>
                <span className="shrink-0 text-label-sm text-on-surface-variant">
                  {step.state === 'done' ? '완료' : step.state === 'active' ? '분석중' : '대기'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-surface-container p-space-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
            <Icon name="lightbulb" className="text-[22px]" />
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-label-md text-tertiary">
              REMEMBUY 도감 마스터 팁
              <span className="rounded bg-tertiary-fixed px-1.5 py-0.5 text-label-sm text-on-tertiary-fixed">
                +20P 획득
              </span>
            </span>
            <p className="mt-0.5 text-body-sm text-on-surface">
              결제 영수증이나 바코드를 추가하면 도감 완성도가 오르고 소모 주기 예측 정확도가 더 정밀해집니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-surface-container-high p-3 text-label-lg text-on-surface shadow-[0_3px_0px_#e1bfb8] active:translate-y-0.5"
        >
          <Icon name="close" className="text-[18px]" />
          분석 중단 및 취소
        </button>
      </div>
    </div>
  )
}
