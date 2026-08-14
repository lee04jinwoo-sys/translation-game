import React from 'react';

interface HeaderProps {
  deckCount: number;
  totalPlayed: number;
  avgScore: number;
  combo: number;
  comboAnim: boolean;
  modelStatus: 'idle' | 'loading' | 'ready' | 'error';
  modelProgress: string;
  onOpenAiModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  deckCount,
  totalPlayed,
  avgScore,
  combo,
  comboAnim,
  modelStatus,
  modelProgress,
  onOpenAiModal,
}) => {
  return (
    <header className="flex justify-between items-center px-6 py-3 bg-[#fdfbf7]/80 backdrop-blur-md border-b border-[#e6e0d2] z-10 text-[#2c2a29]">
      <div className="flex items-center gap-4">
        <h1 className="text-[16px] font-sans font-bold m-0 text-[#2c2a29] tracking-tight">
          Translation Master
        </h1>

        {/* Deck Counter */}
        <div className="header-btn flex items-center gap-1.5 cursor-default bg-[#f5f0e6] border border-[#e6e0d2] text-[#706b63]">
          <span className="material-symbols-outlined text-[18px]">playing_cards</span>
          <span className="font-sans text-[13px] font-bold text-[#2c2a29]">{deckCount}</span>
        </div>

        {/* Average Score */}
        {totalPlayed > 0 && (
          <div className="header-btn flex items-center gap-1.5 cursor-default bg-[#f5f0e6] border border-[#e6e0d2] text-[#706b63]">
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
            <span className="font-sans text-[13px] font-bold text-[#2c2a29]">AVG {avgScore}</span>
          </div>
        )}

        {/* Combo Badge */}
        {combo > 1 && (
          <div className={`header-btn flex items-center gap-1 cursor-default text-[#d97706] font-bold bg-[#fff8f1] border border-[#feecdc] ${comboAnim ? 'combo-pulse' : ''}`}>
            <span className="font-sans text-[13px]">{combo} 연승</span>
          </div>
        )}
      </div>

      {/* AI Model Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenAiModal}
          className="header-btn flex items-center gap-2 text-xs bg-[#f5f0e6] border border-[#e6e0d2] hover:bg-[#eae3d5] transition-all"
        >
          <span className={`w-2 h-2 rounded-full ${
            modelStatus === 'ready' ? 'bg-[#0e9f6e]' :
            modelStatus === 'error' ? 'bg-[#e02424]' : 'bg-[#d97706] animate-pulse'
          }`} />
          <span className="text-[#706b63] font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">developer_board</span>
            {modelStatus === 'loading' ? `AI 로딩중 (${modelProgress})` :
             modelStatus === 'ready' ? 'On-device Engine' :
             modelStatus === 'error' ? 'AI 오류' : '초기화 중...'}
          </span>
        </button>
      </div>
    </header>
  );
};
