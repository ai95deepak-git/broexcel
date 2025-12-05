
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, FileText, Download, PenTool, LayoutTemplate, Printer, Presentation, BrainCircuit, MessageSquare, RotateCcw, TrendingUp, DollarSign, ShieldCheck, FileType, PlusSquare, BarChart3, Table, X } from 'lucide-react';
import { DataItem, ReportChart, ReportStage, ReportTemplate, ColumnDef, PivotConfig } from '../types';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { suggestReportTemplates } from '../services/geminiService';

interface ReportEditorProps {
    content: string;
    stage: ReportStage;
    analysisContent: string;
    onContentChange: (text: string) => void;
    onAnalyze: () => void;
    onGenerateFull: (instructions: string) => void;
    onImprove: () => void;
    onExportPPT: () => void;
    onReset: () => void;
    isThinking: boolean;
    charts: ReportChart[];
    onAddChart: (chart: Omit<ReportChart, 'id'>) => void;
    dashboardWidgets: any[];
    pivotConfig: PivotConfig | null;
    data: DataItem[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const ChartRenderer: React.FC<{ chart: ReportChart; data: DataItem[] }> = ({ chart, data }) => {
    const { dataKey, xAxisKey, type, title, pivotConfig } = chart;

    // Pivot Table Rendering Logic
    if (type === 'pivot' && pivotConfig) {
        const { rowKey, colKey, valueKey, aggregation } = pivotConfig;

        const { matrix, rowLabels, colLabels } = useMemo(() => {
            const rLabels = Array.from(new Set(data.map(d => String(d[rowKey])))).sort();
            const cLabels = Array.from(new Set(data.map(d => String(d[colKey])))).sort();
            const mat: Record<string, Record<string, number>> = {};

            const values: Record<string, Record<string, number[]>> = {};
            data.forEach(item => {
                const r = String(item[rowKey]);
                const c = String(item[colKey]);
                const val = Number(item[valueKey]) || 0;
                if (!values[r]) values[r] = {};
                if (!values[r][c]) values[r][c] = [];
                values[r][c].push(val);
            });

            rLabels.forEach((r: string) => {
                mat[r] = {};
                cLabels.forEach((c: string) => {
                    const vals = values[r]?.[c] || [];
                    if (vals.length === 0) { mat[r][c] = 0; return; }

                    if (aggregation === 'sum') mat[r][c] = vals.reduce((a, b) => a + b, 0);
                    else if (aggregation === 'count') mat[r][c] = vals.length;
                    else if (aggregation === 'average') mat[r][c] = vals.reduce((a, b) => a + b, 0) / vals.length;
                    else if (aggregation === 'min') mat[r][c] = Math.min(...vals);
                    else if (aggregation === 'max') mat[r][c] = Math.max(...vals);
                });
            });

            return { matrix: mat, rowLabels: rLabels, colLabels: cLabels };
        }, [data, rowKey, colKey, valueKey, aggregation]);

        return (
            <div className="my-8 p-6 bg-white rounded-lg border border-slate-200 shadow-sm break-inside-avoid">
                <h4 className="text-sm font-semibold text-slate-500 mb-4 text-center uppercase tracking-wider">{title}</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 border bg-slate-50 font-bold">{rowKey} \ {colKey}</th>
                                {colLabels.map(c => <th key={c} className="p-2 border bg-slate-50 font-bold text-right">{c}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rowLabels.map((r: string) => (
                                <tr key={r}>
                                    <td className="p-2 border font-medium">{r}</td>
                                    {colLabels.map((c: string) => (
                                        <td key={c} className="p-2 border text-right font-mono">
                                            {matrix[r]?.[c]?.toLocaleString(undefined, { maximumFractionDigits: 1 }) || 0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Standard Chart Rendering Logic
    if (xAxisKey && dataKey) {
        const chartData = data.reduce((acc: Array<{ name: string, value: number }>, curr) => {
            const groupVal = curr[xAxisKey] ? String(curr[xAxisKey]) : 'Unknown';
            const metricVal = typeof curr[dataKey] === 'number' ? curr[dataKey] : 0;

            const existing = acc.find(item => item.name === groupVal);
            if (existing) {
                existing.value += metricVal;
            } else {
                acc.push({ name: groupVal, value: metricVal });
            }
            return acc;
        }, []);

        return (
            <div className="my-8 p-6 bg-white rounded-lg border border-slate-200 shadow-sm break-inside-avoid print:shadow-none print:border">
                <h4 className="text-sm font-semibold text-slate-500 mb-4 text-center uppercase tracking-wider">{title}</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {type === 'bar' ? (
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3b82f6" name={dataKey} />
                            </BarChart>
                        ) : type === 'line' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name={dataKey} />
                            </LineChart>
                        ) : (
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return null;
};

const ReportEditor: React.FC<ReportEditorProps> = ({
    content,
    stage,
    analysisContent,
    onContentChange,
    onAnalyze,
    onGenerateFull,
    onImprove,
    onExportPPT,
    onReset,
    isThinking,
    charts,
    onAddChart,
    dashboardWidgets,
    pivotConfig,
    data
}) => {
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');
    const [instructions, setInstructions] = useState('');
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);

    useEffect(() => {
        if (stage === 'analysis' && data.length > 0 && templates.length === 0 && !loadingTemplates) {
            setLoadingTemplates(true);
            // Infer columns from data[0] if available
            const cols: ColumnDef[] = Object.keys(data[0]).map(k => ({
                key: k, label: k, type: typeof data[0][k] === 'number' ? 'number' : 'string'
            }));

            suggestReportTemplates(data, cols).then(temps => {
                if (temps.length === 0) {
                    // Fallback templates if AI fails
                    setTemplates([
                        { id: 'default1', title: 'General Overview', description: 'A standard summary of the data.', instruction: 'Write a comprehensive overview.', icon: 'general' },
                        { id: 'default2', title: 'Key Trends', description: 'Focus on patterns and changes over time.', instruction: 'Analyze trends and growth.', icon: 'trend' }
                    ]);
                } else {
                    setTemplates(temps);
                }
                setLoadingTemplates(false);
            }).catch(() => {
                setTemplates([
                    { id: 'default1', title: 'General Overview', description: 'A standard summary of the data.', instruction: 'Write a comprehensive overview.', icon: 'general' }
                ]);
                setLoadingTemplates(false);
            });
        }
    }, [stage, data, templates.length]);

    const handleInsert = (item: any) => {
        if (item.type === 'pivot') {
            onAddChart({
                title: `Pivot Analysis: ${item.config.rowKey} vs ${item.config.colKey}`,
                type: 'pivot',
                pivotConfig: item.config
            });
        } else {
            onAddChart({
                title: item.title,
                type: item.type,
                xAxisKey: item.xAxisKey,
                dataKey: item.dataKey
            });
        }
        setIsInsertModalOpen(false);
    };

    // Helper to render markdown-like text
    const renderMarkdown = (text: string) => {
        const parseInline = (line: string) => {
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        return text.split('\n').map((line, idx) => {
            if (line.startsWith('# ')) return <h1 key={idx} className="text-3xl font-bold text-slate-900 mt-8 mb-6 pb-2 border-b border-slate-200">{parseInline(line.replace('# ', ''))}</h1>;
            if (line.startsWith('## ')) return <h2 key={idx} className="text-xl font-bold text-slate-800 mt-8 mb-4">{parseInline(line.replace('## ', ''))}</h2>;
            if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{parseInline(line.replace('### ', ''))}</h3>;
            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx} className="ml-4 list-disc text-slate-700 my-1 pl-1 marker:text-slate-400 leading-relaxed">{parseInline(line.replace(/^[-*] /, ''))}</li>;
            if (line.trim() === '') return <div key={idx} className="h-4"></div>;

            return <p key={idx} className="text-slate-700 leading-relaxed mb-2">{parseInline(line)}</p>;
        });
    };

    const getIcon = (icon: string) => {
        switch (icon) {
            case 'trend': return TrendingUp;
            case 'finance': return DollarSign;
            case 'audit': return ShieldCheck;
            default: return FileText;
        }
    };

    const handleTemplateClick = (template: ReportTemplate) => {
        setInstructions(template.instruction);
    };

    // State 1: No Data
    if (!content && data.length === 0) {
        return (
            <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Report Not Generated</h3>
                <p className="text-slate-500 max-w-md">Once you upload data, AI will automatically draft an executive summary here.</p>
            </div>
        );
    }

    // State 2: Analysis Phase
    if (stage === 'analysis') {
        return (
            <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BrainCircuit size={24} className="text-indigo-600" />
                            Preliminary Analysis
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">AI has analyzed your data. Review the insights below and provide specific instructions for the final report.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    {/* Analysis Content */}
                    {analysisContent ? (
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm mb-8 prose prose-slate max-w-none">
                                {renderMarkdown(analysisContent)}
                            </div>

                            {/* AI Recommended Report Models */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Sparkles size={20} className="text-amber-500" />
                                    AI Recommended Report Models
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {loadingTemplates ? (
                                        <div className="col-span-3 text-center py-6 text-slate-400 italic">Thinking of report ideas...</div>
                                    ) : (
                                        templates.map(temp => {
                                            const Icon = getIcon(temp.icon);
                                            return (
                                                <button
                                                    key={temp.id}
                                                    onClick={() => handleTemplateClick(temp)}
                                                    className={`text-left p-4 rounded-xl border transition-all ${instructions === temp.instruction ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className={`p-2 rounded-lg ${instructions === temp.instruction ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            <Icon size={18} />
                                                        </div>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{temp.title}</h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2">{temp.description}</p>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Instruction Form */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MessageSquare size={20} className="text-blue-500" />
                                    Customize Report Generation
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            How should the final report be structured?
                                        </label>
                                        <textarea
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            placeholder="Select a model above or type custom instructions (e.g. Focus on Q3 revenue drop, use formal tone...)"
                                            className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => onGenerateFull(instructions)}
                                            disabled={isThinking}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-md disabled:opacity-50"
                                        >
                                            {isThinking ? <Sparkles className="animate-spin" /> : <Sparkles />}
                                            Create Final Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <BrainCircuit size={32} className="text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Analyze</h3>
                            <p className="text-slate-500 max-w-md mb-8">We will first scan your data for trends and anomalies before writing the report.</p>
                            <button
                                onClick={onAnalyze}
                                disabled={isThinking}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold flex items-center gap-2"
                            >
                                {isThinking ? 'Analyzing...' : 'Start Data Analysis'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // State 3: Drafting/Final Phase
    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">

            {/* Insert Modal */}
            {isInsertModalOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80%]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Insert Visuals</h3>
                            <button onClick={() => setIsInsertModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">From Dashboard</h4>
                            {dashboardWidgets.map((w, idx) => (
                                <button key={idx} onClick={() => handleInsert(w)} className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center gap-3 group">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100"><BarChart3 size={18} /></div>
                                    <span className="font-medium text-slate-700 text-sm">{w.title || `Chart ${idx + 1}`}</span>
                                </button>
                            ))}
                            {dashboardWidgets.length === 0 && <p className="text-sm text-slate-400 italic px-3">No dashboard charts generated yet.</p>}

                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">From Pivot Table</h4>
                            {pivotConfig ? (
                                <button onClick={() => handleInsert({ type: 'pivot', config: pivotConfig })} className="w-full text-left p-3 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center gap-3 group">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100"><Table size={18} /></div>
                                    <div>
                                        <span className="font-medium text-slate-700 text-sm block">Current Pivot View</span>
                                        <span className="text-xs text-slate-400">{pivotConfig.rowKey} vs {pivotConfig.colKey}</span>
                                    </div>
                                </button>
                            ) : (
                                <p className="text-sm text-slate-400 italic px-3">No active pivot table configuration.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
                <div className="flex items-center gap-2 text-slate-700">
                    <FileText size={20} />
                    <h2 className="font-semibold">Live Report</h2>
                </div>

                {/* Toggle & Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex bg-slate-200 rounded-lg p-1 mr-2">
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'edit' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Preview
                        </button>
                    </div>

                    <button
                        onClick={() => setIsInsertModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs md:text-sm rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <PlusSquare size={14} />
                        <span className="hidden md:inline">Insert Visuals</span>
                    </button>

                    <div className="flex gap-2 border-l pl-2 border-slate-200">
                        <button
                            onClick={onReset}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs md:text-sm rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                            title="Start Over"
                        >
                            <RotateCcw size={14} />
                            <span className="hidden md:inline">Reset</span>
                        </button>
                        <button
                            onClick={onExportPPT}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 text-xs md:text-sm rounded-md hover:bg-orange-200 transition-colors shadow-sm border border-orange-200"
                            title="Download PowerPoint"
                        >
                            <Presentation size={14} />
                            <span className="hidden md:inline">PPT</span>
                        </button>
                        <button
                            onClick={onImprove}
                            disabled={isThinking}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs md:text-sm rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                            <PenTool size={14} />
                            <span className="hidden md:inline">Polish</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">

                {/* Editor (Text Area) */}
                <div className={`flex-1 h-full flex flex-col ${activeTab === 'edit' ? 'block' : 'hidden'}`}>
                    <textarea
                        className="w-full h-full p-8 resize-none focus:outline-none text-slate-800 leading-relaxed font-mono text-sm bg-slate-50/50"
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        placeholder="Start typing your report here..."
                    />
                </div>

                {/* Preview (Rendered) */}
                <div className={`flex-1 h-full overflow-y-auto bg-white p-8 md:p-12 ${activeTab === 'preview' ? 'block' : 'hidden'}`}>
                    <div className="max-w-3xl mx-auto shadow-sm p-8 md:p-12 bg-white border border-slate-100 min-h-[800px]">
                        {/* Render Text */}
                        <div className="prose prose-slate max-w-none">
                            {renderMarkdown(content)}
                        </div>

                        {/* Render Charts Section */}
                        {charts.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-slate-200 break-before-page">
                                <h2 className="text-xl font-bold text-slate-800 mb-6">Appendix: Data Visuals</h2>
                                <div className="grid grid-cols-1 gap-8">
                                    {charts.map(chart => (
                                        <ChartRenderer key={chart.id} chart={chart} data={data} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportEditor;
