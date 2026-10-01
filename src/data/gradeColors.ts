// Flat tinted tiles: the retired Stitch zero-blur offset shadows are gone (DESIGN.md).
type GradeStyle = { bg: string; text: string }

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
  },
  ADVANCED: {
    bg: 'bg-secondary-container',
    text: 'text-secondary',
  },
  RARE: {
    bg: 'bg-primary-container',
    text: 'text-on-primary-container',
  },
  LEGENDARY: {
    bg: 'bg-tertiary-fixed',
    text: 'text-on-tertiary-fixed',
  },
}

export function gradeLabel(grade: string): string {
  return GRADE_LABEL[grade] ?? grade
}

export function gradeColor(grade: string): GradeStyle {
  return GRADE_COLOR[grade] ?? GRADE_COLOR.COMMON
}
