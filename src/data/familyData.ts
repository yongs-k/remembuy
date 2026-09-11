import type { FamilyMember } from '../types'

export const FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'family-1',
    name: '엄마',
    relation: '부모님',
    items: [
      { itemName: '주방세제', daysUntilEmpty: 4 },
      { itemName: '섬유유연제', daysUntilEmpty: 12 },
      { itemName: '치약', daysUntilEmpty: 2 },
    ],
  },
  {
    id: 'family-2',
    name: '아빠',
    relation: '부모님',
    items: [
      { itemName: '면도날', daysUntilEmpty: 6 },
      { itemName: '워셔액', daysUntilEmpty: 20 },
    ],
  },
]
