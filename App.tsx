import React, { useState } from 'react';
import { AppState, AppView, ChatMessage, DataItem, ReportChart, ColumnDef, ReportStage, PivotConfig } from './types';
import { INITIAL_DATA, INITIAL_REPORT, INITIAL_COLUMNS, SAMPLE_DATA, SAMPLE_COLUMNS, SAMPLE_REPORT } from './constants';
import Spreadsheet from './components/Spreadsheet';
import Dashboard from './components/Dashboard';
import ContextRail from './components/ContextRail';
import Home from './components/Home';
import AnalysisModal from './components/AnalysisModal';
import HistoryView from './components/HistoryView';
import PdfToExcel from './components/PdfToExcel';
import ImageMapper from './components/ImageMapper';
import { chatWithData, improveWriting, generateDataForQuery, generateExecutiveReport, generateDeepAnalysis, suggestPivotConfiguration, generatePreReportAnalysis } from './services/geminiService';
import { exportToPPT } from './services/pptService';
import { parseExcelFile } from './services/fileService';
import { LayoutGrid, LayoutDashboard, FileText, MessageSquare, Home as HomeIcon, ChevronRight, BrainCircuit, Table, History, Grid, Save, LogIn, LogOut, User, Settings as SettingsIcon, FolderOpen, Activity } from 'lucide-react';
import Workspace from './components/Workspace';
import Settings from './components/Settings';
import ActivityView from './components/ActivityView';
import { api } from './services/api';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { AuthModal } from './components/auth/AuthModal';

// Lazy load heavy components
const PivotTable = React.lazy(() => import('./components/PivotTable'));
const ReportEditor = React.lazy(() => import('./components/ReportEditor'));

// Loading Fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full w-full p-10">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const MainApp: React.FC = () => {
  // Global State
  const [data, setData] = useState<DataItem[]>(INITIAL_DATA);
  const [columns, setColumns] = useState<ColumnDef[]>(INITIAL_COLUMNS);
  const [reportContent, setReportContent] = useState<string>(INITIAL_REPORT);
  const [reportStage, setReportStage] = useState<ReportStage>('analysis');
  const [preReportAnalysis, setPreReportAnalysis] = useState<string>('');
  const [reportCharts, setReportCharts] = useState<ReportChart[]>([]);
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: '0', role: 'model', text: 'Welcome to BroExcel! I am ready to crunch numbers. Upload a file to get started.', timestamp: new Date() }
  ]);
  const [isRailOpen, setIsRailOpen] = useState(false);

  // Shared Assets State
  const [dashboardConfig, setDashboardConfig] = useState<any[]>([]);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig | null>(null);

  // Deep Analysis Modal State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

  // Auth State
  const { isAuthenticated, logout, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [datasetName, setDatasetName] = useState(""); // Add state for dataset name if needed, or prompt user

  // Handlers
  const handleLoadSample = () => {
    setData(SAMPLE_DATA);
    setColumns(SAMPLE_COLUMNS);
    setReportContent(SAMPLE_REPORT);
    setReportStage('drafting'); // Sample data skips analysis
    setReportCharts([]);
    setView(AppView.DASHBOARD);

    const msg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: 'I have loaded the sample retail sales dataset for you.',
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, msg]);
    setChatHistory(prev => [...prev, msg]);
  };

  // Persistence
  React.useEffect(() => {
    const loadSavedData = async () => {
      try {
        const datasets = await api.loadData();
        if (datasets && datasets.length > 0) {
          // Load the most recent one
          const latest = datasets[0];
          setData(latest.data);
          setColumns(latest.columns);
          const msg: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: `Welcome back! I've loaded your saved dataset "${latest.name}".`,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, msg]);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    // Only load saved data if authenticated
    if (isAuthenticated) {
      loadSavedData();
    }
  }, [isAuthenticated]);

  const handleSaveData = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    // Simple prompt for name for now, or use a default
    const name = prompt("Enter a name for this dataset:", `Dataset ${new Date().toLocaleString()}`);
    if (!name) return;

    setIsAiThinking(true);
    try {
      await api.saveData(name, data, columns);
      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: 'I have securely saved your dataset to the database.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, msg]);
    } catch (e) {
      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: 'Failed to save data. Please check the backend connection.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, msg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setIsAiThinking(true);

    let responseText = '';

    try {
      if (text.toLowerCase().includes('generate data') || text.toLowerCase().includes('create rows')) {
        const newData = await generateDataForQuery(text);
        if (newData && newData.length > 0) {
          // Determine generic columns from the new data if starting fresh
          const keys = Object.keys(newData[0]);
          const newCols: ColumnDef[] = keys.map(k => ({
            key: k,
            label: k.charAt(0).toUpperCase() + k.slice(1),
            type: typeof newData[0][k] === 'number' ? 'number' : 'string'
          }));

          setData(prev => [...prev, ...newData]);
          if (data.length === 0) setColumns(newCols);

          responseText = `I've added ${newData.length} new rows to your spreadsheet.`;
        } else {
          responseText = "I tried to generate data but encountered an issue.";
        }
      } else {
        // Check for Actions via API
        const aiResponse = await chatWithData(text, data, JSON.stringify(chatHistory.slice(-3)));

        if (aiResponse.includes("ACTION_PPT")) {
          await exportToPPT(data, reportContent, reportCharts);
          responseText = "I've generated your PowerPoint presentation. It should be downloading now.";
        } else if (aiResponse.includes("ACTION_PIVOT")) {
          setView(AppView.PIVOT);
          responseText = "Switching to Pivot Table view as requested.";
        } else if (aiResponse.includes("ACTION_DASHBOARD")) {
          setView(AppView.DASHBOARD);
          responseText = "Opening the Dashboard for you.";
        } else {
          responseText = aiResponse;
        }
      }
    } catch (e) {
      responseText = "I encountered an error processing your request.";
    }

    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
    setChatHistory(prev => [...prev, aiMsg]);
    setIsAiThinking(false);
  };

  const handleDeepAnalysis = async () => {
    if (data.length === 0) {
      alert("Please upload data first.");
      return;
    }
    setIsAnalysisModalOpen(true);
    setAnalysisResult(""); // Clear previous
    setIsAiThinking(true);

    const result = await generateDeepAnalysis(data, columns);
    setAnalysisResult(result);
    setIsAiThinking(false);
  };

  const handleFixGrammar = async () => {
    setIsAiThinking(true);
    const improved = await improveWriting(reportContent);
    setReportContent(improved);
    setIsAiThinking(false);

    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: 'I have polished the grammar and tone of your executive report.',
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, aiMsg]);
  };

  const handleStartAnalysis = async () => {
    if (data.length === 0) return;
    setIsAiThinking(true);
    const analysis = await generatePreReportAnalysis(data, columns);
    setPreReportAnalysis(analysis);
    setIsAiThinking(false);
  };

  const handleResetReport = () => {
    setReportContent("");
    setReportStage('analysis');
    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: 'Report discarded. You can now adjust your instructions and generate a new one.',
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, aiMsg]);
  };

  const handleGenerateFullReport = async (instructions: string) => {
    if (data.length === 0) return;
    setIsAiThinking(true);
    const fullReport = await generateExecutiveReport(data, instructions);
    setReportContent(fullReport);
    setReportStage('drafting');
    setIsAiThinking(false);

    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: 'I have generated your custom executive report based on the provided instructions.',
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, aiMsg]);
  };

  const handleExportPPT = async () => {
    await exportToPPT(data, reportContent, reportCharts);
  };

  const handlePivotSuggest = async () => {
    return await suggestPivotConfiguration(columns);
  }

  const handleGenerateData = async (query: string) => {
    if (!isRailOpen) setIsRailOpen(true);
    await handleSendMessage(`Generate data: ${query}`);
  }

  const handleAddToReport = (chartConfig: Omit<ReportChart, 'id'>) => {
    const newChart: ReportChart = {
      ...chartConfig,
      id: Math.random().toString(36).substr(2, 9)
    };
    setReportCharts(prev => [...prev, newChart]);

    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: `I've added the ${chartConfig.title} chart to your report appendix.`,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, aiMsg]);
    if (!isRailOpen) setIsRailOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    setIsAiThinking(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const { data: cleanData, columns: detectedColumns } = await parseExcelFile(file);

      setColumns(detectedColumns);
      setData(cleanData);
      setReportCharts([]);

      // Reset Report State for new workflow
      setReportContent("");
      setReportStage('analysis');
      setPreReportAnalysis("");

      setView(AppView.SPREADSHEET);

      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: `Import successful! I detected ${detectedColumns.length} columns. Go to the Report tab to start your analysis.`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("Error parsing file", error);
      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: `I couldn't read that file. Please try a valid Excel (.xlsx) file.`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleOpenWorkspaceItem = (data: DataItem[], columns: ColumnDef[]) => {
    setData(data);
    setColumns(columns);
    setReportCharts([]);
    setReportContent("");
    setReportStage('analysis');
    setView(AppView.SPREADSHEET);
    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: `I've opened your saved dataset. You can now analyze it.`,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, aiMsg]);
  };

  const NavButton = ({ targetView, icon: Icon, label }: { targetView: AppView, icon: any, label: string }) => (
    <button
      onClick={() => setView(targetView)}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${view === targetView
        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
    >
      <Icon size={18} className={`transition-colors ${view === targetView ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-slate-900 selection:bg-blue-100">

      {/* Analysis Modal */}
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        analysisText={analysisResult}
        isThinking={isAiThinking}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">

        {/* Modern Header */}
        <header className="h-16 flex items-center px-4 md:px-6 justify-between shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setView(AppView.HOME)}>
            {/* Animated Logo */}
            <div className="w-9 h-9 relative flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-green-400 rounded-lg opacity-30 group-hover:opacity-60 blur-md transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-tr from-emerald-500 to-green-400 w-full h-full rounded-lg flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
                <Grid size={20} className="text-white animate-pulse" />
              </div>
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 hidden sm:block">
              BroExcel
            </span>
          </div>

          <nav className="flex items-center gap-1 mx-2 md:mx-4 p-1 bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto no-scrollbar max-w-[calc(100vw-150px)] md:max-w-none">
            <NavButton targetView={AppView.HOME} icon={HomeIcon} label="Home" />
            <div className="w-px h-5 bg-slate-200 mx-1 self-center hidden md:block"></div>
            <NavButton targetView={AppView.SPREADSHEET} icon={LayoutGrid} label="Data" />
            <NavButton targetView={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavButton targetView={AppView.PIVOT} icon={Table} label="Pivot" />
            <NavButton targetView={AppView.REPORT} icon={FileText} label="Report" />
            <NavButton targetView={AppView.HISTORY} icon={History} label="History" />
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveData}
              disabled={data.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-medium disabled:opacity-50"
              title="Save to Database"
            >
              <Save size={16} />
              <span className="hidden md:inline">Save</span>
            </button>
            <button
              onClick={handleDeepAnalysis}
              disabled={data.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="AI Deep Analysis"
            >
              <BrainCircuit size={16} />
              <span className="hidden md:inline">Analyze</span>
            </button>
            <button
              onClick={() => setIsRailOpen(!isRailOpen)}
              className={`p-2.5 rounded-lg transition-all duration-200 border shrink-0 ${isRailOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-white border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Toggle AI Chat"
            >
              {isRailOpen ? <ChevronRight size={20} /> : <MessageSquare size={20} />}
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                      {user?.name ? user.name[0].toUpperCase() : user?.email[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden md:block">
                      Hi, {user?.name ? user.name.split(' ')[0] : 'User'}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-slate-50 mb-2">
                        <p className="text-sm font-semibold text-slate-800">Hi, {user?.name ? user.name.split(' ')[0] : 'User'}</p>
                      </div>

                      <button onClick={() => { setView(AppView.WORKSPACE); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2">
                        <FolderOpen size={16} /> My Workspace
                      </button>
                      <button onClick={() => { setView(AppView.ACTIVITY); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2">
                        <Activity size={16} /> Activity
                      </button>
                      <button onClick={() => { setView(AppView.HISTORY); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2">
                        <History size={16} /> History
                      </button>
                      <button onClick={() => { setView(AppView.SETTINGS); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2">
                        <SettingsIcon size={16} /> Settings
                      </button>

                      <div className="border-t border-slate-50 mt-2 pt-2">
                        <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <LogIn size={18} />
                  <span>Sign In</span>
                </button>
              )}
            </div>

          </div>
        </header>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

        {/* Viewport */}
        <main className="flex-1 overflow-hidden relative bg-slate-50">
          <div className="h-full w-full transition-all duration-300 p-0">
            {view === AppView.HOME && (
              <Home
                onNavigate={setView}
                onUpload={handleFileUpload}
                onLoadSample={handleLoadSample}
                onLogin={() => setShowAuthModal(true)}
              />
            )}
            {view === AppView.SPREADSHEET && (
              <div className="h-full p-2 md:p-6 max-w-7xl mx-auto flex flex-col">
                <Spreadsheet
                  data={data}
                  columns={columns}
                  onUpdate={setData}
                  onGenerateData={handleGenerateData}
                  onUpload={handleFileUpload}
                />
              </div>
            )}
            {view === AppView.DASHBOARD && (
              <div className="h-full p-2 md:p-6 max-w-7xl mx-auto flex flex-col">
                <Dashboard
                  data={data}
                  columns={columns}
                  onAddToReport={handleAddToReport}
                  onLoadSample={handleLoadSample}
                  onConfigChange={setDashboardConfig}
                />
              </div>
            )}
            {view === AppView.PIVOT && (
              <div className="h-full p-2 md:p-6 max-w-7xl mx-auto flex flex-col">
                <React.Suspense fallback={<LoadingSpinner />}>
                  <PivotTable
                    data={data}
                    columns={columns}
                    onSuggest={handlePivotSuggest}
                    onConfigChange={setPivotConfig}
                  />
                </React.Suspense>
              </div>
            )}
            {view === AppView.REPORT && (
              <div className="h-full p-2 md:p-6 max-w-7xl mx-auto flex flex-col">
                <React.Suspense fallback={<LoadingSpinner />}>
                  <ReportEditor
                    content={reportContent}
                    stage={reportStage}
                    analysisContent={preReportAnalysis}
                    onContentChange={setReportContent}
                    onAnalyze={handleStartAnalysis}
                    onImprove={handleFixGrammar}
                    onGenerateFull={handleGenerateFullReport}
                    onExportPPT={handleExportPPT}
                    onReset={handleResetReport}
                    isThinking={isAiThinking}
                    charts={reportCharts}
                    onAddChart={handleAddToReport}
                    dashboardWidgets={dashboardConfig}
                    pivotConfig={pivotConfig}
                    data={data}
                  />
                </React.Suspense>
              </div>
            )}
            {view === AppView.HISTORY && (
              <div className="h-full p-2 md:p-6 max-w-5xl mx-auto flex flex-col">
                <HistoryView history={chatHistory} />
              </div>
            )}
            {view === AppView.PDF_CONVERTER && (
              <div className="h-full p-2 md:p-6 max-w-6xl mx-auto flex flex-col">
                <PdfToExcel onBack={() => setView(AppView.HOME)} />
              </div>
            )}
            {view === AppView.IMAGE_MAPPER && (
              <div className="h-full p-2 md:p-6 max-w-6xl mx-auto flex flex-col">
                <ImageMapper onBack={() => setView(AppView.HOME)} />
              </div>
            )}
            {view === AppView.WORKSPACE && (
              <div className="h-full p-2 md:p-6 w-full flex flex-col overflow-y-auto">
                <Workspace onOpen={handleOpenWorkspaceItem} />
              </div>
            )}
            {view === AppView.SETTINGS && (
              <div className="h-full p-2 md:p-6 w-full flex flex-col overflow-y-auto">
                <Settings />
              </div>
            )}
            {view === AppView.ACTIVITY && (
              <div className="h-full p-2 md:p-6 w-full flex flex-col overflow-y-auto">
                <ActivityView />
              </div>
            )}
          </div>

          {/* Loading Overlay */}
          {isAiThinking && !isAnalysisModalOpen && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-purple-100 flex flex-col items-center animate-in fade-in zoom-in duration-200">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-sm font-medium text-slate-600">BroExcel is thinking...</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Context Rail (Sidebar) */}
      <ContextRail
        chatHistory={chatHistory}
        onSendMessage={handleSendMessage}
        isThinking={isAiThinking}
        isOpen={isRailOpen}
        onToggle={() => setIsRailOpen(!isRailOpen)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
