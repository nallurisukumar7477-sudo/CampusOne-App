// Frontend-only mapping of department code -> specializations.
// CSE has specializations; ECE / MECH / CIVIL do not.
export const SPECIALIZATIONS_BY_DEPT_CODE: Record<string, string[]> = {
  CSE: [
    "Computer Science and Engineering (Core)",
    "Artificial Intelligence and Machine Learning (AI & ML)",
    "Cyber Security",
    "Data Science",
    "Information Technology (IT)",
  ],
};

export function specializationsFor(code: string | null | undefined): string[] {
  if (!code) return [];
  return SPECIALIZATIONS_BY_DEPT_CODE[code.toUpperCase()] ?? [];
}
