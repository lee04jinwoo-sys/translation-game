import React from 'react';

interface LeftSidebarProps {
  deckLength: number;
  totalPlayed: number;
  avgScore: number;
  remainingByLevel: Record<1 | 2 | 3 | 4 | 5, number>;
  levelStats: Record<1 | 2 | 3 | 4 | 5, { solved: number; totalScore: number }>;
  onOpenConfig: () => void;
  onClearDeck: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  deckLength,
  totalPlayed,
  avgScore,
  remainingByLevel,
  levelStats,
  onOpenConfig,
  onClearDeck,
}) => {
  return (
    <aside className="w-[290px] xl:w-[310px] border-r border-[#e6e0d2] bg-[#f5f0e6] flex flex-col shrink-0 overflow-y-auto p-3.5 gap-3 scrollbar-thin hidden lg:flex">
      {/* 1. TOP PRIMARY ACTIONS: DRAW & CLEAR DECK BUTTONS */}
      <div className="flex gap-2">
        <button
          onClick={onOpenConfig}
          className="flex-1 flex items-center justify-center gap-1.5 h-11 py-2.5 px-3 rounded-xl bg-[#5c5243] hover:bg-[#4a4236] text-white font-semibold text-xs tracking-wide transition-all shadow-sm active:scale-[0.99] border border-[#4a4236]"
        >
          <span className="material-symbols-outlined text-[18px]">playing_cards</span>
          <span>새 덱 가져오기</span>
        </button>
        <button
          onClick={onClearDeck}
          className="flex items-center justify-center gap-1 h-11 py-2.5 px-3 rounded-xl bg-[#fdfbf7] hover:bg-[#eae3d5] text-[#706b63] hover:text-[#e02424] font-semibold text-xs transition-all shadow-sm border border-[#e6e0d2]"
          title="본 카드 이력 및 덱 초기화"
        >
          <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
          <span>비우기</span>
        </button>
      </div>

      {/* 2. MIDDLE SECTION: STATISTICS CARD */}
      <div className="p-3 rounded-xl bg-[#fdfbf7] border border-[#e6e0d2] flex flex-col gap-2.5 shadow-sm">
        <div className="flex justify-between items-center border-b border-[#e6e0d2] pb-2">
          <span className="text-xs font-bold text-[#2c2a29] flex items-center gap-1.5 font-sans">
            <span className="material-symbols-outlined text-[16px] text-[#5c5243]">bar_chart</span>
            통계
          </span>
        </div>

        {/* 2 Top Summary Stat Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 py-2.5 rounded-lg bg-[#f5f0e6] border border-[#e6e0d2] flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-1">
              <span className="font-sans text-xl font-bold text-[#2c2a29]">{totalPlayed}</span>
              <span className="font-sans text-[10px] text-[#706b63]">/ {totalPlayed + deckLength}</span>
            </div>
            <span className="text-[10px] text-[#706b63] font-medium">푼 카드</span>
          </div>

          <div className="p-2 py-2.5 rounded-lg bg-[#f5f0e6] border border-[#e6e0d2] flex flex-col items-center justify-center text-center">
            <span className="font-sans text-xl font-bold text-[#2c2a29]">
              {totalPlayed > 0 ? avgScore : '—'}
            </span>
            <span className="text-[10px] text-[#706b63] font-medium">평균 점수</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: COMPACT SLIM LEVEL BREAKDOWN CARDS */}
      <div className="flex flex-col gap-2">
        <div className="px-0.5 flex justify-between items-center">
          <span className="text-[11px] font-bold text-[#706b63] uppercase tracking-wider">난이도별 현황</span>
        </div>

        {[
          { lvl: 1 as const, label: '초급', dot: 'bg-[#0e9f6e]', bg: 'bg-[#edf6ee]', border: 'border-[#bcf0da]', text: 'text-[#03543f]', bar: 'bg-[#0e9f6e]' },
          { lvl: 2 as const, label: '초중급', dot: 'bg-[#1a56db]', bg: 'bg-[#ebf5ff]', border: 'border-[#c3ddfd]', text: 'text-[#1e429f]', bar: 'bg-[#1a56db]' },
          { lvl: 3 as const, label: '중급', dot: 'bg-[#6c2bd9]', bg: 'bg-[#f3f0ff]', border: 'border-[#e1d5fe]', text: 'text-[#5521b5]', bar: 'bg-[#6c2bd9]' },
          { lvl: 4 as const, label: '중고급', dot: 'bg-[#d97706]', bg: 'bg-[#fff8f1]', border: 'border-[#feecdc]', text: 'text-[#92400e]', bar: 'bg-[#d97706]' },
          { lvl: 5 as const, label: '고급', dot: 'bg-[#e02424]', bg: 'bg-[#fdf2f2]', border: 'border-[#fde8e8]', text: 'text-[#9b1c1c]', bar: 'bg-[#e02424]' },
        ].map(item => {
          const remaining = remainingByLevel[item.lvl];
          const stat = levelStats[item.lvl] || { solved: 0, totalScore: 0 };
          const avg = stat.solved > 0 ? Math.round(stat.totalScore / stat.solved) : null;
          const totalForLevel = stat.solved + remaining;
          const pct = totalForLevel > 0 ? Math.round((stat.solved / totalForLevel) * 100) : 0;

          return (
            <div
              key={item.lvl}
              className={`p-2.5 rounded-xl border ${item.border} ${item.bg} flex flex-col gap-1.5 shadow-sm transition-all hover:shadow`}
            >
              {/* Card Header Row */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span className="font-sans font-bold text-[#2c2a29] text-xs">L{item.lvl}</span>
                  <span className="text-[#706b63] text-[11px] font-medium">{item.label}</span>
                </div>
                <div className="text-[#706b63] text-[10px] font-sans">
                  평균 <span className={`font-sans font-bold text-xs ${item.text}`}>{avg !== null ? avg : '—'}</span>
                </div>
              </div>

              {/* Progress Bar (Compact 6px height) */}
              <div className="w-full h-1.5 rounded-full bg-[#e2dcd0]/70 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${item.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Card Footer Row */}
              <div className="flex justify-between items-center text-[10px] text-[#706b63]">
                <span>완료 {stat.solved}/{totalForLevel}</span>
                <span>남은 카드 {remaining}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
