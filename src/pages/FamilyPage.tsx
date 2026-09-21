import { useState } from 'react'
import { FAMILY_MEMBERS } from '../data/familyData'
import { Icon } from '../data/materialIcons'

export default function FamilyPage() {
  const [invited, setInvited] = useState(false)

  return (
    <div className="space-y-space-md p-margin">
      <h1 className="flex items-center gap-1.5 font-heading text-headline-lg text-on-surface">
        <Icon name="groups_2" className="text-[24px] text-secondary" />
        가족 케어
      </h1>

      <ul className="space-y-space-sm">
        {FAMILY_MEMBERS.map((member) => (
          <li
            key={member.id}
            className="rounded-xl bg-surface-container-lowest p-space-md shadow-[0_3px_0px_#eae0de]"
          >
            <div className="flex items-center gap-space-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-[0_2px_0px_#304c46]">
                {member.name.slice(0, 1)}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-heading text-headline-md text-on-surface">{member.name}</span>
                <span className="text-label-sm text-on-surface-variant">{member.relation}</span>
              </div>
            </div>
            <ul className="mt-space-sm space-y-1.5">
              {member.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-space-sm py-2"
                >
                  <span className="min-w-0 truncate text-body-sm text-on-surface">{item.itemName}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-label-sm ${
                      item.daysUntilEmpty <= 7
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    D-{item.daysUntilEmpty}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setInvited(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-label-lg text-on-primary shadow-[0_4px_0px_#8b1901] active:translate-y-0.5 active:shadow-[0_1px_0px_#8b1901]"
      >
        <Icon name="person_add" className="text-[18px]" />
        가족 초대하기
      </button>
      <p role="status" aria-live="polite" className="text-center text-body-sm text-secondary">
        {invited ? '초대 링크는 아직 준비 중이에요. (MVP에서는 실제 초대가 불가합니다)' : ''}
      </p>
    </div>
  )
}
