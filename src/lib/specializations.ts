// Frontend-only mapping of department code -> specializations.
// CSE has specializations; ECE / MECH / CIVIL do not.
export const SPECIALIZATIONS_BY_DEPT_CODE: Record<string, string[]> = {
  CSE: [
    "Computer Science and Engineering (Core)",
    "Computer Science and Engineering (Artificial Intelligence & Machine Learning)",
    "Computer Science and Engineering (Cyber Security)",
    "Computer Science and Engineering (Data Science)",
    "Information Technology",
  ],
};

export function specializationsFor(code: string | null | undefined): string[] {
  if (!code) return [];
  return SPECIALIZATIONS_BY_DEPT_CODE[code.toUpperCase()] ?? [];
}
