
import React from 'react';
import { ChatMessage } from '../types';
import { History, MessageSquare, Bot, User, Clock } from 'lucide-react';

interface HistoryViewProps {
  history: ChatMessage[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-50">
       <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-200 text-slate-600 rounded-xl">
                    <History size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Session History</h2>
                    <p className="text-xs text-slate-500">Timeline of AI interactions and actions</p>
                </div>
            </div>
       </div>

       <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
            <div className="max-w-3xl mx-auto space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200 before:z-0">
                {history.slice().reverse().map((msg) => (
                    <div key={msg.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            {msg.role === 'model' ? <Bot size={18} className="text-purple-600"/> : <User size={18} className="text-blue-600"/>}
                        </div>
                        
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 shadow-sm bg-white">
                            <div className="flex items-center justify-between space-x-2 mb-2">
                                <span className={`font-bold text-sm ${msg.role === 'model' ? 'text-purple-600' : 'text-blue-600'}`}>
                                    {msg.role === 'model' ? 'BroExcel AI' : 'You'}
                                </span>
                                <time className="font-mono text-xs text-slate-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </time>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};

export default HistoryView;
