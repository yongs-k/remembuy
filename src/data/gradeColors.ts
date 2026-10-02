// Grade colours: 일반 grey, 고급 lime, 레어 purple, 전설 red. `text` reads on its own `bg`;
// `hex` is the strong swatch for fills (the 장소 tile quarters, stage squares).
type GradeStyle = { bg: string; text: string; hex: string }

export const GRADE_ORDER = ['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY'] as const

const GRADE_LABEL: Record<string, string> = {
  COMMON: '일반',
  ADVANCED: '고급',
  RARE: '레어',
  LEGENDARY: '전설',
}

const GRADE_COLOR: Record<string, GradeStyle> = {
  COMMON: { bg: 'bg-[#ececec]', text: 'text-[#5c5c5c]', hex: '#9e9e9e' },
  ADVANCED: { bg: 'bg-[#e4f3d3]', text: 'text-[#467a17]', hex: '#8bc34a' },
  RARE: { bg: 'bg-[#eee5fb]', text: 'text-[#6a3db5]', hex: '#9c6ade' },
  LEGENDARY: { bg: 'bg-[#fde2e1]', text: 'text-[#c62828]', hex: '#e53935' },
}

export function gradeLabel(grade: string): string {
  return GRADE_LABEL[grade] ?? grade
}

export function gradeColor(grade: string): GradeStyle {
  return GRADE_COLOR[grade] ?? GRADE_COLOR.COMMON
}
