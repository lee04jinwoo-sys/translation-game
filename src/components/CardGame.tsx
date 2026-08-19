import React, { type RefObject, useState, useEffect, useCallback, useRef } from 'react';
import type { DifficultyInfo } from '../lib/difficulty';
import { type GrammarMatch, getGrammarStarsFromMatches, getVocabularyStars, getFluencyStars } from '../lib/grammar';

export interface CardItem {
  id: number;
  korean: string;
  english: string;
  difficulty: DifficultyInfo;
  topic?: string;
}

interface CardGameProps {
  deck: CardItem[];
  isDrawing: boolean;
  deckError: string | null;
  currentCard: CardItem | null;
  userInput: string;
  setUserInput: (val: string) => void;
  hasSubmitted: boolean;
  isScoring: boolean;
  isCheckingGrammar: boolean;
  score: number | null;
  grammarIssues: GrammarMatch[];
  deckAnimClass: string;
  cardAnimClass: string;
  flyingSave: boolean;
  targetCount: number;
  inputRef: RefObject<HTMLInputElement | null>;
  onDrawCards: () => void;
  onOpenConfig: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onNext: () => void;
  onSaveAndNext: () => void;
}

// 10 Diverse Google Cloud Chirp3-HD Voice Actors (US, UK, AU Male & Female)
export const CHIRP3_HD_VOICES = [
  'en-US-Chirp3-HD-Vindemiatrix', // US Studio Female
  'en-US-Chirp3-HD-Achernar',     // US Studio Male
  'en-US-Chirp3-HD-Schedar',      // US Warm Male
  'en-US-Chirp3-HD-Alnilam',      // US Bright Female
  'en-US-Chirp3-HD-Algenib',      // US Deep Male
  'en-US-Chirp3-HD-Autonoe',      // US Energetic Female
  'en-GB-Chirp3-HD-Aoede',        // British UK Female
  'en-GB-Chirp3-HD-Umbriel',      // British UK Male
  'en-AU-Chirp3-HD-Kore',         // Australian Female
  'en-AU-Chirp3-HD-Enceladus',    // Australian Male
];

// Convert raw topic key to clean label
const getTopicLabel = (topic?: string): string => {
  switch (topic) {
    case 'daily': return '일상';
    case 'travel': return '여행';
    case 'business': return '비즈니스';
    case 'school': return '학교';
    default: return '일반';
  }
};

export const CardGame: React.FC<CardGameProps> = ({
  deck,
  isDrawing,
  deckError,
  currentCard,
  userInput,
  setUserInput,
  hasSubmitted,
  isScoring,
  isCheckingGrammar,
  score,
  grammarIssues,
  deckAnimClass,
  cardAnimClass,
  targetCount,
  onOpenConfig,
  onSubmit,
  onNext,
  onSaveAndNext,
}) => {
  // Speech Recognition (STT) State
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioPlayedForCardIdRef = useRef<number | null>(null);
  const cardSlotRef = useRef<HTMLDivElement>(null);
  const submittedTimeRef = useRef<number>(0);
  const cardRenderTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (hasSubmitted) {
      submittedTimeRef.current = Date.now();
      setElapsedSec((Date.now() - cardRenderTimeRef.current) / 1000);
    } else if (currentCard) {
      cardRenderTimeRef.current = Date.now();
    }
  }, [hasSubmitted, currentCard?.id]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardSlotRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    
    // Smooth 3D rotation tilt
    const rx = (py - 0.5) * -12;
    const ry = (px - 0.5) * 14;

    cardSlotRef.current.style.setProperty('--rx', `${rx}deg`);
    cardSlotRef.current.style.setProperty('--ry', `${ry}deg`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardSlotRef.current) return;
    cardSlotRef.current.style.setProperty('--rx', '0deg');
    cardSlotRef.current.style.setProperty('--ry', '0deg');
  }, []);


  // Auto-expand Textarea Height based on scrollHeight
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 52), 110);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [userInput]);

  // Auto-focus textarea on new card
  useEffect(() => {
    if (!hasSubmitted && currentCard) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [hasSubmitted, currentCard]);

  // STT Microphone toggle
  const toggleSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('사용하시는 브라우저가 음성 인식을 지원하지 않습니다. (Chrome 브라우저 권장)');
      setSttSupported(false);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setUserInput(transcript);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }, [isListening, setUserInput]);

  // Google Cloud Chirp3-HD Ultra-HD Voice Engine with 10 Diverse Voice Actors
  const playStudioAudio = useCallback(async (text: string, cardId?: number) => {
    if (!text) return;
    setIsPlayingAudio(true);

    // Stop and clean up any existing audio instance
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const cleanText = text.trim();
    const gcpApiKey = import.meta.env.VITE_GOOGLE_API_KEY || localStorage.getItem('tm_gcp_api_key') || '';

    // Rotate voice actor based on card ID or random selection
    const voiceIndex = cardId !== undefined ? Math.abs(cardId) % CHIRP3_HD_VOICES.length : Math.floor(Math.random() * CHIRP3_HD_VOICES.length);
    const selectedVoice = CHIRP3_HD_VOICES[voiceIndex];
    setActiveVoiceName(selectedVoice.split('-').slice(2).join(' '));

    // 1. Primary Engine: Google Cloud Text-to-Speech Chirp3-HD API
    if (gcpApiKey) {
      try {
        const response = await fetch(`/gcp-tts-api/synthesize?key=${gcpApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanText },
            voice: { languageCode: selectedVoice.startsWith('en-GB') ? 'en-GB' : selectedVoice.startsWith('en-AU') ? 'en-AU' : 'en-US', name: selectedVoice },
            audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
            const audio = new Audio(audioSrc);
            audioRef.current = audio;
            audio.onended = () => {
              setIsPlayingAudio(false);
              audioRef.current = null;
            };
            audio.onerror = () => {
              setIsPlayingAudio(false);
              audioRef.current = null;
            };
            await audio.play();
            return;
          }
        }
      } catch (e) {
        console.warn('GCP Chirp3-HD API error, falling back to gTTS stream:', e);
      }
    }

    // 2. Secondary Engine: Google HD Natural Voice Stream via Vercel Edge Proxy (Zero CORS, Zero API Key Required)
    try {
      const ttsUrl = `/google-tts-api?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=en&client=tw-ob`;
      const audio = new Audio(ttsUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        audioRef.current = null;
      };
      await audio.play();
      return;
    } catch (e) {
      console.warn('Google TTS Stream proxy failed, falling back to Web Speech:', e);
    }

    // 3. Tertiary Engine: Native Web SpeechSynthesis API (0ms Offline Safety)
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = selectedVoice.startsWith('en-GB') ? 'en-GB' : selectedVoice.startsWith('en-AU') ? 'en-AU' : 'en-US';
        utterance.rate = 0.95;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen') || v.name.includes('Alex')));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
          setIsPlayingAudio(false);
        };
        utterance.onerror = () => {
          setIsPlayingAudio(false);
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.error('SpeechSynthesis error:', e);
        setIsPlayingAudio(false);
      }
    }
  }, []);

  // Auto-play Audio strictly ONCE per card when 3D flipped to back face
  useEffect(() => {
    if (hasSubmitted && currentCard) {
      if (audioPlayedForCardIdRef.current !== currentCard.id) {
        audioPlayedForCardIdRef.current = currentCard.id;
        const timer = setTimeout(() => {
          playStudioAudio(currentCard.english, currentCard.id);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else if (!hasSubmitted) {
      audioPlayedForCardIdRef.current = null;
    }
  }, [hasSubmitted, currentCard, playStudioAudio]);

  // Bulletproof Global Key Listener inside CardGame
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Tab Key = Ultra-Simple 1-Key Mic STT Toggle
      if (e.key === 'Tab') {
        e.preventDefault();
        toggleSpeechRecognition();
        return;
      }

      // 2. Shortcuts when card is on Back Face (Flipped Result)
      if (hasSubmitted && currentCard) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          // Protect with 800ms cooldown so holding Enter doesn't accidentally skip answer verification!
          if (Date.now() - submittedTimeRef.current < 800) return;
          onNext();
          return;
        }
        if (e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S' || e.key === 'ㅁ' || e.key === 'ㄴ') {
          e.preventDefault();
          if (Date.now() - submittedTimeRef.current < 800) return;
          onSaveAndNext();
          return;
        }
        if (e.key === 'r' || e.key === 'R' || e.key === 'v' || e.key === 'V' || e.key === 'ㄱ') {
          e.preventDefault();
          playStudioAudio(currentCard.english, currentCard.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSubmitted, currentCard, toggleSpeechRecognition, onNext, onSaveAndNext, playStudioAudio]);

  // Textarea Keydown Handler: Enter submits, Shift+Enter adds newline
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (userInput.trim() && !isScoring && !isCheckingGrammar) {
        onSubmit(e as any);
      }
    }
  };

  // Render REAL upcoming cards in physical deck stack with ZERO FLICKER pre-rendering
  const renderCardStack = () => {
    const isPromoting = cardAnimClass === 'card-deal-next' || cardAnimClass === 'card-deal-right';
    // Slice exactly 2 stack cards (deck[1], deck[2]) to prevent deck[3] from popping up at the bottom
    const stackCards = deck.slice(1, 3);
    return stackCards.map((card, idx) => {
      // Smoothly promote background cards forward during card deal animation (350ms)
      const effectiveIdx = isPromoting ? idx : idx + 1;
      const offset = effectiveIdx * 9;
      const rotate = effectiveIdx === 0 ? 0 : (effectiveIdx % 2 === 0 ? effectiveIdx * 1.5 : effectiveIdx * -1.5);
      const scale = 1 - effectiveIdx * 0.028;
      const opacity = effectiveIdx === 0 ? 1 : 0.85;
      const isNextCard = idx === 0;

      return (
        <div
          key={card.id}
          className={`absolute inset-0 rounded-3xl border-2 ${card.difficulty.color} bg-[#fdfbf7] pointer-events-none transition-all duration-350 cubic-bezier(0.22, 1, 0.36, 1) shadow-md flex flex-col justify-between overflow-hidden`}
          style={{
            transform: `translateY(${offset}px) rotate(${rotate}deg) scale(${scale})`,
            opacity,
            zIndex: 8 - idx,
          }}
        >
          {/* Pre-rendered FULL FRONT FACE for deck[1] (Zero flicker/dummy blink!) */}
          {isNextCard ? (
            <>
              {/* Card Header Bar */}
              <div className={`flex justify-between items-center px-6 py-3.5 border-b border-[#e6e0d2]/70 ${card.difficulty.bgColor}`}>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${card.difficulty.dotColor}`} />
                    <span className={`text-xs font-sans font-bold ${card.difficulty.textColor}`}>
                      Lv.{card.difficulty.level}
                    </span>
                    <span className={`text-xs font-semibold ${card.difficulty.textColor}`}>
                      {card.difficulty.label}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-[#5c5243] bg-[#f5f0e6] px-2.5 py-0.5 rounded-full border border-[#e6e0d2]">
                    {getTopicLabel(card.topic)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[#706b63] text-xs font-sans font-medium">
                  <span>{deck.length - 1}장 남음</span>
                </div>
              </div>

              {/* Card Center Korean Prompt */}
              <div className="p-6 flex-1 flex flex-col justify-between items-center text-center relative overflow-hidden">
                <div className="flex flex-col items-center gap-2 mt-1 opacity-85 shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#f5f0e6] border border-[#e6e0d2] flex items-center justify-center text-[#5c5243] shadow-sm">
                    <span className="material-symbols-outlined text-2xl">
                      {card.topic === 'travel' ? 'flight_takeoff' :
                       card.topic === 'business' ? 'business_center' :
                       card.topic === 'school' ? 'school' : 'coffee'}
                    </span>
                  </div>
                </div>

                <div className="my-auto max-w-lg px-2">
                  <p
                    style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                    className="text-2xl lg:text-3xl font-semibold text-[#2c2a29]/90 leading-relaxed tracking-tight"
                  >
                    {card.korean}
                  </p>
                </div>
              </div>

              {/* Pre-rendered Mock Input Form Area */}
              <div className="p-4 bg-[#f5f0e6] border-t border-[#e6e0d2] flex gap-2.5 items-end opacity-70">
                <div className="w-12 h-12 rounded-xl bg-[#fdfbf7] border border-[#e6e0d2] flex items-center justify-center text-[#5c5243]">
                  <span className="material-symbols-outlined text-xl">mic_none</span>
                </div>
                <div className="flex-1 h-[50px] p-3 rounded-xl bg-[#fdfbf7] border border-[#e6e0d2] text-[#706b63] text-sm">
                  영어로 번역해 보세요...
                </div>
                <div className="h-12 px-5 rounded-xl bg-[#5c5243] text-white text-sm font-semibold flex items-center gap-1.5">
                  <span>제출</span>
                </div>
              </div>
            </>
          ) : (
            /* Card 3 Edge Header Line */
            <div className="p-4 border-b border-[#e6e0d2]/40 flex justify-between items-center opacity-40">
              <span className="text-xs font-bold text-[#2c2a29]">Lv.{card.difficulty.level}</span>
              <span className="text-xs text-[#706b63]">{getTopicLabel(card.topic)}</span>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <section className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#f5f0e6]">
      {/* Empty Deck State */}
      {deck.length === 0 && !isDrawing && (
        <div className="flex flex-col items-center gap-6">
          <div className={`w-[340px] h-[220px] border-2 border-dashed ${deckError ? 'border-red-400' : 'border-[#e6e0d2]'} rounded-3xl flex flex-col items-center justify-center gap-4 text-center px-4 bg-[#fdfbf7] shadow-sm`}>
            <span className={`material-symbols-outlined text-5xl ${deckError ? 'text-[#e02424]' : 'text-[#706b63]'}`}>
              {deckError ? 'error' : 'playing_cards'}
            </span>
            <p className={`${deckError ? 'text-[#e02424]' : 'text-[#706b63]'} text-sm break-all font-medium`}>
              {deckError ? `에러: ${deckError}` : '학습을 시작하려면 덱을 가져오세요'}
            </p>
          </div>
          <button
            onClick={onOpenConfig}
            className="flex items-center justify-center gap-2.5 h-13 px-8 rounded-2xl bg-[#5c5243] hover:bg-[#4a4236] text-white text-base font-semibold transition-all shadow-md active:scale-95 border border-[#4a4236]"
          >
            <span className="material-symbols-outlined text-[22px]">download_for_offline</span>
            <span>덱 가져오기 (D)</span>
          </button>
        </div>
      )}

      {/* Drawing Loading State */}
      {isDrawing && (
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl animate-spin text-[#5c5243]">autorenew</span>
          <p className="text-[#706b63] text-sm font-medium">선별 카드 {targetCount}장을 가져오는 중...</p>
        </div>
      )}

      {/* Active Physical Card Deck Arena */}
      {currentCard && !isDrawing && (
        <div className={`card-stack w-full max-w-xl ${deckAnimClass}`}>
          {/* REAL Layered Card Stack Visuals (100% Pre-rendered Next Card Beneath!) */}
          {renderCardStack()}

          {/* Stationary 3D Perspective Card Slot (Prevents border jittering!) */}
          <div 
            className={`relative z-10 w-full h-[470px] perspective-1000 ${cardAnimClass}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            ref={cardSlotRef}
            style={{ 
              '--rx': '0deg', '--ry': '0deg'
            } as any}
          >
            <div 
              className={`w-full h-full card-flipper ${hasSubmitted ? 'rotate-y-180' : ''}`}
              style={{
                transform: `rotateX(var(--rx)) rotateY(calc(${hasSubmitted ? '180deg' : '0deg'} + var(--ry)))`,
                transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >

              {/* FRONT FACE OF CARD (Question & Multi-line Auto-expanding Input) */}
              <div
                className={`absolute inset-0 rounded-3xl border-2 ${currentCard.difficulty.color} bg-[#fdfbf7] overflow-hidden backface-hidden flex flex-col justify-between shadow-xl`}
                style={{ boxShadow: `0 12px 36px ${currentCard.difficulty.glowColor}, 0 4px 20px rgba(0,0,0,0.08)` }}
              >
                {/* Front Card Header Bar */}
                <div className={`flex justify-between items-center px-6 py-3.5 border-b border-[#e6e0d2]/70 ${currentCard.difficulty.bgColor}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${currentCard.difficulty.dotColor}`} />
                      <span className={`text-xs font-sans font-bold ${currentCard.difficulty.textColor}`}>
                        Lv.{currentCard.difficulty.level}
                      </span>
                      <span className={`text-xs font-semibold ${currentCard.difficulty.textColor}`}>
                        {currentCard.difficulty.label}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-[#5c5243] bg-[#f5f0e6] px-2.5 py-0.5 rounded-full border border-[#e6e0d2]">
                      {getTopicLabel(currentCard.topic)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[#706b63] text-xs font-sans font-medium">
                    <span>{deck.length}장 남음</span>
                  </div>
                </div>

                {/* Front Paper Card Body (Korean Prompt & Topic Stamp) */}
                <div className="p-6 flex-1 flex flex-col justify-between items-center text-center relative overflow-y-auto">
                  <div className="flex flex-col items-center gap-2 mt-1 opacity-85 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#f5f0e6] border border-[#e6e0d2] flex items-center justify-center text-[#5c5243] shadow-sm">
                      <span className="material-symbols-outlined text-2xl">
                        {currentCard.topic === 'travel' ? 'flight_takeoff' :
                         currentCard.topic === 'business' ? 'business_center' :
                         currentCard.topic === 'school' ? 'school' : 'coffee'}
                      </span>
                    </div>
                  </div>

                  <div className="my-auto max-w-lg px-2">
                    <p
                      style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                      className="text-2xl lg:text-3xl font-semibold text-[#2c2a29] leading-relaxed tracking-tight select-text"
                    >
                      {currentCard.korean}
                    </p>
                  </div>
                </div>

                {/* Front Multi-Line Auto-Expanding Textarea Form */}
                <form onSubmit={onSubmit} className="p-4 bg-[#f5f0e6] border-t border-[#e6e0d2] flex gap-2.5 items-end">
                  {/* Microphone STT Button (Tab Shortcut) */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    disabled={!sttSupported || isScoring || isCheckingGrammar}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
                      isListening
                        ? 'bg-[#e02424] text-white border-red-600 mic-pulse'
                        : 'bg-[#fdfbf7] hover:bg-[#eae3d5] text-[#5c5243] border-[#e6e0d2]'
                    }`}
                    title={isListening ? '음성 듣는 중... (클릭/Tab 중지)' : '음성으로 영어 말하기 (단축키: Tab)'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isListening ? 'mic' : 'mic_none'}
                    </span>
                  </button>

                  {/* Multi-Line Auto-Expanding Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder={isListening ? '말씀하세요... (영어로 음성 인식 중)' : '영어로 번역해 보세요 (Enter 제출, Tab 마이크)...'}
                    disabled={isScoring || isCheckingGrammar}
                    className="flex-1 min-h-[50px] max-h-[110px] p-3 rounded-xl bg-[#fdfbf7] border border-[#e6e0d2] text-[#2c2a29] placeholder-[#706b63] text-sm leading-relaxed resize-none focus:outline-none focus:border-[#5c5243] input-typing-glow transition-all disabled:opacity-50 scrollbar-thin"
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!userInput.trim() || isScoring || isCheckingGrammar}
                    className="h-12 px-5 rounded-xl bg-[#5c5243] hover:bg-[#4a4236] text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                    title="제출하기 (Enter)"
                  >
                    {isScoring ? (
                      <span className="material-symbols-outlined animate-spin text-lg">autorenew</span>
                    ) : (
                      <>
                        <span>제출 (Enter)</span>
                        <span className="material-symbols-outlined text-lg">send</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* BACK FACE OF CARD (Flipped 180°: Result & Chirp3-HD Voice & Next/Save Buttons) */}
              <div
                className={`absolute inset-0 rounded-3xl border-2 ${currentCard.difficulty.color} bg-[#fdfbf7] p-6 overflow-hidden backface-hidden rotate-y-180 flex flex-col justify-between shadow-xl`}
                style={{ boxShadow: `0 12px 36px ${currentCard.difficulty.glowColor}, 0 4px 20px rgba(0,0,0,0.08)` }}
              >
                  {/* Back Header: 5-Star Ratings for Meaning & Grammar */}
                <div className="flex justify-between items-center border-b border-[#e6e0d2] pb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#706b63] uppercase tracking-wider">
                      채점 결과
                    </span>
                    {activeVoiceName && (
                      <span className="text-[10px] font-mono text-[#5c5243] font-semibold">
                        성우: Chirp3-HD {activeVoiceName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 1. Meaning Star Rating */}
                    {score !== null && (() => {
                      const meaningStars = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-bold text-[#706b63]">의미 {meaningStars}/5</span>
                          <div className="flex items-center text-amber-500 text-xs tracking-tight">
                            {'★'.repeat(meaningStars)}{'☆'.repeat(5 - meaningStars)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Grammar Star Rating */}
                    {(() => {
                      const grammarStars = getGrammarStarsFromMatches(grammarIssues);
                      return (
                        <div className="flex flex-col items-center gap-0.5 border-l border-[#e6e0d2] pl-2.5">
                          <span className="text-[10px] font-bold text-[#706b63]">문법 {grammarStars}/5</span>
                          <div className="flex items-center text-emerald-600 text-xs tracking-tight">
                            {'★'.repeat(grammarStars)}{'☆'.repeat(5 - grammarStars)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. Vocabulary Star Rating */}
                    {(() => {
                      const vocabStars = getVocabularyStars(userInput, currentCard.difficulty.level);
                      return (
                        <div className="flex flex-col items-center gap-0.5 border-l border-[#e6e0d2] pl-2.5">
                          <span className="text-[10px] font-bold text-[#706b63]">어휘 {vocabStars}/5</span>
                          <div className="flex items-center text-blue-600 text-xs tracking-tight">
                            {'★'.repeat(vocabStars)}{'☆'.repeat(5 - vocabStars)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Fluency Star Rating */}
                    {(() => {
                      const wordCount = userInput.trim().split(/\s+/).length;
                      const fluencyStars = getFluencyStars(elapsedSec, wordCount);
                      return (
                        <div className="flex flex-col items-center gap-0.5 border-l border-[#e6e0d2] pl-2.5">
                          <span className="text-[10px] font-bold text-[#706b63]">순발력 {fluencyStars}/5</span>
                          <div className="flex items-center text-purple-600 text-xs tracking-tight">
                            {'★'.repeat(fluencyStars)}{'☆'.repeat(5 - fluencyStars)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Back Content Area */}
                <div className="flex-1 overflow-y-auto my-3 flex flex-col gap-4 scrollbar-thin justify-center">
                  {/* English Answer Highlight Box */}
                  <div className="flex flex-col gap-2 p-4 rounded-2xl bg-[#edf6ee] border-2 border-[#bcf0da] shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#03543f] uppercase tracking-wider">
                        ✨ 원어민 정답 문장
                      </span>
                      {/* Manual Ultra-HD Studio Audio Replay Button */}
                      <button
                        type="button"
                        onClick={() => playStudioAudio(currentCard.english, currentCard.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                          isPlayingAudio
                            ? 'bg-[#5c5243] text-white border-[#5c5243] animate-pulse'
                            : 'bg-white text-[#03543f] hover:text-[#2c2a29] border-[#bcf0da] hover:bg-[#edf6ee]'
                        }`}
                        title="Google Chirp3-HD 원어민 음성 다시 듣기 (R / V)"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isPlayingAudio ? 'graphic_eq' : 'volume_up'}
                        </span>
                        <span>{isPlayingAudio ? '음성 재생 중...' : 'Chirp3-HD 발음 (R)'}</span>
                      </button>
                    </div>
                    <p className="text-lg lg:text-xl font-bold text-[#03543f] leading-relaxed break-words">
                      {currentCard.english}
                    </p>
                  </div>

                  {/* My Translation (if submitted) */}
                  {userInput.trim() && (
                    <div className="flex flex-col gap-1 px-1">
                      <div className="text-xs font-medium text-[#706b63]">내 번역:</div>
                      <div className="text-sm font-medium text-[#2c2a29] p-3 rounded-xl bg-[#f5f0e6] border border-[#e6e0d2] whitespace-pre-wrap break-words">
                        {userInput}
                      </div>
                    </div>
                  )}

                  {grammarIssues.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="text-xs font-semibold text-[#d97706] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">build</span>
                        문법 피드백 ({grammarIssues.length}건)
                      </div>
                      <div className="flex flex-col gap-2">
                        {grammarIssues.map((match, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[#fff8f1] border border-[#feecdc] text-xs flex flex-col gap-1">
                            <div className="text-[#92400e] font-medium">{match.message}</div>
                            {match.replacements.length > 0 && (
                              <div className="text-[#706b63]">
                                추천: <span className="text-[#03543f] font-bold">{match.replacements.slice(0, 3).map((r: { value: string }) => r.value).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentCard.difficulty.level === 5 && (
                    <p className="text-[#a8a49c] text-xs font-medium text-center mt-3">
                      마스터 레벨! C1/C2 원어민 최고급 문장입니다.
                    </p>
                  )}
                </div>

                {/* Back Action Buttons (Next / Save & Next) */}
                <div className="flex gap-3 pt-2 border-t border-[#e6e0d2]">
                  <button
                    onClick={onNext}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-[#f5f0e6] hover:bg-[#eae3d5] text-[#2c2a29] font-semibold text-sm transition-all border border-[#e6e0d2]"
                  >
                    다음 카드 (Enter)
                  </button>
                  <button
                    onClick={onSaveAndNext}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-[#5c5243] hover:bg-[#4a4236] text-white font-semibold text-sm transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">bookmark</span>
                    보관 & Next (A)
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
};
