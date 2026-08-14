import { classifyDifficulty } from './difficulty';
import { generateDynamicSentences } from './sentenceSynthesizer';

export interface SentenceItem {
  id: number;
  korean: string;
  english: string;
  topic?: string;
}

/**
 * Loads Korean→English sentence pairs from public/sentences.json.
 * Dynamically synthesizes fresh cards if database pool lacks unseen matching cards.
 */
export async function fetchSentences(
  count: number = 50,
  levels: number[] = [1, 2, 3, 4, 5],
  topics: string[] = ['all'],
  seenCardIds: Set<number> = new Set()
): Promise<SentenceItem[]> {
  try {
    const res = await fetch(`/sentences.json?_t=${Date.now()}`);
    let allSentences: SentenceItem[] = [];
    if (res.ok) {
      allSentences = await res.json();
    }
    
    // Filter by selected levels and topics
    const levelSet = new Set(levels.length > 0 ? levels : [1, 2, 3, 4, 5]);
    const topicSet = new Set(topics.length > 0 ? topics : ['all']);
    
    // 1. Filter unseen items matching levels and topics
    const unseenFiltered = allSentences.filter(s => {
      if (seenCardIds.has(s.id)) return false;
      const diff = classifyDifficulty(s.english);
      const matchesLevel = levelSet.has(diff.level);
      const matchesTopic = topicSet.has('all') || (s.topic && topicSet.has(s.topic));
      return matchesLevel && matchesTopic;
    });

    let pool = [...unseenFiltered];

    // 2. If unseen items in JSON are fewer than count, dynamically synthesize fresh new sentences!
    if (pool.length < count) {
      const neededCount = count - pool.length;
      const synthesized = generateDynamicSentences(neededCount, levels, topics);
      pool = [...pool, ...synthesized];
    }

    // Randomly shuffle sentences
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, Math.min(count, shuffled.length));
  } catch (err) {
    console.error('Failed to load sentences, generating dynamically:', err);
    return generateDynamicSentences(count, levels, topics);
  }
}
