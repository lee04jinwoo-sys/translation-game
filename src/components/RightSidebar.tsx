import React from 'react';
import type { DifficultyInfo } from '../lib/difficulty';

export interface HistoryItem {
  id: number;
  korean: string;
  userEnglish: string;
  referenceEnglish: string;
  score: number;
  difficulty: DifficultyInfo;
  timestamp: number;
}

export interface SavedItem {
  id: number;
  korean: string;
  english: string;
}

interface RightSidebarProps {
  activeTab: 'history' | 'saved';
  setActiveTab: (tab: 'history' | 'saved') => void;
  historyItems: HistoryItem[];
  savedItems: SavedItem[];
  onToggleSave: (item: SavedItem) => void;
  onExportAnki: (items: SavedItem[]) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeTab,
  setActiveTab,
  historyItems,
  savedItems,
  onToggleSave,
  onExportAnki,
}) => {
  return (
    <aside className="w-[320px] border-l border-[#e6e0d2] bg-[#fdfbf7] flex flex-col shrink-0 overflow-hidden text-[#2c2a29]">
      {/* Tabs */}
      <div className="flex border-b border-[#e6e0d2] shrink-0 bg-[#f5f0e6]">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'text-[#2c2a29] border-b-2 border-[#5c5243] bg-[#fdfbf7]'
              : 'text-[#706b63] hover:text-[#2c2a29]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          최근 풀이 ({historyItems.length})
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'saved'
              ? 'text-[#2c2a29] border-b-2 border-[#5c5243] bg-[#fdfbf7]'
              : 'text-[#706b63] hover:text-[#2c2a29]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bookmark</span>
          Anki 보관함 ({savedItems.length})
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
        {activeTab === 'history' && historyItems.length === 0 && (
          <div className="text-center py-12 text-[#706b63] text-xs leading-relaxed">
            아직 풀이한 카드가 없습니다.<br />문장을 제출하면 기록이 여기에 남습니다.
          </div>
        )}

        {activeTab === 'history' && historyItems.map(item => (
          <div key={item.id} className="p-3.5 rounded-xl bg-[#f5f0e6] border border-[#e6e0d2] flex flex-col gap-2 relative group shadow-sm">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.difficulty.bgColor} ${item.difficulty.textColor} border ${item.difficulty.color}`}>
                L{item.difficulty.level} {item.difficulty.label}
              </span>
              <span className={`text-xs font-bold font-serif ${item.score >= 80 ? 'text-[#0e9f6e]' : item.score >= 60 ? 'text-[#d97706]' : 'text-[#e02424]'}`}>
                {item.score}점
              </span>
            </div>
            <p className="text-[12px] text-[#706b63]">{item.korean}</p>
            <p className="text-[13px] font-medium text-[#2c2a29] leading-snug">{item.userEnglish}</p>
          </div>
        ))}

        {activeTab === 'saved' && savedItems.length === 0 && (
          <div className="text-center py-12 text-[#706b63] text-xs leading-relaxed">
            보관된 문장이 없습니다.<br />결과 창에서 '보관 & Next' 버튼을 눌러보세요.
          </div>
        )}

        {activeTab === 'saved' && savedItems.map(item => (
          <div key={item.id} className="p-4 rounded-xl bg-[#f5f0e6] border border-[#e6e0d2] relative group hover:bg-[#eae3d5] transition-all shadow-sm">
            <p className="text-[13px] text-[#706b63] mb-1">{item.korean}</p>
            <p className="text-[15px] font-medium text-[#2c2a29] leading-snug">{item.english}</p>
            <button
              onClick={() => onToggleSave(item)}
              aria-label="Remove item"
              className="absolute top-3 right-3 text-[#706b63] hover:text-[#e02424] opacity-0 group-hover:opacity-100 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Anki Export Panel */}
      {activeTab === 'saved' && (
        <div className="p-4 bg-[#f5f0e6] border-t border-[#e6e0d2] flex flex-col gap-3 shrink-0">
          <div className="flex justify-between items-center text-[13px] text-[#706b63]">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#5c5243]">bookmark</span>보관된 문장
            </span>
            <span className="font-serif font-bold text-[#2c2a29]">{savedItems.length}개</span>
          </div>
          <button
            onClick={() => onExportAnki(savedItems)}
            disabled={savedItems.length === 0}
            className="w-full flex items-center justify-center gap-2 h-[42px] rounded-xl bg-[#5c5243] text-white text-[13px] font-semibold transition-all hover:bg-[#4a4236] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            일괄 전송 (CSV)
          </button>
        </div>
      )}
    </aside>
  );
};
