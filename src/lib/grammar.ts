export interface GrammarMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  category: string;
  ruleId: string;
}

interface LanguageToolRawMatch {
  message: string;
  shortMessage?: string;
  replacements: { value: string }[];
  rule: {
    id: string;
    description: string;
    issueType: string;
    category?: {
      id: string;
      name: string;
    };
  };
}

/**
 * Noise rules to ignore (trivial capitalization, trailing punctuation, etc.)
 */
const IGNORED_RULE_IDS = new Set([
  'UPPERCASE_SENTENCE_START',
  'PUNCTUATION_PARAGRAPH_END',
  'EN_UNPAIRED_BRACKETS',
  'COMMA_PARENTHESIS_WHITESPACE',
]);

/**
 * High-performance Grammar Engine.
 * Operates strictly via LanguageTool Professional Engine (/languagetool-api/check).
 */
export async function checkGrammar(userInput: string, _referenceInput?: string): Promise<GrammarMatch[]> {
  if (!userInput || !userInput.trim()) return [];

  const text = userInput.trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');

    const response = await fetch('/languagetool-api/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.matches)) {
        return data.matches
          .filter((m: LanguageToolRawMatch) => !IGNORED_RULE_IDS.has(m.rule?.id))
          .map((m: LanguageToolRawMatch) => ({
            message: m.message,
            shortMessage: m.shortMessage || m.rule?.description || '문법 유의',
            replacements: (m.replacements || []).slice(0, 3),
            category: m.rule?.category?.name || '문법 교정',
            ruleId: m.rule?.id || 'GRAMMAR_RULE',
          }));
      }
    }
  } catch (error) {
    console.warn('LanguageTool proxy request error:', error);
  }

  return [];
}

/**
 * 4-Tier Severity-based Grammar Star Rating Engine:
 * - 0 errors: 5 Stars ⭐⭐⭐⭐⭐
 * - Most severe error is Level 4 (Minor/Typo/Article): 4 Stars ⭐⭐⭐⭐
 * - Most severe error is Level 3 (Standard Accuracy/Adverb/Plural): 3 Stars ⭐⭐⭐
 * - Most severe error is Level 2 (Critical Structural/Tense/Agreement/Prep): 2 Stars ⭐⭐
 * - Most severe error is Level 1 (Fatal/Word Order/Pronoun/Confused): 1 Star ⭐
 */
export function getGrammarStarsFromMatches(matches: GrammarMatch[]): number {
  if (!matches || matches.length === 0) {
    return 5; // 0 errors = 5 Stars
  }

  let minSeverityLevel = 5;

  for (const match of matches) {
    const categoryKey = (match.ruleId || match.category || '').toUpperCase();
    let level = 3; // Default to Level 3

    // Level 1: Fatal Errors (1 Star)
    if (
      categoryKey.includes('CONFUSED') ||
      categoryKey.includes('PRONOUN') ||
      categoryKey.includes('WORD_ORDER') ||
      categoryKey.includes('WORDORDER')
    ) {
      level = 1;
    }
    // Level 2: Critical Structural Errors (2 Stars)
    else if (
      categoryKey.includes('TENSE') ||
      categoryKey.includes('AUXILIARY') ||
      categoryKey.includes('AGREEMENT') ||
      categoryKey.includes('PREPOSITION') ||
      categoryKey.includes('PREP') ||
      categoryKey.includes('PHRASAL') ||
      categoryKey.includes('GRAMMAR')
    ) {
      level = 2;
    }
    // Level 3: Standard Accuracy Errors (3 Stars)
    else if (
      categoryKey.includes('ADJECTIVE') ||
      categoryKey.includes('ADVERB') ||
      categoryKey.includes('COMPARATIVE') ||
      categoryKey.includes('PLURAL') ||
      categoryKey.includes('CONJUNCTION') ||
      categoryKey.includes('VOCABULARY')
    ) {
      level = 3;
    }
    // Level 4: Minor & Stylistic Errors (4 Stars)
    else if (
      categoryKey.includes('ARTICLE') ||
      categoryKey.includes('TYPO') ||
      categoryKey.includes('SPELLING') ||
      categoryKey.includes('CAPITALIZATION') ||
      categoryKey.includes('STYLE') ||
      categoryKey.includes('REDUNDANCY')
    ) {
      level = 4;
    }

    if (level < minSeverityLevel) {
      minSeverityLevel = level;
    }
  }

  return Math.min(5, Math.max(1, minSeverityLevel));
}
