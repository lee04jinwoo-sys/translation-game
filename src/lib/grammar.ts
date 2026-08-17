export interface GrammarMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  category: string;
  ruleId: string;
}

/**
 * Intelligent 100% Client-side English Grammar & Structural Matcher.
 * Operates offline with zero network latency or external API failure dependencies.
 */
export async function checkGrammar(userInput: string, referenceInput?: string): Promise<GrammarMatch[]> {
  if (!userInput || !userInput.trim()) return [];

  const matches: GrammarMatch[] = [];
  const userText = userInput.trim();
  const userWords = userText.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/);

  // 1. Basic Heuristic Checks (Articles & Capitalization)
  if (userText.length > 0 && userText[0] !== userText[0].toUpperCase()) {
    matches.push({
      message: "첫 글자는 대문자로 시작하는 것이 좋습니다.",
      shortMessage: "대문자 시작",
      replacements: [{ value: userText[0].toUpperCase() + userText.slice(1) }],
      category: "맞춤법",
      ruleId: "CAPITALIZATION"
    });
  }

  // 2. Structural & Word Diff Analysis against Reference Answer (if available)
  if (referenceInput && referenceInput.trim()) {
    const refText = referenceInput.trim();
    const refWords = refText.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/);
    
    // Check Prepositions (전치사 검사)
    const prepositions = ['in', 'at', 'on', 'to', 'for', 'with', 'by', 'from', 'about', 'of', 'into', 'over'];
    for (const prep of prepositions) {
      if (refWords.includes(prep) && !userWords.includes(prep)) {
        matches.push({
          message: `전치사 '${prep}'이(가) 누락되었습니다.`,
          shortMessage: `전치사 '${prep}' 누락`,
          replacements: [{ value: prep }],
          category: "전치사",
          ruleId: "PREPOSITION_MISSING"
        });
      }
    }

    // Check Articles (관사 검사: a, an, the)
    const articles = ['a', 'an', 'the'];
    for (const art of articles) {
      if (refWords.includes(art) && !userWords.includes(art)) {
        matches.push({
          message: `관사 '${art}'을(를) 추가하면 더욱 자연스럽습니다.`,
          shortMessage: `관사 '${art}' 권장`,
          replacements: [{ value: art }],
          category: "관사",
          ruleId: "ARTICLE_MISSING"
        });
      }
    }

    // Check Tense & Auxiliary Verbs (시제 및 조동사 검사)
    const auxVerbs = ['was', 'were', 'did', 'had', 'would', 'could', 'should', 'is', 'are', 'am', 'do', 'does', 'have', 'has'];
    for (const aux of auxVerbs) {
      if (refWords.includes(aux) && !userWords.includes(aux)) {
        matches.push({
          message: `시제/조동사 '${aux}' 사용을 확인해보세요.`,
          shortMessage: `조동사 '${aux}' 권장`,
          replacements: [{ value: aux }],
          category: "시제/조동사",
          ruleId: "TENSE_AUXILIARY"
        });
      }
    }

    // Key Content Word Diff
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
        shortMessage: "핵심 어휘 제안",
        replacements: missingContentWords.slice(0, 3).map(w => ({ value: w })),
        category: "어휘 제안",
        ruleId: "VOCABULARY_SUGGESTION"
      });
    }
  }

  return matches;
}
