import { CHIRP3_HD_VOICES } from '../components/CardGame';

export interface AnkiSyncResult {
  success: boolean;
  message: string;
  noteId?: number;
}

/**
 * Universal AnkiConnect RPC caller with Vite proxy (/anki-api) & direct fallbacks
 */
async function callAnkiConnect(action: string, params: Record<string, any> = {}): Promise<any> {
  const payload = JSON.stringify({ action, version: 6, params });

  // 1. Try local dev proxy (/anki-api) which bypasses AnkiConnect origin check
  try {
    const res = await fetch('/anki-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Continue to direct fallbacks
  }

  // 2. Try 127.0.0.1:8765
  try {
    const res = await fetch('http://127.0.0.1:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Continue to localhost
  }

  // 3. Try localhost:8765
  const res = await fetch('http://localhost:8765', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  return await res.json();
}

/**
 * Direct One-Click Anki Sync (English Sentence note type via AnkiConnect)
 * 1. Generates Chirp3-HD studio audio via GCP REST API.
 * 2. Stores audio binary directly into AnkiConnect media folder via 'storeMediaFile'.
 * 3. Adds note directly to Anki deck under 'English Sentence' model.
 */
export async function syncCardToAnki(
  sentence: string,
  koreanTranslation: string,
  gcpApiKey?: string
): Promise<AnkiSyncResult> {
  const cleanSentence = sentence.trim();
  const cleanTranslation = koreanTranslation.trim();

  if (!cleanSentence) {
    return { success: false, message: '저장할 문장이 없습니다.' };
  }

  const apiKey = gcpApiKey || import.meta.env.VITE_GOOGLE_API_KEY || localStorage.getItem('tm_gcp_api_key') || '';
  const selectedVoice = CHIRP3_HD_VOICES[Math.floor(Math.random() * CHIRP3_HD_VOICES.length)];
  let soundTag = '';

  // 1. Synthesize Chirp3-HD audio for Anki
  if (apiKey) {
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: cleanSentence },
          voice: {
            languageCode: selectedVoice.startsWith('en-GB') ? 'en-GB' : selectedVoice.startsWith('en-AU') ? 'en-AU' : 'en-US',
            name: selectedVoice,
          },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          const filename = `anki_gcp_${selectedVoice}_${Math.random().toString(36).substring(2, 9)}.mp3`;

          // Store media file in AnkiConnect
          const mediaResp = await callAnkiConnect('storeMediaFile', {
            filename,
            data: data.audioContent,
          });

          if (mediaResp && !mediaResp.error) {
            soundTag = `[sound:${filename}]`;
          }
        }
      }
    } catch (e) {
      console.warn('GCP TTS synthesis for Anki failed:', e);
    }
  }

  // 2. Query target decks from AnkiConnect to select best matching sentence deck
  let targetDeck = '1. Language::1.1. English::Sentence';
  try {
    const deckData = await callAnkiConnect('deckNames');
    if (deckData && Array.isArray(deckData.result)) {
      const matchingDeck =
        deckData.result.find((d: string) => d.toLowerCase().includes('english') && d.toLowerCase().includes('sentence')) ||
        deckData.result.find((d: string) => d.toLowerCase().includes('sentence')) ||
        deckData.result[0];
      if (matchingDeck) targetDeck = matchingDeck;
    }
  } catch (e) {
    return {
      success: false,
      message: 'Anki 앱이 실행되어 있지 않습니다. Anki (http://localhost:8765)를 실행해 주세요.',
    };
  }

  // 3. Add Note to AnkiConnect under 'English Sentence' model
  try {
    const addData = await callAnkiConnect('addNote', {
      note: {
        deckName: targetDeck,
        modelName: 'English Sentence',
        fields: {
          '문장': cleanSentence,
          '해설': cleanTranslation,
          '소리': soundTag,
        },
        options: {
          allowDuplicate: true,
        },
        tags: ['translation-master'],
      },
    });

    if (addData) {
      if (addData.error) {
        return { success: false, message: `Anki 저장 오류: ${addData.error}` };
      }
      return {
        success: true,
        message: `Anki [${targetDeck}] 덱에 성공적으로 추가되었습니다!`,
        noteId: addData.result,
      };
    }
  } catch (e) {
    return { success: false, message: 'AnkiConnect 연동 중 오류가 발생했습니다.' };
  }

  return { success: false, message: 'Anki 저장에 실패했습니다.' };
}
