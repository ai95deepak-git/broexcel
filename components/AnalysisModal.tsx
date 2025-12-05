
import React from 'react';
import { X, Sparkles, Lightbulb, BarChart } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisText: string;
  isThinking: boolean;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, analysisText, isThinking }) => {
  if (!isOpen) return null;

  const renderContent = (text: string) => {
    // Simple parser for the markdown structure we requested
    const sections = text.split('## ').filter(Boolean);
    
    return sections.map((section, idx) => {
        const [title, ...body] = section.split('\n');
        let Icon = Sparkles;
        if (title.includes('Health')) Icon = BarChart;
        if (title.includes('Recommendations')) Icon = Lightbulb;

        return (
            <div key={idx} className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-3">
                    <Icon size={18} className="text-purple-600" />
                    {title}
                </h3>
                <div className="text-slate-600 text-sm leading-relaxed space-y-2">
                    {body.join('\n').split('\n').map((line, i) => (
                        <p key={i}>{line.replace(/^\* /, '• ')}</p>
                    ))}
                </div>
            </div>
        );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Deep AI Analysis</h2>
                    <p className="text-xs text-slate-500">Comprehensive dataset review</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative">
             {isThinking ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4">
                     <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-slate-500 font-medium">Analyzing every cell...</p>
                 </div>
             ) : (
                 <div className="prose prose-slate max-w-none">
                     {renderContent(analysisText)}
                 </div>
             )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
