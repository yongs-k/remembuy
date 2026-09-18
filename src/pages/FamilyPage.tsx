import { useState } from 'react'
import { FAMILY_MEMBERS } from '../data/familyData'

export default function FamilyPage() {
  const [invited, setInvited] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">가족 케어</h1>

      <ul className="space-y-3">
        {FAMILY_MEMBERS.map((member) => (
          <li key={member.id} className="chunky-card p-3">
            <p className="font-medium">
              {member.name} <span className="text-xs text-ink/50">({member.relation})</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {member.items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.itemName}</span>
                  <span className="text-warn">D-{item.daysUntilEmpty}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setInvited(true)}
        className="chunky-btn w-full rounded-xl bg-stamp py-2 text-white"
      >
        가족 초대하기
      </button>
      {invited && (
        <p className="text-center text-sm text-accent">
          초대 링크는 아직 준비 중이에요. (MVP에서는 실제 초대가 불가합니다)
        </p>
      )}
    </div>
  )
}
