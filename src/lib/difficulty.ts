/**
 * Classifies an English sentence into difficulty levels 1-5.
 * 
 * Factors:
 *   - Word count: longer sentences are harder
 *   - Average word length: longer words typically indicate advanced vocabulary
 * 
 * Levels:
 *   1 (초급)  : Very short, simple words
 *   2 (초중급) : Short sentences with basic words
 *   3 (중급)  : Medium sentences
 *   4 (중고급) : Longer or more complex sentences
 *   5 (고급)  : Long sentences with advanced vocabulary
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface DifficultyInfo {
  level: DifficultyLevel;
  label: string;
  color: string;        // Tailwind border color class
  bgColor: string;      // Tailwind bg color class
  textColor: string;    // Tailwind text color class
  dotColor: string;     // Tailwind dot color class
  glowColor: string;    // CSS shadow color
}

const LEVEL_MAP: Record<DifficultyLevel, Omit<DifficultyInfo, 'level'>> = {
  1: {
    label: '초급 (CEFR A1)',
    color: 'border-[#bcf0da]',
    bgColor: 'bg-[#edf6ee]',
    textColor: 'text-[#03543f]',
    dotColor: 'bg-[#0e9f6e]',
    glowColor: 'rgba(14, 159, 110, 0.1)',
  },
  2: {
    label: '초중급 (CEFR A2)',
    color: 'border-[#c3ddfd]',
    bgColor: 'bg-[#ebf5ff]',
    textColor: 'text-[#1e429f]',
    dotColor: 'bg-[#1a56db]',
    glowColor: 'rgba(26, 86, 219, 0.1)',
  },
  3: {
    label: '중급 (CEFR B1)',
    color: 'border-[#e1d5fe]',
    bgColor: 'bg-[#f3f0ff]',
    textColor: 'text-[#5521b5]',
    dotColor: 'bg-[#6c2bd9]',
    glowColor: 'rgba(108, 43, 217, 0.1)',
  },
  4: {
    label: '중고급 (CEFR B2)',
    color: 'border-[#feecdc]',
    bgColor: 'bg-[#fff8f1]',
    textColor: 'text-[#92400e]',
    dotColor: 'bg-[#d97706]',
    glowColor: 'rgba(217, 119, 6, 0.1)',
  },
  5: {
    label: '고급 (CEFR C1/C2)',
    color: 'border-[#fde8e8]',
    bgColor: 'bg-[#fdf2f2]',
    textColor: 'text-[#9b1c1c]',
    dotColor: 'bg-[#e02424]',
    glowColor: 'rgba(224, 36, 36, 0.1)',
  },
};

export function classifyDifficulty(englishText: string): DifficultyInfo {
  const words = englishText.trim().split(/\s+/);
  const wordCount = words.length;
  const avgWordLength = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) / wordCount;

  // Combined score: weighted sum of word count and avg word length
  // wordCount contributes more heavily since sentence length is the strongest difficulty indicator
  const score = (wordCount * 1.5) + (avgWordLength * 2);

  let level: DifficultyLevel;
  if (score < 12) {
    level = 1;
  } else if (score < 18) {
    level = 2;
  } else if (score < 26) {
    level = 3;
  } else if (score < 35) {
    level = 4;
  } else {
    level = 5;
  }

  return { level, ...LEVEL_MAP[level] };
}
