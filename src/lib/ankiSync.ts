import { CHIRP3_HD_VOICES } from '../components/CardGame';

export interface AnkiSyncResult {
  success: boolean;
  message: string;
  noteId?: number;
}

/**
 * Direct One-Click Anki Sync (English Sentence note type via AnkiConnect http://localhost:8765)
 * 1. Generates Chirp3-HD studio audio via GCP REST API / Proxy or gTTS fallback.
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
          const mediaResp = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'storeMediaFile',
              version: 6,
              params: { filename, data: data.audioContent },
            }),
          });

          if (mediaResp.ok) {
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
    const deckResp = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deckNames', version: 6 }),
    });

    if (deckResp.ok) {
      const deckData = await deckResp.json();
      if (Array.isArray(deckData.result)) {
        const matchingDeck =
          deckData.result.find((d: string) => d.toLowerCase().includes('english') && d.toLowerCase().includes('sentence')) ||
          deckData.result.find((d: string) => d.toLowerCase().includes('sentence')) ||
          deckData.result[0];
        if (matchingDeck) targetDeck = matchingDeck;
      }
    }
  } catch (e) {
    return {
      success: false,
      message: 'Anki 앱이 실행되어 있지 않습니다. Anki (http://localhost:8765)를 실행해 주세요.',
    };
  }

  // 3. Add Note to AnkiConnect under 'English Sentence' model
  try {
    const addResp = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addNote',
        version: 6,
        params: {
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
        },
      }),
    });

    if (addResp.ok) {
      const addData = await addResp.json();
      if (addData.error) {
        if (addData.error.includes('duplicate')) {
          return { success: true, message: '이미 Anki 덱에 존재하는 카드입니다.' };
        }
        return { success: false, message: `Anki 저장 오류: ${addData.error}` };
      }
      return {
        success: true,
        message: `Anki [${targetDeck}] 덱에 성공적으로 추가되었습니다!`,
        noteId: addData.result,
      };
    }
  } catch (e) {
    return { success: false, message: 'AnkiConnect 연동 중 네트워크 오류가 발생했습니다.' };
  }

  return { success: false, message: 'Anki 저장에 실패했습니다.' };
}
