type GradeStyle = { bg: string; text: string; shadow: string }

export const GRADE_ORDER = ['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY'] as const

const GRADE_LABEL: Record<string, string> = {
  COMMON: '일반',
  ADVANCED: '고급',
  RARE: '레어',
  LEGENDARY: '전설',
}

// `text` is only legible when painted over that same grade's `bg` — never over an unrelated fixed background.
const GRADE_COLOR: Record<string, GradeStyle> = {
  COMMON: {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    shadow: 'shadow-[0_2px_0px_#e1bfb8]',
  },
  ADVANCED: {
    bg: 'bg-secondary-container',
    text: 'text-secondary',
    shadow: 'shadow-[0_2px_0px_#aecdc4]',
  },
  RARE: {
    bg: 'bg-primary-container',
    text: 'text-on-primary-container',
    shadow: 'shadow-[0_2px_0px_#8b1901]',
  },
  LEGENDARY: {
    bg: 'bg-tertiary-fixed',
    text: 'text-on-tertiary-fixed',
    shadow: 'shadow-[0_2px_0px_#653e00]',
  },
}

export function gradeLabel(grade: string): string {
  return GRADE_LABEL[grade] ?? grade
}

export function gradeColor(grade: string): GradeStyle {
  return GRADE_COLOR[grade] ?? GRADE_COLOR.COMMON
}
