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
 * High-performance Grammar & Structural Matcher.
 * 1. Primary Engine: Vercel Proxy LanguageTool Professional Engine (/languagetool-api/check)
 * 2. Fallback Engine: Client-Side Structural & Diff Matcher (0ms Offline Safety)
 */
export async function checkGrammar(userInput: string, referenceInput?: string): Promise<GrammarMatch[]> {
  if (!userInput || !userInput.trim()) return [];

  const text = userInput.trim();

  // 1. Try Vercel Edge Proxy to LanguageTool API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

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
        const filteredMatches: GrammarMatch[] = data.matches
          .filter((m: LanguageToolRawMatch) => !IGNORED_RULE_IDS.has(m.rule?.id))
          .map((m: LanguageToolRawMatch) => ({
            message: m.message,
            shortMessage: m.shortMessage || m.rule?.description || '문법 유의',
            replacements: (m.replacements || []).slice(0, 3),
            category: m.rule?.category?.name || '문법 교정',
            ruleId: m.rule?.id || 'GRAMMAR_RULE',
          }));

        if (filteredMatches.length > 0) {
          return filteredMatches;
        }
      }
    }
  } catch (error) {
    console.warn('LanguageTool proxy failed or timed out, using fallback client matcher:', error);
  }

  // 2. Fallback Engine: Client-side Structural & Heuristic Matcher
  return runClientFallbackMatcher(text, referenceInput);
}

function runClientFallbackMatcher(userText: string, referenceInput?: string): GrammarMatch[] {
  const matches: GrammarMatch[] = [];
  const userWords = userText.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/);

  // Capitalization Check
  if (userText.length > 0 && userText[0] !== userText[0].toUpperCase()) {
    matches.push({
      message: '첫 글자는 대문자로 시작하는 것이 좋습니다.',
      shortMessage: '대문자 시작',
      replacements: [{ value: userText[0].toUpperCase() + userText.slice(1) }],
      category: '맞춤법',
      ruleId: 'CAPITALIZATION',
    });
  }

  if (referenceInput && referenceInput.trim()) {
    const refText = referenceInput.trim();
    const refWords = refText.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/);

    // Check Prepositions
    const prepositions = ['in', 'at', 'on', 'to', 'for', 'with', 'by', 'from', 'about', 'of', 'into', 'over'];
    for (const prep of prepositions) {
      if (refWords.includes(prep) && !userWords.includes(prep)) {
        matches.push({
          message: `전치사 '${prep}'이(가) 누락되었습니다.`,
          shortMessage: `전치사 '${prep}' 누락`,
          replacements: [{ value: prep }],
          category: '전치사',
          ruleId: 'PREPOSITION_MISSING',
        });
      }
    }

    // Check Articles
    const articles = ['a', 'an', 'the'];
    for (const art of articles) {
      if (refWords.includes(art) && !userWords.includes(art)) {
        matches.push({
          message: `관사 '${art}'을(를) 추가하면 더욱 자연스럽습니다.`,
          shortMessage: `관사 '${art}' 권장`,
          replacements: [{ value: art }],
          category: '관사',
          ruleId: 'ARTICLE_MISSING',
        });
      }
    }

    // Check Tense / Auxiliaries
    const auxVerbs = ['was', 'were', 'did', 'had', 'would', 'could', 'should', 'is', 'are', 'am', 'do', 'does', 'have', 'has'];
    for (const aux of auxVerbs) {
      if (refWords.includes(aux) && !userWords.includes(aux)) {
        matches.push({
          message: `시제/조동사 '${aux}' 사용을 확인해보세요.`,
          shortMessage: `조동사 '${aux}' 권장`,
          replacements: [{ value: aux }],
          category: '시제/조동사',
          ruleId: 'TENSE_AUXILIARY',
        });
      }
    }

    // Content Vocabulary
    const userSet = new Set(userWords);
    const missingContentWords: string[] = [];

    for (const word of refWords) {
      if (word.length > 3 && !userSet.has(word) && !articles.includes(word) && !prepositions.includes(word) && !auxVerbs.includes(word)) {
        missingContentWords.push(word);
      }
    }

    if (missingContentWords.length > 0 && matches.length < 3) {
      matches.push({
        message: `핵심 단어 제안: ${missingContentWords.slice(0, 3).join(', ')}`,
        shortMessage: '핵심 어휘 제안',
        replacements: missingContentWords.slice(0, 3).map(w => ({ value: w })),
        category: '어휘 제안',
        ruleId: 'VOCABULARY_SUGGESTION',
      });
    }
  }

  return matches;
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
