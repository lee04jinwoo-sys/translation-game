import React, { useEffect } from 'react';

interface CustomDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCount: number;
  setTargetCount: (cnt: number) => void;
  selectedLevels: number[];
  setSelectedLevels: React.Dispatch<React.SetStateAction<number[]>>;
  selectedTopics: string[];
  setSelectedTopics: React.Dispatch<React.SetStateAction<string[]>>;
  onGenerateDeck: (count: number, levels: number[], topics: string[]) => void;
}

export const CustomDeckModal: React.FC<CustomDeckModalProps> = ({
  isOpen,
  onClose,
  targetCount,
  setTargetCount,
  selectedLevels,
  setSelectedLevels,
  selectedTopics,
  setSelectedTopics,
  onGenerateDeck,
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const topicOptions = [
    { id: 'all', label: '전체', icon: 'apps' },
    { id: 'daily', label: '일상', icon: 'coffee' },
    { id: 'travel', label: '여행', icon: 'flight_takeoff' },
    { id: 'business', label: '비즈니스', icon: 'business_center' },
    { id: 'school', label: '학교', icon: 'school' },
  ];

  // Toggle multi-select topic
  const toggleTopic = (id: string) => {
    if (id === 'all') {
      setSelectedTopics(['all']);
      return;
    }

    let next = selectedTopics.filter(t => t !== 'all');
    if (next.includes(id)) {
      next = next.filter(t => t !== id);
      if (next.length === 0) next = ['all'];
    } else {
      next.push(id);
    }
    setSelectedTopics(next);
  };

  const getTopicLabelSummary = () => {
    if (selectedTopics.includes('all') || selectedTopics.length === 4) return '전체 주제';
    const labels = selectedTopics.map(t => topicOptions.find(o => o.id === t)?.label).filter(Boolean);
    return labels.join(', ');
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-[#fdfbf7] border border-[#e6e0d2] rounded-3xl p-6 w-full max-w-md shadow-xl flex flex-col gap-5 animate-scale-up text-[#2c2a29]">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#e6e0d2] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5c5243] text-2xl">tune</span>
            <h3 id="modal-title" className="text-lg font-bold font-sans text-[#2c2a29] m-0">새 덱 가져오기 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#706b63] hover:text-[#2c2a29] p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Card Count Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#706b63] uppercase tracking-wider">
            뽑을 카드 수량 (장)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => setTargetCount(cnt)}
                className={`py-2 rounded-xl font-sans text-sm font-bold border transition-all ${
                  targetCount === cnt
                    ? 'bg-[#5c5243] border-[#5c5243] text-white shadow-sm'
                    : 'bg-[#f5f0e6] border-[#e6e0d2] text-[#706b63] hover:bg-[#eae3d5]'
                }`}
              >
                {cnt}장
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Select Topic Selector with Icons */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-[#706b63] uppercase tracking-wider">
              주제 선택
            </label>
            <span className="text-[11px] text-[#706b63]">다중 선택 가능</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {topicOptions.map(item => {
              const isSelected = selectedTopics.includes(item.id) || (selectedTopics.includes('all') && item.id === 'all');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleTopic(item.id)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                    isSelected
                      ? 'bg-[#5c5243] border-[#5c5243] text-white shadow-sm font-bold scale-[1.02]'
                      : 'bg-[#f5f0e6] border-[#e6e0d2] text-[#706b63] opacity-60 hover:opacity-100 hover:bg-[#eae3d5]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Select Level Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-[#706b63] uppercase tracking-wider">
              포함할 난이도 선택
            </label>
            <button
              type="button"
              onClick={() => {
                if (selectedLevels.length === 5) {
                  setSelectedLevels([1]);
                } else {
                  setSelectedLevels([1, 2, 3, 4, 5]);
                }
              }}
              className="text-xs text-[#5c5243] hover:underline font-medium"
            >
              {selectedLevels.length === 5 ? '해제' : '전체 선택'}
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[
              { lvl: 1, label: 'L1 A1', sub: '기초', color: 'bg-[#edf6ee] border-[#bcf0da] text-[#03543f]' },
              { lvl: 2, label: 'L2 A2', sub: '초급', color: 'bg-[#ebf5ff] border-[#c3ddfd] text-[#1e429f]' },
              { lvl: 3, label: 'L3 B1', sub: '중급', color: 'bg-[#f3f0ff] border-[#e1d5fe] text-[#5521b5]' },
              { lvl: 4, label: 'L4 B2', sub: '중고급', color: 'bg-[#fff8f1] border-[#feecdc] text-[#92400e]' },
              { lvl: 5, label: 'L5 C1', sub: '고급', color: 'bg-[#fdf2f2] border-[#fde8e8] text-[#9b1c1c]' },
            ].map(item => {
              const isSelected = selectedLevels.includes(item.lvl);
              return (
                <button
                  key={item.lvl}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      if (selectedLevels.length > 1) {
                        setSelectedLevels(prev => prev.filter(l => l !== item.lvl));
                      }
                    } else {
                      setSelectedLevels(prev => [...prev, item.lvl].sort());
                    }
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    isSelected
                      ? `${item.color} shadow-sm scale-[1.02]`
                      : 'bg-[#f5f0e6] border-[#e6e0d2] text-[#706b63] opacity-50 hover:opacity-100 hover:bg-[#eae3d5]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Setting Summary */}
        <div className="p-3 rounded-xl bg-[#f5f0e6] border border-[#e6e0d2] text-[#5c5243] text-xs flex items-center justify-between">
          <span>선택 조건:</span>
          <span className="font-semibold font-sans">
            {getTopicLabelSummary()} / Level {selectedLevels.join(', ')} ({targetCount}장)
          </span>
        </div>

        {/* Google Cloud API Key Input for Chirp3-HD Voice */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#fff8f1] border border-[#feecdc]">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-[#92400e] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">key</span>
              Chirp3-HD 원어민 성우 API 키 (선택)
            </label>
            <span className="text-[10px] text-[#706b63]">AIzaSy... 키 입력</span>
          </div>
          <input
            type="password"
            placeholder="Google Cloud API Key (AIzaSy...) 입력 시 Chirp3-HD 활성화"
            defaultValue={localStorage.getItem('tm_gcp_api_key') || ''}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val) {
                localStorage.setItem('tm_gcp_api_key', val);
              } else {
                localStorage.removeItem('tm_gcp_api_key');
              }
            }}
            className="p-2 rounded-lg bg-[#fdfbf7] border border-[#e6e0d2] text-xs text-[#2c2a29] focus:outline-none focus:border-[#5c5243]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#f5f0e6] hover:bg-[#eae3d5] text-[#706b63] text-sm font-semibold transition-all border border-[#e6e0d2]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onGenerateDeck(targetCount, selectedLevels, selectedTopics);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#5c5243] hover:bg-[#4a4236] text-white text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">playing_cards</span>
            새 덱 생성하기
          </button>
        </div>
      </div>
    </div>
  );
};
