
import React, { useMemo, useState, useEffect } from 'react';
import { DataItem, ColumnDef, ReportChart } from '../types';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Sparkles, PlusCircle, LayoutDashboard, Settings2, AreaChart as AreaIcon, ScatterChart as ScatterIcon, Radar as RadarIcon, Wand2, Download, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { suggestChartConfig, suggestDashboard } from '../services/geminiService';

interface VisualizerProps {
  data: DataItem[];
  columns: ColumnDef[];
  onAskAI: (question: string) => void;
  onAddToReport: (chart: Omit<ReportChart, 'id'>) => void;
  onLoadSample: () => void;
}

// Vibrant Candy Palette for BroExcel
const COLORS = ['#F43F5E', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#6366F1'];

const Visualizer: React.FC<VisualizerProps> = ({ data, columns, onAskAI, onAddToReport, onLoadSample }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar'>('bar');
  const [xAxisKey, setXAxisKey] = useState<string>('');
  const [dataKey, setDataKey] = useState<string>('');
  const [added, setAdded] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'dashboard'>('single');
  const [dashboardCharts, setDashboardCharts] = useState<any[]>([]);

  // Initialize selections based on column types if empty
  useEffect(() => {
    if (data.length > 0 && columns.length > 0) {
        if (!xAxisKey) {
            const catCol = columns.find(c => c.type === 'string' || c.type === 'date');
            if (catCol) setXAxisKey(catCol.key);
        }
        if (!dataKey) {
            const numCol = columns.find(c => c.type === 'number');
            if (numCol) setDataKey(numCol.key);
        }
    }
  }, [data, columns]);

  const handleAutoVisualize = async () => {
    setIsSuggesting(true);
    const suggestion = await suggestChartConfig(columns);
    if (suggestion) {
        setXAxisKey(suggestion.xAxisKey);
        setDataKey(suggestion.dataKey);
        setChartType(suggestion.type as any);
        setViewMode('single');
    }
    setIsSuggesting(false);
  };
  
  const handleGenerateDashboard = async () => {
    setIsSuggesting(true);
    const configs = await suggestDashboard(columns);
    setDashboardCharts(configs);
    setViewMode('dashboard');
    setIsSuggesting(false);
  };

  // Helper to process chart data
  const processData = (xKey: string, yKey: string) => {
    if (!xKey || !yKey || data.length === 0) return [];

    const grouped = data.reduce((acc, curr) => {
      const rawVal = curr[xKey];
      const groupVal = rawVal ? String(rawVal) : 'Unknown';
      const metricVal = typeof curr[yKey] === 'number' ? curr[yKey] : 0;
      
      const existing = acc.find(item => item.name === groupVal);
      if (existing) {
        existing.value += metricVal;
      } else {
        acc.push({ name: groupVal, value: metricVal, rawKey: rawVal });
      }
      return acc;
    }, [] as any[]);
    
    // Sort
    const isDate = grouped.some(g => !isNaN(Date.parse(g.name)) && g.name.length > 4);
    if (isDate) {
        grouped.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    } else {
        grouped.sort((a, b) => b.value - a.value);
    }

    // Truncate
    if (grouped.length > 15) {
        const top15 = grouped.slice(0, 15);
        const others = grouped.slice(15);
        const otherSum = others.reduce((sum, item) => sum + item.value, 0);
        if (otherSum > 0) top15.push({ name: 'Others', value: otherSum });
        return top15;
    }
    return grouped;
  };

  const chartData = useMemo(() => processData(xAxisKey, dataKey), [data, xAxisKey, dataKey]);

  const handleAddToReport = () => {
    if (!xAxisKey || !dataKey) return;
    onAddToReport({
        type: chartType,
        xAxisKey,
        dataKey,
        title: `${dataKey} by ${xAxisKey}`
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleDownloadCSV = () => {
    if (chartData.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
        + [Object.keys(chartData[0]).join(",")]
        .concat(chartData.map(row => Object.values(row).join(","))).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `broexcel_chart_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ChartIcon = ({ type, icon: Icon }: any) => (
    <button 
        onClick={() => { setChartType(type); setViewMode('single'); }} 
        className={`p-2 rounded-lg transition-all ${chartType === type && viewMode === 'single' ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        title={type}
    >
        <Icon size={18} />
    </button>
  );

  if (data.length === 0) {
      return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Visualized</h3>
            <p className="text-slate-500 max-w-md mb-6">Upload a file to start visualizing your data, or use our sample dataset to see how it works.</p>
            <button 
                onClick={onLoadSample}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium text-sm"
            >
                Load Sample Data
            </button>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-50">
      <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row gap-4 justify-between items-center bg-gradient-to-r from-white to-slate-50">
        
        {/* Left: Title & Chart Type */}
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-lg shadow-sm">
                    <LayoutDashboard size={18} />
                </div>
                Visual Insights
            </h2>
            <div className="flex bg-slate-100/80 p-1 rounded-xl">
                <ChartIcon type="bar" icon={BarChart3} />
                <ChartIcon type="line" icon={LineIcon} />
                <ChartIcon type="area" icon={AreaIcon} />
                <ChartIcon type="pie" icon={PieIcon} />
            </div>
        </div>
        
        {/* Right: Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
             <button 
                onClick={handleGenerateDashboard}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl hover:shadow-md transition-all shadow-sm ${viewMode === 'dashboard' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
                <LayoutDashboard size={14} />
                Dashboard
            </button>

             <button 
                onClick={handleAutoVisualize}
                className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-xl hover:shadow-md transition-all shadow-sm"
                title="AI Auto-Select Best Chart"
            >
                {isSuggesting ? <Wand2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                <span className="hidden sm:inline">Auto</span>
            </button>

            {viewMode === 'single' && (
            <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1"><Settings2 size={12}/> X</span>
                    <select 
                        value={xAxisKey} 
                        onChange={(e) => setXAxisKey(e.target.value)}
                        className="text-sm bg-transparent font-bold text-slate-700 outline-none cursor-pointer max-w-[80px] truncate"
                    >
                        {columns.filter(c => c.type !== 'number').map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1"><BarChart3 size={12}/> Y</span>
                    <select 
                        value={dataKey} 
                        onChange={(e) => setDataKey(e.target.value)}
                        className="text-sm bg-transparent font-bold text-slate-700 outline-none cursor-pointer max-w-[80px] truncate"
                    >
                        {columns.filter(c => c.type === 'number').map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </>
            )}
            
            <div className="flex gap-2 border-l border-slate-200 pl-2">
                <button onClick={handleDownloadCSV} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Export CSV">
                    <FileSpreadsheet size={16} />
                </button>
                <button 
                    onClick={handleAddToReport}
                    disabled={viewMode === 'dashboard'}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all border shadow-sm ${added ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700 disabled:opacity-50'}`}
                >
                    <PlusCircle size={14} />
                    {added ? 'Added' : 'Add'}
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 p-8 bg-slate-50/30 overflow-y-auto">
        {viewMode === 'single' ? (
            <div className="h-full min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} interval={0} angle={chartData.length > 10 ? -45 : 0} textAnchor={chartData.length > 10 ? 'end' : 'middle'} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                    <Bar dataKey="value" name={dataKey} radius={[6, 6, 0, 0]} maxBarSize={60} animationDuration={1000}>
                        {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                    </BarChart>
                ) : chartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} interval={0} angle={chartData.length > 10 ? -45 : 0} textAnchor={chartData.length > 10 ? 'end' : 'middle'}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                    <Line type="monotone" dataKey="value" name={dataKey} stroke="#8B5CF6" strokeWidth={4} dot={{r: 6, fill: '#8B5CF6', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 8, strokeWidth: 0}} />
                    </LineChart>
                ) : chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} interval={0} angle={chartData.length > 10 ? -45 : 0} textAnchor={chartData.length > 10 ? 'end' : 'middle'}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                        <Area type="monotone" dataKey="value" stroke="#06B6D4" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                ) : (
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={100}
                            outerRadius={160}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={8}
                        >
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{paddingLeft: '20px'}}/>
                    </PieChart>
                )}
                </ResponsiveContainer>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {dashboardCharts.length > 0 ? dashboardCharts.map((cfg, idx) => {
                     const d = processData(cfg.xAxisKey, cfg.dataKey);
                     return (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col h-80">
                            <h4 className="text-sm font-bold text-slate-700 mb-4">{cfg.title || `${cfg.dataKey} by ${cfg.xAxisKey}`}</h4>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    {cfg.type === 'line' ? (
                                        <LineChart data={d}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={10} tick={false} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke={COLORS[idx % COLORS.length]} strokeWidth={3} dot={false} />
                                        </LineChart>
                                    ) : (
                                        <BarChart data={d}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={10} tick={false} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill={COLORS[idx % COLORS.length]} radius={[4,4,0,0]} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                     );
                }) : (
                    <div className="col-span-2 flex items-center justify-center text-slate-400">
                        Generating Dashboard...
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Visualizer;
