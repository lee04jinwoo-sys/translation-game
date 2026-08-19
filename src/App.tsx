import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar, type HistoryItem, type SavedItem } from './components/RightSidebar';
import { CardGame, type CardItem } from './components/CardGame';
import { CustomDeckModal } from './components/CustomDeckModal';
import { AiModelModal } from './components/AiModelModal';
import { classifyDifficulty } from './lib/difficulty';
import { fetchSentences } from './lib/sentenceLoader';
import { checkGrammar, type GrammarMatch } from './lib/grammar';
import { exportToAnkiCSV } from './lib/export';
import { syncCardToAnki } from './lib/ankiSync';
import './App.css';

export function App() {
  const workerRef = useRef<Worker | null>(null);

  // Deck state
  const [deck, setDeck] = useState<CardItem[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Gameplay state
  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Scoring & Feedback State
  const [isScoring, setIsScoring] = useState(false);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [grammarIssues, setGrammarIssues] = useState<GrammarMatch[]>([]);

  // AI Model Engine State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('Xenova/all-MiniLM-L6-v2');
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelProgress, setModelProgress] = useState<string>('0%');

  // Stats & Progress
  const [totalScore, setTotalScore] = useState<number>(0);
  const [totalPlayed, setTotalPlayed] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [comboAnim, setComboAnim] = useState(false);
  const [levelStats, setLevelStats] = useState<Record<1 | 2 | 3 | 4 | 5, { solved: number; totalScore: number }>>({
    1: { solved: 0, totalScore: 0 },
    2: { solved: 0, totalScore: 0 },
    3: { solved: 0, totalScore: 0 },
    4: { solved: 0, totalScore: 0 },
    5: { solved: 0, totalScore: 0 },
  });

  // History & Saved items
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  // Animation states
  const [deckAnimClass, setDeckAnimClass] = useState('');
  const [cardAnimClass, setCardAnimClass] = useState('');

  // Custom Deck Config State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [targetCount, setTargetCount] = useState<number>(50);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['all']);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = deck[0] || null;

  // Load state from LocalStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('tm_ai_model');
    if (savedModel) setSelectedModel(savedModel);

    const saved = localStorage.getItem('tm_saved_items');
    if (saved) setSavedItems(JSON.parse(saved));

    const hist = localStorage.getItem('tm_history_items');
    if (hist) setHistoryItems(JSON.parse(hist));

    const stats = localStorage.getItem('tm_stats');
    if (stats) {
      const { totalScore: ts, totalPlayed: tp, combo: c } = JSON.parse(stats);
      setTotalScore(ts || 0);
      setTotalPlayed(tp || 0);
      setCombo(c || 0);
    }
    const lvlStats = localStorage.getItem('tm_level_stats');
    if (lvlStats) {
      try { setLevelStats(JSON.parse(lvlStats)); } catch (e) { console.error(e); }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => { localStorage.setItem('tm_saved_items', JSON.stringify(savedItems)); }, [savedItems]);
  useEffect(() => { localStorage.setItem('tm_history_items', JSON.stringify(historyItems)); }, [historyItems]);
  useEffect(() => { localStorage.setItem('tm_stats', JSON.stringify({ totalScore, totalPlayed, combo })); }, [totalScore, totalPlayed, combo]);
  useEffect(() => { localStorage.setItem('tm_level_stats', JSON.stringify(levelStats)); }, [levelStats]);

  const seenCardIdsRef = useRef<Set<number>>(new Set());
  const submittedTimeRef = useRef<number>(0);
  const currentCardRef = useRef<CardItem | null>(null);
  const userInputRef = useRef<string>('');

  useEffect(() => {
    currentCardRef.current = currentCard;
    userInputRef.current = userInput;
  }, [currentCard, userInput]);

  useEffect(() => {
    if (hasSubmitted) {
      submittedTimeRef.current = Date.now();
    }
  }, [hasSubmitted]);

  // Draw cards from sentence pool with strict filter persistence and fresh card generation
  const drawCards = useCallback(async (count?: number, levels?: number[], topics?: string[]) => {
    const activeCount = count !== undefined ? count : targetCount;
    const activeLevels = levels !== undefined ? levels : selectedLevels;
    const activeTopics = topics !== undefined ? topics : selectedTopics;

    if (count !== undefined) setTargetCount(count);
    if (levels !== undefined) setSelectedLevels(levels);
    if (topics !== undefined) setSelectedTopics(topics);

    setIsDrawing(true);
    setDeckError(null);
    try {
      const sentences = await fetchSentences(activeCount, activeLevels, activeTopics, seenCardIdsRef.current);
      const cards: CardItem[] = sentences.map(s => ({
        ...s,
        difficulty: classifyDifficulty(s.english),
      }));
      setDeck(cards);

      // Record newly drawn card IDs to seen ref (no re-render loop!)
      cards.forEach(c => seenCardIdsRef.current.add(c.id));

      setDeckAnimClass('deck-shuffle');
      setTimeout(() => setDeckAnimClass(''), 600);
    } catch (err: any) {
      console.error('Failed to draw cards:', err);
      setDeckError(err.message || String(err));
    } finally {
      setIsDrawing(false);
    }
  }, [targetCount, selectedLevels, selectedTopics]);

  // Clear deck & reset seen card history
  const handleClearDeck = useCallback(() => {
    if (window.confirm('학습 이력과 덱 카드를 모두 비울까요?')) {
      seenCardIdsRef.current.clear();
      setDeck([]);
      setTotalScore(0);
      setTotalPlayed(0);
      setCombo(0);
      setLevelStats({
        1: { solved: 0, totalScore: 0 },
        2: { solved: 0, totalScore: 0 },
        3: { solved: 0, totalScore: 0 },
        4: { solved: 0, totalScore: 0 },
        5: { solved: 0, totalScore: 0 },
      });
    }
  }, []);


  // Init Web Worker for AI Embeddings
  useEffect(() => {
    workerRef.current = new Worker(new URL('./lib/ai.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (event) => {
      const { type, status, progress, score: resScore, error } = event.data;
      if (type === 'status') {
        setModelStatus(status);
        if (progress) setModelProgress(progress);
      } else if (type === 'score_result') {
        setIsScoring(false);
        setScore(resScore);

        const card = currentCardRef.current;
        const inputVal = userInputRef.current;

        if (card) {
          const currentLevel = card.difficulty.level;
          setTotalScore(prev => prev + resScore);
          setTotalPlayed(prev => prev + 1);

          setLevelStats(prev => {
            const currentStat = prev[currentLevel] || { solved: 0, totalScore: 0 };
            return {
              ...prev,
              [currentLevel]: {
                solved: currentStat.solved + 1,
                totalScore: currentStat.totalScore + resScore,
              }
            };
          });

          if (resScore >= 70) {
            setCombo(prev => {
              const newCombo = prev + 1;
              if (newCombo > 1) {
                setComboAnim(true);
                setTimeout(() => setComboAnim(false), 500);
              }
              return newCombo;
            });
          } else {
            setCombo(0);
          }

          setHistoryItems(prev => [
            {
              id: card.id,
              korean: card.korean,
              userEnglish: inputVal,
              referenceEnglish: card.english,
              score: resScore,
              difficulty: card.difficulty,
              timestamp: Date.now(),
            },
            ...prev,
          ]);
        }
      } else if (type === 'error') {
        setIsScoring(false);
        console.error('Worker error:', error);
      }
    };

    workerRef.current.postMessage({ type: 'init' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Toggle Save item to Anki
  const toggleSave = useCallback((item: SavedItem) => {
    setSavedItems(prev => {
      const exists = prev.some(s => s.id === item.id);
      if (exists) return prev.filter(s => s.id !== item.id);
      return [...prev, item];
    });
  }, []);

  // Submit translation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !currentCard || isScoring) return;

    setHasSubmitted(true);
    setIsScoring(true);
    setIsCheckingGrammar(true);

    workerRef.current?.postMessage({
      type: 'calculate_score',
      text1: userInput.trim(),
      text2: currentCard.english,
    });

    checkGrammar(userInput.trim(), currentCard.english).then(res => {
      setGrammarIssues(res);
      setIsCheckingGrammar(false);
    });
  };

  // Next card (Deal off deck animation)
  const handleNext = useCallback(() => {
    setCardAnimClass('card-deal-next');
    setTimeout(() => {
      setDeck(prev => prev.slice(1));
      setUserInput('');
      setHasSubmitted(false);
      setScore(null);
      setGrammarIssues([]);
      setCardAnimClass('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 350);
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save to Anki and Next (Symmetrical Rightward Deal)
  const handleSaveAndNext = useCallback(() => {
    if (currentCard) {
      toggleSave({
        id: currentCard.id,
        korean: currentCard.korean,
        english: currentCard.english,
      });

      // Direct One-Click Anki Sync (English Sentence note type via AnkiConnect)
      syncCardToAnki(currentCard.english, currentCard.korean).then(res => {
        showToast(res.message);
      });

      setCardAnimClass('card-deal-right');
      setTimeout(() => {
        setDeck(prev => prev.slice(1));
        setUserInput('');
        setHasSubmitted(false);
        setScore(null);
        setGrammarIssues([]);
        setCardAnimClass('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 350);
    }
  }, [currentCard, toggleSave]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      // 1. Shortcuts when card result is flipped (back face)
      if (hasSubmitted) {
        if (e.key === 'Enter' || e.key === 'n' || e.key === 'N' || e.key === 'ㅜ') {
          e.preventDefault();
          if (Date.now() - submittedTimeRef.current < 800) return;
          handleNext();
          return;
        } else if (e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S' || e.key === 'ㅁ' || e.key === 'ㄴ') {
          e.preventDefault();
          if (Date.now() - submittedTimeRef.current < 800) return;
          handleSaveAndNext();
          return;
        }
      }

      // 2. Global Shortcuts when not actively typing in an input
      if (!isInputFocused) {
        if (e.key === 'd' || e.key === 'D' || e.key === 'ㅇ') {
          e.preventDefault();
          setIsConfigOpen(prev => !prev);
          return;
        }
      }

      // 3. Escape key closes open modals
      if (e.key === 'Escape') {
        setIsConfigOpen(false);
        setIsAiModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSubmitted, handleNext, handleSaveAndNext]);

  // Handle Load Model
  const handleLoadModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('tm_ai_model', modelId);
    setModelStatus('loading');
    setModelProgress('0%');
    workerRef.current?.postMessage({
      type: 'switch_model',
      modelName: modelId,
    });
  };

  const avgScore = totalPlayed > 0 ? Math.round(totalScore / totalPlayed) : 0;
  const remainingByLevel = {
    1: deck.filter(c => c.difficulty.level === 1).length,
    2: deck.filter(c => c.difficulty.level === 2).length,
    3: deck.filter(c => c.difficulty.level === 3).length,
    4: deck.filter(c => c.difficulty.level === 4).length,
    5: deck.filter(c => c.difficulty.level === 5).length,
  };

  const handleBatchDirectSyncAnki = useCallback(async (items: SavedItem[]) => {
    if (items.length === 0) return;
    showToast(`Anki 덱으로 ${items.length}개 문장 동기화 중...`);
    let successCount = 0;
    for (const item of items) {
      const res = await syncCardToAnki(item.english, item.korean);
      if (res.success) successCount++;
    }
    showToast(`Anki [English Sentence] 덱에 ${successCount}개 문장이 성공적으로 전송되었습니다!`);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-app-bg text-app-text-primary font-sans select-none overflow-hidden relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2c2a29] text-[#fdfbf7] border border-[#5c5243] px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-amber-400 text-lg">stars</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        deckCount={deck.length}
        totalPlayed={totalPlayed}
        avgScore={avgScore}
        combo={combo}
        comboAnim={comboAnim}
        modelStatus={modelStatus}
        modelProgress={modelProgress}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          deckLength={deck.length}
          totalPlayed={totalPlayed}
          avgScore={avgScore}
          remainingByLevel={remainingByLevel}
          levelStats={levelStats}
          onOpenConfig={() => setIsConfigOpen(true)}
          onClearDeck={handleClearDeck}
        />

        {/* Central Card Game */}
        <CardGame
          deck={deck}
          isDrawing={isDrawing}
          deckError={deckError}
          currentCard={currentCard}
          userInput={userInput}
          setUserInput={setUserInput}
          hasSubmitted={hasSubmitted}
          isScoring={isScoring}
          isCheckingGrammar={isCheckingGrammar}
          score={score}
          grammarIssues={grammarIssues}
          deckAnimClass={deckAnimClass}
          cardAnimClass={cardAnimClass}
          flyingSave={false}
          targetCount={targetCount}
          inputRef={inputRef}
          onDrawCards={() => drawCards(targetCount, selectedLevels, selectedTopics)}
          onOpenConfig={() => setIsConfigOpen(true)}
          onSubmit={handleSubmit}
          onNext={handleNext}
          onSaveAndNext={handleSaveAndNext}
        />

        {/* Right Sidebar */}
        <RightSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          historyItems={historyItems}
          savedItems={savedItems}
          onToggleSave={toggleSave}
          onExportAnki={exportToAnkiCSV}
          onDirectSyncAnki={handleBatchDirectSyncAnki}
        />
      </main>

      {/* Custom Deck Configuration Modal */}
      <CustomDeckModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        targetCount={targetCount}
        setTargetCount={setTargetCount}
        selectedLevels={selectedLevels}
        setSelectedLevels={setSelectedLevels}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        onGenerateDeck={(count, levels, topics) => drawCards(count, levels, topics)}
      />

      {/* On-Device AI Engine Modal */}
      <AiModelModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        modelStatus={modelStatus}
        modelProgress={modelProgress}
        onLoadModel={handleLoadModel}
      />
    </div>
  );
}

export default App;
