
import React, { useState, useMemo, useEffect } from 'react';
import { DataItem, ColumnDef, PivotConfig, PivotSuggestion } from '../types';
import { Table, ArrowRight, RefreshCw, Calculator, Maximize, Minimize, Sigma, X, Lightbulb, Wand2, Sparkles, Microscope, Palette, Layout, Grid3X3, Download, Check } from 'lucide-react';
import { generatePivotSuggestions } from '../services/geminiService';

interface PivotTableProps {
  data: DataItem[];
  columns: ColumnDef[];
  onSuggest: () => Promise<PivotConfig | null>;
  onConfigChange?: (config: PivotConfig) => void;
}

type PivotTheme = 'classic' | 'corporate' | 'modern' | 'nature' | 'dark';
type PivotDensity = 'compact' | 'normal' | 'relaxed';

const PivotTable: React.FC<PivotTableProps> = ({ data, columns, onSuggest, onConfigChange }) => {
  // Config State
  const [rowKey, setRowKey] = useState<string>('');
  const [colKey, setColKey] = useState<string>('');
  const [valueKey, setValueKey] = useState<string>('');
  const [aggregation, setAggregation] = useState<'sum' | 'count' | 'average' | 'min' | 'max'>('sum');
  
  // App State
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<PivotSuggestion[]>([]);

  // Design State
  const [showDesign, setShowDesign] = useState(false);
  const [theme, setTheme] = useState<PivotTheme>('corporate');
  const [density, setDensity] = useState<PivotDensity>('normal');
  const [striped, setStriped] = useState(true);
  const [bordered, setBordered] = useState(true);

  // Sync config with parent
  useEffect(() => {
    if (onConfigChange && rowKey && colKey && valueKey) {
        onConfigChange({ rowKey, colKey, valueKey, aggregation });
    }
  }, [rowKey, colKey, valueKey, aggregation, onConfigChange]);

  const handleAutoConfig = async () => {
      setLoading(true);
      const results = await generatePivotSuggestions(columns);
      setSuggestions(results);
      setShowSuggestions(true);
      setLoading(false);
  };

  const applySuggestion = (config: PivotConfig) => {
      setRowKey(config.rowKey);
      setColKey(config.colKey);
      setValueKey(config.valueKey);
      setAggregation(config.aggregation);
      setShowSuggestions(false);
  };

  const { matrix, rowLabels, colLabels } = useMemo(() => {
    if (!rowKey || !colKey || !valueKey) return { matrix: {}, rowLabels: [], colLabels: [] };

    const rLabels = Array.from(new Set(data.map(d => String(d[rowKey])))) as string[];
    const cLabels = Array.from(new Set(data.map(d => String(d[colKey])))) as string[];
    
    rLabels.sort();
    cLabels.sort();

    // Intermediate storage for complex aggs (like avg)
    const values: Record<string, Record<string, number[]>> = {};

    data.forEach(item => {
        const r = String(item[rowKey]) as string;
        const c = String(item[colKey]) as string;
        const val = Number(item[valueKey]) || 0;

        if (!values[r]) values[r] = {};
        if (!values[r][c]) values[r][c] = [];
        values[r][c].push(val);
    });

    const mat: Record<string, Record<string, number>> = {};
    
    rLabels.forEach((r: string) => {
        mat[r] = {};
        cLabels.forEach((c: string) => {
            const vals = values[r]?.[c] || [];
            if (vals.length === 0) {
                mat[r][c] = 0;
                return;
            }
            
            if (aggregation === 'sum') mat[r][c] = vals.reduce((a, b) => a + b, 0);
            else if (aggregation === 'count') mat[r][c] = vals.length;
            else if (aggregation === 'average') mat[r][c] = vals.reduce((a, b) => a + b, 0) / vals.length;
            else if (aggregation === 'min') mat[r][c] = Math.min(...vals);
            else if (aggregation === 'max') mat[r][c] = Math.max(...vals);
        });
    });

    return { matrix: mat, rowLabels: rLabels, colLabels: cLabels };

  }, [data, rowKey, colKey, valueKey, aggregation]);

  const handleExport = () => {
    if (!rowKey || !colKey) return;
    let csv = `${rowKey} \\ ${colKey},${colLabels.join(',')}\n`;
    rowLabels.forEach(r => {
        const rowData = colLabels.map(c => matrix[r]?.[c] || 0).join(',');
        csv += `${r},${rowData}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pivot_${rowKey}_vs_${colKey}.csv`;
    a.click();
  };

  // Styles based on Theme
  const getThemeStyles = () => {
      switch(theme) {
          case 'classic': return {
              header: 'bg-slate-100 text-slate-700 border-slate-300',
              rowOdd: 'bg-white',
              rowEven: 'bg-slate-50',
              cell: 'text-slate-600 border-slate-300',
              container: 'bg-white'
          };
          case 'modern': return {
              header: 'bg-white text-indigo-600 border-b-2 border-indigo-100',
              rowOdd: 'bg-white',
              rowEven: 'bg-indigo-50/30',
              cell: 'text-slate-600 border-slate-100',
              container: 'bg-white'
          };
          case 'nature': return {
              header: 'bg-emerald-50 text-emerald-800 border-emerald-100',
              rowOdd: 'bg-white',
              rowEven: 'bg-emerald-50/30',
              cell: 'text-emerald-900 border-emerald-100',
              container: 'bg-white'
          };
          case 'dark': return {
              header: 'bg-slate-800 text-slate-200 border-slate-700',
              rowOdd: 'bg-slate-900',
              rowEven: 'bg-slate-800',
              cell: 'text-slate-300 border-slate-700',
              container: 'bg-slate-900'
          };
          case 'corporate':
          default: return {
              header: 'bg-blue-600 text-white border-blue-700',
              rowOdd: 'bg-white',
              rowEven: 'bg-blue-50/50',
              cell: 'text-slate-700 border-slate-200',
              container: 'bg-white'
          };
      }
  };

  const styles = getThemeStyles();
  const paddingClass = density === 'compact' ? 'p-2' : density === 'relaxed' ? 'p-5' : 'p-3';

  const AggIcon = ({ type, icon: Icon }: any) => (
      <button
        onClick={() => setAggregation(type)}
        className={`flex flex-col items-center justify-center p-2 rounded-lg border w-12 h-12 transition-all ${aggregation === type ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
        title={type.charAt(0).toUpperCase() + type.slice(1)}
      >
          <Icon size={16} />
          <span className="text-[10px] font-bold mt-1 uppercase">{type.slice(0,3)}</span>
      </button>
  );

  if (data.length === 0) {
    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Table size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Data for Pivot</h3>
            <p className="text-slate-500 max-w-md">Please upload data or load the sample dataset to create pivot tables.</p>
        </div>
    );
  }

  return (
    <div className={`flex flex-col h-full rounded-2xl shadow-sm border overflow-hidden relative ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        
        {/* Suggestion Modal Overlay */}
        {showSuggestions && (
            <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-4xl max-h-[90%] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-violet-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Deep Pivot Analysis</h3>
                                <p className="text-xs text-slate-500">AI has analyzed your data and found these meaningful views</p>
                            </div>
                        </div>
                        <button onClick={() => setShowSuggestions(false)} className="p-1 hover:bg-white rounded-full transition-colors">
                            <X size={24} className="text-slate-400" />
                        </button>
                    </div>
                    <div className="p-4 md:p-6 overflow-y-auto bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestions.map((suggestion, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all flex flex-col">
                                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <Lightbulb size={16} className="text-yellow-500" />
                                    {suggestion.title}
                                </h4>
                                <p className="text-xs text-slate-500 mb-4 flex-1 leading-relaxed">{suggestion.description}</p>
                                
                                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 mb-4 border border-slate-100">
                                    <div className="flex justify-between"><span className="text-slate-400">Rows:</span> <span className="font-semibold text-slate-700">{suggestion.config.rowKey}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Cols:</span> <span className="font-semibold text-slate-700">{suggestion.config.colKey}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Value:</span> <span className="font-semibold text-slate-700">{suggestion.config.valueKey}</span></div>
                                </div>

                                <button 
                                    onClick={() => applySuggestion(suggestion.config)}
                                    className="w-full py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg font-medium text-sm transition-colors"
                                >
                                    Apply Configuration
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Configuration Section */}
        <div className={`p-4 md:p-6 border-b ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
             <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                        <Table size={20} />
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Pivot Table Builder</h2>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Cross-reference your data dimensions</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button 
                        onClick={() => setShowDesign(!showDesign)}
                        className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 border rounded-xl transition-all text-sm font-medium ${showDesign ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Palette size={16} />
                        Design
                    </button>
                    <button 
                        onClick={handleAutoConfig}
                        disabled={loading}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-medium disabled:opacity-70"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={16}/> : <Microscope size={16} />}
                        Deep Pivot Analysis
                    </button>
                </div>
             </div>
            
            {/* Design Toolbar */}
             {showDesign && (
                 <div className={`mt-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200 shadow-sm'}`}>
                     <div className="flex flex-wrap items-center gap-6">
                         {/* Theme Selector */}
                         <div className="space-y-1.5 w-full sm:w-auto">
                             <label className="text-xs font-bold text-slate-400 uppercase">Theme</label>
                             <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                                 {(['corporate', 'classic', 'modern', 'nature', 'dark'] as PivotTheme[]).map(t => (
                                     <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all whitespace-nowrap ${theme === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                     >
                                         {t}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         {/* Density Selector */}
                         <div className="space-y-1.5">
                             <label className="text-xs font-bold text-slate-400 uppercase">Density</label>
                             <div className="flex bg-slate-100 p-1 rounded-lg">
                                 <button onClick={() => setDensity('compact')} className={`p-1.5 rounded-md ${density === 'compact' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`} title="Compact"><Grid3X3 size={14}/></button>
                                 <button onClick={() => setDensity('normal')} className={`p-1.5 rounded-md ${density === 'normal' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`} title="Normal"><Layout size={14}/></button>
                                 <button onClick={() => setDensity('relaxed')} className={`p-1.5 rounded-md ${density === 'relaxed' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`} title="Relaxed"><Maximize size={14}/></button>
                             </div>
                         </div>

                         {/* Toggles */}
                         <div className="space-y-1.5 flex flex-col">
                             <label className="text-xs font-bold text-slate-400 uppercase">Options</label>
                             <div className="flex gap-2">
                                 <button 
                                    onClick={() => setStriped(!striped)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${striped ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                 >
                                     {striped && <Check size={12}/>} Striped
                                 </button>
                                 <button 
                                    onClick={() => setBordered(!bordered)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${bordered ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                 >
                                     {bordered && <Check size={12}/>} Borders
                                 </button>
                             </div>
                         </div>
                         
                         <div className="flex-1"></div>

                         {/* Export */}
                         <button 
                            onClick={handleExport}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto justify-center ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                         >
                             <Download size={16} />
                             Export Pivot
                         </button>
                     </div>
                 </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-6 items-end">
                 {/* Row Select */}
                 <div className={`md:col-span-3 p-3 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Rows</label>
                    <select 
                        className={`w-full text-sm font-semibold outline-none bg-transparent ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                        value={rowKey}
                        onChange={(e) => setRowKey(e.target.value)}
                    >
                        <option value="">Select Field...</option>
                        {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                 </div>

                 <div className="md:col-span-1 flex items-center justify-center text-slate-300 pb-2 md:pb-4 rotate-90 md:rotate-0">
                    <ArrowRight size={20} />
                 </div>

                 {/* Col Select */}
                 <div className={`md:col-span-3 p-3 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Columns</label>
                    <select 
                        className={`w-full text-sm font-semibold outline-none bg-transparent ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                        value={colKey}
                        onChange={(e) => setColKey(e.target.value)}
                    >
                         <option value="">Select Field...</option>
                        {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                 </div>

                 {/* Value Select */}
                 <div className={`md:col-span-3 p-3 rounded-xl border shadow-sm border-l-4 border-l-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Values</label>
                    <select 
                        className={`w-full text-sm font-semibold outline-none bg-transparent ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                        value={valueKey}
                        onChange={(e) => setValueKey(e.target.value)}
                    >
                         <option value="">Select Numeric Field...</option>
                        {columns.filter(c => c.type === 'number').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                 </div>

                  {/* Aggregation Select */}
                  <div className="md:col-span-2 flex justify-center gap-1">
                      <AggIcon type="sum" icon={Sigma} />
                      <AggIcon type="average" icon={Calculator} />
                      <AggIcon type="min" icon={Minimize} />
                      <AggIcon type="max" icon={Maximize} />
                  </div>
             </div>
        </div>

        {/* Matrix Render */}
        <div className={`flex-1 overflow-auto p-4 md:p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50/30'}`}>
            {(!rowKey || !colKey || !valueKey) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                    <Table size={48} className="mb-4 opacity-20" />
                    <p>Select Rows, Columns, and Values to generate matrix</p>
                </div>
            ) : (
                <div className={`rounded-lg overflow-hidden ${bordered ? 'border' : ''} ${styles.cell.split(' ').find(c => c.startsWith('border-')) || 'border-slate-200'}`}>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr>
                                <th className={`${paddingClass} ${styles.header} font-bold text-center sticky top-0 z-10 ${bordered ? 'border' : ''}`}>{rowKey} \ {colKey}</th>
                                {colLabels.map(col => (
                                    <th key={col} className={`${paddingClass} ${styles.header} font-bold text-right sticky top-0 z-10 ${bordered ? 'border' : ''}`}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rowLabels.map((row, rIdx) => {
                                const isOdd = rIdx % 2 !== 0;
                                const rowBg = striped && isOdd ? styles.rowEven : styles.rowOdd;
                                return (
                                    <tr key={row} className={`${rowBg} ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50/80'} transition-colors`}>
                                        <td className={`${paddingClass} font-medium ${styles.cell} ${bordered ? 'border' : ''}`}>{row}</td>
                                        {colLabels.map(col => {
                                            const val = matrix[row]?.[col] || 0;
                                            return (
                                                <td key={col} className={`${paddingClass} ${styles.cell} ${bordered ? 'border' : ''} text-right font-mono`}>
                                                    {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};

export default PivotTable;
