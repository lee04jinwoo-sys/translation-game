export interface SentenceItem {
  id: number;
  korean: string;
  english: string;
  topic?: string;
}

/**
 * Loads Korean→English sentence pairs from public/sentences.json (1,000 Tatoeba authentic dataset).
 * Strictly filters by selected levels and topics without synthetic generation fallback.
 */
export async function fetchSentences(
  count: number = 50,
  levels: number[] = [1, 2, 3, 4, 5],
  topics: string[] = ['all'],
  seenCardIds: Set<number> = new Set()
): Promise<SentenceItem[]> {
  try {
    const res = await fetch(`/sentences.json?_t=${Date.now()}`);
    let allSentences: (SentenceItem & { level?: number; topic?: string })[] = [];
    if (res.ok) {
      allSentences = await res.json();
    }
    
    // Filter by selected levels and topics directly from JSON metadata
    const levelSet = new Set(levels.length > 0 ? levels : [1, 2, 3, 4, 5]);
    const topicSet = new Set(topics.length > 0 ? topics : ['all']);
    
    // 1. Filter unseen items matching selected levels and topics
    let candidates = allSentences.filter(s => {
      const matchesLevel = s.level ? levelSet.has(s.level) : true;
      const matchesTopic = topicSet.has('all') || (s.topic && topicSet.has(s.topic));
      const isUnseen = !seenCardIds.has(s.id);
      return matchesLevel && matchesTopic && isUnseen;
    });

    // 2. If unseen candidates pool is smaller than requested count, reset seen history for these filters
    if (candidates.length < count) {
      candidates = allSentences.filter(s => {
        const matchesLevel = s.level ? levelSet.has(s.level) : true;
        const matchesTopic = topicSet.has('all') || (s.topic && topicSet.has(s.topic));
        return matchesLevel && matchesTopic;
      });
    }

    // Fisher-Yates Random Shuffle
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  } catch (err) {
    console.error('Failed to load sentences from sentences.json:', err);
    return [];
  }
}
