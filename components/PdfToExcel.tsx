
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, FileSpreadsheet, Download, RefreshCw, ArrowRight, Loader2, ScanLine, Table, Wand2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DataItem, ColumnDef } from '../types';
import { extractDataFromPdf } from '../services/geminiService';

interface PdfToExcelProps {
  onBack: () => void;
}

const PdfToExcel: React.FC<PdfToExcelProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'enhancing' | 'extracting' | 'formatting' | 'done'>('idle');
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
          alert('Please upload a PDF file.');
          return;
      }
      setFile(selectedFile);
      startConversion(selectedFile);
    }
  };

  const startConversion = async (pdfFile: File) => {
    setStatus('scanning');
    
    try {
        // Visual steps for UX
        await new Promise(r => setTimeout(r, 800));
        setStatus('enhancing');
        
        await new Promise(r => setTimeout(r, 1000));
        setStatus('extracting');
        
        // Real API Call
        const extractedData = await extractDataFromPdf(pdfFile);
        
        setStatus('formatting');
        await new Promise(r => setTimeout(r, 500));

        if (extractedData && extractedData.length > 0) {
            // Dynamically determine columns from the first row of extracted data
            const cols = Object.keys(extractedData[0]).map(key => ({
                key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                type: typeof extractedData[0][key] === 'number' ? 'number' : 'string' as 'number' | 'string'
            }));

            setColumns(cols);
            setData(extractedData);
            setStatus('done');
        } else {
            alert("No tabular data could be extracted from this PDF.");
            reset();
        }

    } catch (error) {
        console.error("Conversion failed", error);
        alert("Failed to convert PDF. Please try again.");
        reset();
    }
  };

  const handleDownload = () => {
    // Simple export for PDF conversion
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Converted Data");
    XLSX.writeFile(wb, `${file?.name.replace('.pdf', '')}_converted.xlsx`);
  };

  const reset = () => {
      setFile(null);
      setData([]);
      setColumns([]);
      setStatus('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const Step = ({ currentStatus, stepStatus, label, icon: Icon }: any) => {
     // Order: scanning -> enhancing -> extracting -> formatting -> done
     const order = ['idle', 'scanning', 'enhancing', 'extracting', 'formatting', 'done'];
     const currentIndex = order.indexOf(currentStatus);
     const stepIndex = order.indexOf(stepStatus);
     
     const isComplete = currentIndex > stepIndex;
     const isActive = currentIndex === stepIndex;

     return (
         <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : isComplete ? 'bg-green-50 border-green-200 opacity-50' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
             <div className={`p-2 rounded-full ${isActive ? 'bg-blue-100 text-blue-600' : isComplete ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                 {isComplete ? <CheckCircle2 size={16} /> : <Icon size={16} className={isActive ? 'animate-pulse' : ''} />}
             </div>
             <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-slate-500'}`}>
                 {label}
             </span>
         </div>
     );
  };

  if (status === 'done') {
      return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-50">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <FileSpreadsheet size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Conversion Complete</h2>
                        <p className="text-xs text-slate-500">Extracted {data.length} rows from {file?.name}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={reset} className="px-4 py-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all">
                        Convert Another
                    </button>
                    <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm hover:shadow text-sm font-bold transition-all">
                        <Download size={16} />
                        Download Excel
                    </button>
                </div>
            </div>

            {/* Preview Grid */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center bg-slate-50">#</th>
                                    {columns.map(col => (
                                        <th key={col.key} className="px-6 py-3 font-semibold bg-slate-50 whitespace-nowrap">{col.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-center text-slate-300 text-xs">{idx + 1}</td>
                                        {columns.map(col => (
                                            <td key={col.key} className="px-6 py-3 text-slate-700 whitespace-nowrap">
                                                {col.type === 'number' && typeof row[col.key] === 'number' 
                                                    ? row[col.key].toLocaleString() 
                                                    : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 items-center justify-center p-8 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-50 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
            {status === 'idle' ? (
                <div className="text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm transform rotate-3">
                        <FileText size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">PDF to Excel Converter</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Upload any PDF invoice, table, or report. AI will automatically scan, structure, and convert it into an editable Excel spreadsheet.
                    </p>
                    
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 hover:shadow-lg hover:scale-[1.02] transition-all font-bold text-lg flex items-center justify-center gap-3"
                    >
                        <Upload size={22} />
                        Upload PDF Document
                    </button>
                    <p className="mt-4 text-xs text-slate-400">Supported formats: .pdf (Text & Tables)</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg">
                     <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        {status === 'scanning' && <ScanLine className="animate-pulse text-blue-500"/>}
                        {status === 'enhancing' && <Wand2 className="animate-spin text-purple-500"/>}
                        {status === 'extracting' && <RefreshCw className="animate-spin text-indigo-500"/>}
                        {status === 'formatting' && <Table className="text-green-500"/>}
                        Processing Document...
                     </h3>
                     
                     <div className="space-y-3">
                         <Step currentStatus={status} stepStatus="scanning" label="Scanning PDF Layout" icon={ScanLine} />
                         <Step currentStatus={status} stepStatus="enhancing" label="AI Clarity Enhancement" icon={Wand2} />
                         <Step currentStatus={status} stepStatus="extracting" label="OCR & Text Extraction" icon={FileText} />
                         <Step currentStatus={status} stepStatus="formatting" label="Structuring Tables" icon={Table} />
                     </div>

                     <div className="mt-6 h-2 bg-slate-100 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-linear rounded-full"
                            style={{ 
                                width: status === 'scanning' ? '20%' : status === 'enhancing' ? '45%' : status === 'extracting' ? '75%' : '95%' 
                            }}
                         ></div>
                     </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PdfToExcel;
    