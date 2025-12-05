import React, { useRef } from 'react';
import { FileSpreadsheet, LayoutDashboard, FileText, Upload, Plus, ArrowRight, Database, TrendingUp, ShieldCheck, FileType, Image as ImageIcon } from 'lucide-react';
import { AppView } from '../types';

interface HomeProps {
  onNavigate: (view: AppView) => void;
  onUpload: (file: File) => void;
  onLoadSample: () => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate, onUpload, onLoadSample }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const ActionCard = ({ icon: Icon, title, desc, onClick, colorClass, gradient }: any) => (
    <button 
      onClick={onClick}
      className="flex flex-col items-start p-6 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left group w-full relative overflow-hidden h-full min-h-[220px]"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150`}></div>
      
      <div className={`p-3 rounded-xl ${colorClass} text-white mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">{desc}</p>
      
      <div className="mt-auto flex items-center text-xs font-semibold text-blue-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        Start Now <ArrowRight size={12} className="ml-1" />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50/50">
      <div className="w-full max-w-7xl mx-auto p-6 md:p-12">
        
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center mb-12 md:mb-20">
            <div className="text-center lg:text-left order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
                    <SparklesIcon />
                    AI-Powered Analytics
                </div>
                <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
                    Visualize your data <br className="hidden lg:block"/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">in seconds.</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-xl leading-relaxed mx-auto lg:mx-0 mb-8">
                    BroExcel turns your static spreadsheets into interactive charts, pivot tables, and professional executive reports automatically using Gemini AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2 shadow-blue-200 shadow-md"
                     >
                         <Upload size={20} />
                         Upload Excel File
                     </button>
                     <button 
                        onClick={onLoadSample}
                        className="px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold flex items-center justify-center gap-2"
                     >
                         <Database size={20} />
                         Use Sample Data
                     </button>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14}/> Secure Parsing</span>
                    <span className="flex items-center gap-1.5"><TrendingUp size={14}/> Instant Insights</span>
                </div>
            </div>

            <div className="relative group order-1 lg:order-2">
                 <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                 <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/5 bg-white">
                      <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop" 
                        alt="Data Analytics Dashboard" 
                        className="w-full h-auto object-cover transform transition-transform duration-700 hover:scale-105"
                      />
                 </div>
            </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          
          {/* Upload Excel */}
          <div className="relative h-full">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <ActionCard 
              icon={Upload}
              title="Upload Excel File"
              desc="Import .xlsx or .csv files. We'll automatically map your columns and clean the data."
              colorClass="bg-emerald-500"
              gradient="from-emerald-400 to-green-600"
              onClick={() => fileInputRef.current?.click()}
            />
          </div>

          <ActionCard 
            icon={FileType}
            title="PDF to Excel"
            desc="Convert PDF invoices or tables into editable Excel spreadsheets using AI."
            colorClass="bg-red-500"
            gradient="from-red-400 to-pink-600"
            onClick={() => onNavigate(AppView.PDF_CONVERTER)}
          />

          <ActionCard 
            icon={ImageIcon}
            title="Image Batch Mapper"
            desc="Auto-insert images into Excel rows by matching filenames from a ZIP file."
            colorClass="bg-orange-500"
            gradient="from-orange-400 to-yellow-500"
            onClick={() => onNavigate(AppView.IMAGE_MAPPER)}
          />

          <ActionCard 
            icon={Plus}
            title="Start from Scratch"
            desc="Create a blank spreadsheet and ask AI to generate realistic dummy data for you."
            colorClass="bg-purple-500"
            gradient="from-purple-400 to-pink-600"
            onClick={() => onNavigate(AppView.SPREADSHEET)}
          />
        </div>

        {/* Features / Navigation */}
        <div className="border-t border-slate-200 pt-10">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Explore the Suite</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
                onClick={() => onNavigate(AppView.SPREADSHEET)}
                className="group p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3"
            >
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileSpreadsheet size={20} />
                </div>
                <div className="text-left">
                    <div className="font-semibold text-slate-700 group-hover:text-blue-700">Data Grid</div>
                    <div className="text-xs text-slate-400">Edit & Clean</div>
                </div>
            </button>
            <button 
                onClick={() => onNavigate(AppView.DASHBOARD)}
                className="group p-4 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-3"
            >
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                    <LayoutDashboard size={20} />
                </div>
                <div className="text-left">
                    <div className="font-semibold text-slate-700 group-hover:text-purple-700">Dashboard</div>
                    <div className="text-xs text-slate-400">Chart & Analyze</div>
                </div>
            </button>
            <button 
                onClick={() => onNavigate(AppView.REPORT)}
                className="group p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3"
            >
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <FileText size={20} />
                </div>
                <div className="text-left">
                    <div className="font-semibold text-slate-700 group-hover:text-indigo-700">Reporter</div>
                    <div className="text-xs text-slate-400">Write & Export</div>
                </div>
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
        <path d="M12 2L14.4 7.2L20 9.6L14.4 12L12 17.2L9.6 12L4 9.6L9.6 7.2L12 2Z" />
    </svg>
);

export default Home;