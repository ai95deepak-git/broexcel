
import React, { useMemo, useState, useEffect } from 'react';
import { DataItem, ColumnDef, ReportChart } from '../types';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  LayoutDashboard, Download, PlusCircle, Wand2, Table as TableIcon, 
  TrendingUp, DollarSign, Hash, RefreshCw, MoreHorizontal
} from 'lucide-react';
import { suggestDashboard } from '../services/geminiService';

interface DashboardProps {
  data: DataItem[];
  columns: ColumnDef[];
  onAddToReport: (chart: Omit<ReportChart, 'id'>) => void;
  onLoadSample: () => void;
  onConfigChange?: (config: any[]) => void;
}

const COLORS = ['#F43F5E', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#6366F1'];

const processChartData = (data: DataItem[], xKey: string, yKey: string) => {
    if (!xKey || !yKey || data.length === 0) return [];

    const grouped = data.reduce((acc, curr) => {
      const groupVal = curr[xKey] ? String(curr[xKey]) : 'Unknown';
      const metricVal = typeof curr[yKey] === 'number' ? curr[yKey] : 0;
      
      const existing = acc.find((item: any) => item.name === groupVal);
      if (existing) {
        existing.value += metricVal;
      } else {
        acc.push({ name: groupVal, value: metricVal });
      }
      return acc;
    }, [] as any[]);
    
    // Sort logic
    const isDate = grouped.some((g: any) => !isNaN(Date.parse(g.name)) && g.name.length > 4);
    if (isDate) grouped.sort((a: any, b: any) => new Date(a.name).getTime() - new Date(b.name).getTime());
    else grouped.sort((a: any, b: any) => b.value - a.value);

    // Limit to top 15 + Others
    if (grouped.length > 15) {
        const top15 = grouped.slice(0, 15);
        const others = grouped.slice(15);
        const otherSum = others.reduce((sum: number, item: any) => sum + item.value, 0);
        if (otherSum > 0) top15.push({ name: 'Others', value: otherSum });
        return top15;
    }
    return grouped;
};

interface ChartWidgetProps { 
    config: any; 
    index: number;
    data: DataItem[];
    onAddToReport: (chart: Omit<ReportChart, 'id'>) => void;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ config, index, data, onAddToReport }) => {
     const chartData = useMemo(() => processChartData(data, config.xAxisKey, config.dataKey), [data, config]);
     const [added, setAdded] = useState(false);

     const addToReport = () => {
         onAddToReport(config);
         setAdded(true);
         setTimeout(() => setAdded(false), 2000);
     };

     const handleDownloadChart = () => {
        const csvContent = "data:text/csv;charset=utf-8," 
           + "Group,Value\n"
           + chartData.map((row: any) => `${row.name},${row.value}`).join("\n");
       const encodedUri = encodeURI(csvContent);
       const link = document.createElement("a");
       link.setAttribute("href", encodedUri);
       link.setAttribute("download", `${config.title || 'chart'}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
     };

     return (
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-72 md:h-80 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-700 text-sm truncate pr-4" title={config.title}>{config.title}</h4>
                <div className="flex gap-1">
                    <button onClick={handleDownloadChart} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download Data">
                        <Download size={14} />
                    </button>
                    <button 
                        onClick={addToReport}
                        className={`p-1.5 rounded-lg transition-colors ${added ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
                        title="Add to Report"
                    >
                        <PlusCircle size={14} />
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {config.type === 'line' ? (
                        <LineChart data={chartData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" fontSize={10} tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                             <YAxis fontSize={10} tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false}/>
                             <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                             <Line type="monotone" dataKey="value" stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{r:3}} />
                        </LineChart>
                    ) : config.type === 'area' ? (
                        <AreaChart data={chartData}>
                             <defs>
                                <linearGradient id={`grad${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" fontSize={10} tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                             <YAxis fontSize={10} tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false}/>
                             <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                             <Area type="monotone" dataKey="value" stroke={COLORS[index % COLORS.length]} fill={`url(#grad${index})`} />
                        </AreaChart>
                    ) : config.type === 'pie' ? (
                        <PieChart>
                            <Pie data={chartData} dataKey="value" outerRadius={80} innerRadius={40} paddingAngle={2}>
                                {chartData.map((entry: any, idx: number) => (
                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        </PieChart>
                    ) : (
                        <BarChart data={chartData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" fontSize={10} tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                             <YAxis fontSize={10} tick={{fill: '#94a3b8'}} tickLine={false} axisLine={false}/>
                             <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                             <Bar dataKey="value" fill={COLORS[index % COLORS.length]} radius={[4,4,0,0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
     );
};

const Dashboard: React.FC<DashboardProps> = ({ data, columns, onAddToReport, onLoadSample, onConfigChange }) => {
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-generate dashboard config if data exists but widgets don't
  useEffect(() => {
    if (data.length > 0 && widgets.length === 0) {
       handleGenerateDashboard();
    }
  }, [data]);

  // Sync widgets with parent
  useEffect(() => {
    if (onConfigChange && widgets.length > 0) {
        onConfigChange(widgets);
    }
  }, [widgets, onConfigChange]);

  const handleGenerateDashboard = async () => {
    setLoading(true);
    // Use AI to suggest or fallback to default
    let configs = await suggestDashboard(columns);
    
    // Fallback if AI fails or returns empty (Heuristic for Uploaded Excel)
    if (!configs || configs.length === 0) {
        const numCols = columns.filter(c => c.type === 'number');
        const catCols = columns.filter(c => c.type === 'string' || c.type === 'date');
        
        if (numCols.length > 0 && catCols.length > 0) {
            configs = [
                { type: 'bar', xAxisKey: catCols[0].key, dataKey: numCols[0].key, title: `${numCols[0].label} by ${catCols[0].label}` },
                { type: 'line', xAxisKey: catCols[0].key, dataKey: numCols[0].key, title: `${numCols[0].label} Trend` }
            ];
            if (numCols.length > 1) {
                configs.push({ type: 'area', xAxisKey: catCols[0].key, dataKey: numCols[1].key, title: `${numCols[1].label} Analysis` });
            }
             if (catCols.length > 1) {
                configs.push({ type: 'bar', xAxisKey: catCols[1].key, dataKey: numCols[0].key, title: `${numCols[0].label} by ${catCols[1].label}` });
            }
        }
    }
    setWidgets(configs);
    setLoading(false);
  };

  // KPI Calculation
  const kpis = useMemo(() => {
    return columns.filter(c => c.type === 'number').slice(0, 4).map(col => {
        const total = data.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
        return {
            label: col.label,
            value: total.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            icon: total > 100000 ? DollarSign : Hash
        };
    });
  }, [data, columns]);

  // Data Processor Helper (Wrapped for handleDownloadChart usage in ChartWidget)
  const handleDownloadChart = (config: any) => {
     // Simple CSV export for specific chart data
     const chartData = processChartData(data, config.xAxisKey, config.dataKey);
     const csvContent = "data:text/csv;charset=utf-8," 
        + "Group,Value\n"
        + chartData.map((row: any) => `${row.name},${row.value}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${config.title || 'chart'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (data.length === 0) {
      return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <LayoutDashboard size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Dashboard Empty</h3>
            <p className="text-slate-500 max-w-md mb-6">Upload data to see your interactive dashboard.</p>
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
    <div className="flex flex-col h-full overflow-y-auto">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 shrink-0 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md">
                    <LayoutDashboard size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Executive Dashboard</h2>
                    <p className="text-xs text-slate-500">Real-time performance overview</p>
                </div>
            </div>
            <button 
                onClick={handleGenerateDashboard}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium shadow-sm"
            >
                {loading ? <RefreshCw className="animate-spin" size={16}/> : <Wand2 size={16} />}
                Regenerate Layout
            </button>
       </div>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 shrink-0">
            {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-full ${idx === 0 ? 'bg-blue-50 text-blue-600' : idx === 1 ? 'bg-purple-50 text-purple-600' : idx === 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        <kpi.icon size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800">{kpi.value}</p>
                    </div>
                </div>
            ))}
       </div>

       {/* Grid Layout */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Charts - Take up 2/3rds width on large screens */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {widgets.map((widget, idx) => (
                    <ChartWidget 
                        key={idx} 
                        config={widget} 
                        index={idx} 
                        data={data}
                        onAddToReport={onAddToReport}
                    />
                ))}
            </div>

            {/* Mini Table Widget - Takes up 1/3rd width */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-96 lg:h-[664px]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <TableIcon size={16} className="text-slate-400"/>
                        Data Preview
                    </h4>
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{data.length} rows</span>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="text-slate-500 bg-slate-50 sticky top-0">
                            <tr>
                                {columns.slice(0, 3).map(col => (
                                    <th key={col.key} className="px-4 py-3 font-semibold border-b border-slate-100">{col.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.slice(0, 20).map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    {columns.slice(0, 3).map(col => (
                                        <td key={col.key} className="px-4 py-2 text-slate-600 truncate max-w-[100px]">{row[col.key]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                    <p className="text-xs text-slate-400">Showing top 20 rows</p>
                </div>
            </div>
       </div>
    </div>
  );
};

export default Dashboard;
