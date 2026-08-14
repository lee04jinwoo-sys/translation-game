import React, { useEffect } from 'react';

export interface AiModelOption {
  id: string;
  name: string;
  shortName: string;
  description: string;
  size: string;
}

export const AI_MODELS: AiModelOption[] = [
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    name: 'MiniLM-L6-v2 (Default)',
    shortName: 'MiniLM-L6-v2',
    description: 'Fast & lightweight English semantic embedding model',
    size: '23 MB',
  },
  {
    id: 'Xenova/bge-small-en-v1.5',
    name: 'BGE-Small-en-v1.5',
    shortName: 'BGE-Small-en',
    description: 'High precision English semantic similarity model',
    size: '34 MB',
  },
  {
    id: 'Xenova/multilingual-e5-small',
    name: 'Multilingual-E5-small',
    shortName: 'Multilingual-E5',
    description: 'Cross-lingual Korean-English alignment embedding model',
    size: '45 MB',
  },
];

interface AiModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  modelStatus: 'idle' | 'loading' | 'ready' | 'error';
  modelProgress: string;
  onLoadModel: (modelId: string) => void;
}

export const AiModelModal: React.FC<AiModelModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  setSelectedModel,
  modelStatus,
  modelProgress,
  onLoadModel,
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

  const currentModelInfo = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
    >
      <div className="bg-[#fdfbf7] border border-[#e6e0d2] rounded-3xl p-6 w-full max-w-md shadow-xl flex flex-col gap-5 animate-scale-up text-[#2c2a29]">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#e6e0d2] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5c5243] text-2xl">developer_board</span>
            <h3 id="ai-modal-title" className="text-lg font-bold font-serif text-[#2c2a29] m-0">On-Device AI Engine</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#706b63] hover:text-[#2c2a29] p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Reference Screenshot On-Device Engine Card */}
        <div className="bg-[#f5f0e6] rounded-2xl border border-[#e6e0d2] p-4 flex flex-col gap-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fdfbf7] border border-[#e6e0d2] flex items-center justify-center text-[#5c5243] shadow-sm">
                <span className="material-symbols-outlined text-xl">developer_board</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-serif font-bold text-sm text-[#2c2a29] m-0">On-device engine</h4>
                <p className="text-[11px] text-[#706b63] m-0 font-mono">
                  {currentModelInfo.shortName} · runs in browser
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              modelStatus === 'ready'
                ? 'bg-[#edf6ee] border-[#bcf0da] text-[#03543f]'
                : modelStatus === 'loading'
                ? 'bg-[#fff8f1] border-[#feecdc] text-[#92400e] animate-pulse'
                : 'bg-black/5 border-black/10 text-[#706b63]'
            }`}>
              {modelStatus === 'ready' ? 'Ready' : modelStatus === 'loading' ? `Loading ${modelProgress}` : 'Not loaded'}
            </span>
          </div>

          {/* Action Button: Load model (~XX MB) */}
          <button
            onClick={() => onLoadModel(selectedModel)}
            disabled={modelStatus === 'loading'}
            className="w-full h-11 rounded-xl bg-[#2c2a29] hover:bg-[#1a1918] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {modelStatus === 'loading' ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                <span>모델 로딩 중 ({modelProgress})...</span>
              </>
            ) : modelStatus === 'ready' ? (
              <>
                <span className="material-symbols-outlined text-base text-[#0e9f6e]">check_circle</span>
                <span>모델 로드 완료 (즉시 사용 가능)</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">download</span>
                <span>Load model (~{currentModelInfo.size})</span>
              </>
            )}
          </button>
        </div>

        {/* Model Selection List */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#706b63] uppercase tracking-wider">
            사용할 온디바이스 모델 선택
          </label>

          <div className="flex flex-col gap-2">
            {AI_MODELS.map(model => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#fdfbf7] border-[#5c5243] shadow-sm'
                      : 'bg-[#f5f0e6] border-[#e6e0d2] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#2c2a29]' : 'text-[#706b63]'}`}>
                      {model.name}
                    </span>
                    <span className="text-[11px] text-[#706b63]">{model.description}</span>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#5c5243] bg-[#f5f0e6] px-2 py-0.5 rounded border border-[#e6e0d2] shrink-0">
                    ~{model.size}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-[#706b63] leading-relaxed m-0 text-center">
          💡 선택한 AI 모델은 브라우저 캐시에 한번 저장되면 네트워크 연결 없이도 0.01초 만에 즉시 실행됩니다.
        </p>
      </div>
    </div>
  );
};
