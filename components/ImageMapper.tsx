
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Archive, ArrowRight, Download, CheckCircle2, AlertCircle, Image as ImageIcon, Loader2, BrainCircuit } from 'lucide-react';
import { DataItem, ColumnDef } from '../types';
import { parseExcelFile, processImageBatch, findBestMatchColumn, generateImageMappedExcel } from '../services/fileService';

interface ImageMapperProps {
  onBack: () => void;
}

// Helper to normalize filenames for matching (for UI lookup)
const normalize = (name: string) => name.toLowerCase().trim().replace(/\.[^/.]+$/, "");
const loose = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const ImageMapper: React.FC<ImageMapperProps> = ({ onBack }) => {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'done'>('idle');
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  
  // Store images as Blobs. We use 3 maps for tiered matching.
  const [exactMap, setExactMap] = useState<Record<string, Blob>>({});
  const [normMap, setNormMap] = useState<Record<string, Blob>>({});
  const [fuzzyMap, setFuzzyMap] = useState<Record<string, Blob>>({});
  
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  const [matchColumn, setMatchColumn] = useState<string>('');
  const [stats, setStats] = useState({ totalImages: 0, matchedRows: 0 });

  const excelInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((url) => URL.revokeObjectURL(url as string));
    };
  }, [imagePreviewUrls]);

  // Find best match blob for a given value (UI Helper)
  const findMatch = (val: string) => {
      if (!val) return undefined;
      const v = String(val).trim();
      
      if (exactMap[v]) return exactMap[v];

      const norm = normalize(v);
      if (normMap[norm]) return normMap[norm];

      const fuz = loose(v);
      if (fuz && fuzzyMap[fuz]) return fuzzyMap[fuz];

      return undefined;
  };

  // Lazy load preview URLs for visible data
  useEffect(() => {
    if (status !== 'done' || !matchColumn) return;

    const newUrls: Record<string, string> = {};
    let hasUpdates = false;

    // Only generate URLs for the first 50 rows (preview)
    data.slice(0, 50).forEach(row => {
        const val = String(row[matchColumn] || '').trim();
        if (!val) return;
        if (imagePreviewUrls[val]) return;

        const blob = findMatch(val);
        if (blob) {
            newUrls[val] = URL.createObjectURL(blob);
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        setImagePreviewUrls(prev => ({ ...prev, ...newUrls }));
    }
  }, [data, matchColumn, exactMap, normMap, fuzzyMap, status]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setExcelFile(e.target.files[0]);
  };

  const handleZipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setZipFile(e.target.files[0]);
  };

  const processFiles = async () => {
    if (!excelFile || !zipFile) return;
    setStatus('analyzing');

    try {
      // 1. Process Excel (Service)
      const { data: jsonData, columns: detectedCols } = await parseExcelFile(excelFile);
      
      setColumns(detectedCols);
      setStatus('processing');

      // 2. Process ZIP (Service)
      const { exactMap, normMap, fuzzyMap, imageCount } = await processImageBatch(zipFile);
      
      setExactMap(exactMap);
      setNormMap(normMap);
      setFuzzyMap(fuzzyMap);

      // 3. Auto-Detect Match Column (Service)
      const { bestCol, maxMatches } = findBestMatchColumn(jsonData, detectedCols, { exactMap, normMap, fuzzyMap });

      setMatchColumn(bestCol);
      setData(jsonData);
      setStats({ totalImages: imageCount, matchedRows: maxMatches });
      setStatus('done');

    } catch (error) {
      console.error("Processing Error", error);
      alert("Failed to process files. Please ensure valid Excel and ZIP format.");
      setStatus('idle');
    }
  };

  const handleDownload = async () => {
    try {
        await generateImageMappedExcel(
            data, 
            columns, 
            matchColumn, 
            { exactMap, normMap, fuzzyMap }
        );
    } catch (error) {
        console.error("Export Error", error);
        alert("Failed to export Excel file. Please try again.");
    }
  };

  if (status === 'done') {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-50">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Matching Complete</h2>
                <p className="text-xs text-slate-500">Found {stats.totalImages} images in ZIP, matched {stats.matchedRows} rows</p>
              </div>
           </div>
           <div className="flex gap-2">
             <button onClick={() => setStatus('idle')} className="px-4 py-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg text-sm font-medium transition-all">
               Start Over
             </button>
             <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm hover:shadow text-sm font-bold transition-all">
               <Download size={16} />
               Download Excel
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
           <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                 <span className="text-sm font-medium text-slate-600">Matched via Column:</span>
                 <select 
                    value={matchColumn}
                    onChange={(e) => setMatchColumn(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 outline-none"
                 >
                    {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                 </select>
                 <span className="text-xs text-slate-400 ml-auto">Previewing first 50 matches</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
                   <tr>
                     <th className="px-4 py-3 w-12 text-center">#</th>
                     {columns.map(c => <th key={c.key} className="px-6 py-3 font-semibold whitespace-nowrap">{c.label}</th>)}
                     <th className="px-6 py-3 font-semibold text-center bg-purple-50 text-purple-700 border-l border-purple-100 w-32">Matched Image</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {data.slice(0, 50).map((row, idx) => {
                     const matchVal = String(row[matchColumn] || '').trim();
                     const imgUrl = imagePreviewUrls[matchVal];
                     
                     return (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                         <td className="px-4 py-3 text-center text-slate-300 text-xs">{idx + 1}</td>
                         {columns.map(c => (
                           <td key={c.key} className="px-6 py-3 text-slate-700 whitespace-nowrap">{row[c.key]}</td>
                         ))}
                         <td className="px-2 py-2 text-center border-l border-slate-100 bg-slate-50/30">
                           {imgUrl ? (
                             <div className="w-16 h-16 mx-auto bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                <img src={imgUrl} alt="Match" className="w-full h-full object-contain rounded" />
                             </div>
                           ) : (
                             <span className="text-xs text-slate-300 italic">No match</span>
                           )}
                         </td>
                       </tr>
                     );
                   })}
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
        <div className="absolute inset-0 bg-grid-slate-50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none"></div>

        <div className="w-full max-w-2xl relative z-10">
            {status === 'processing' || status === 'analyzing' ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-xl">
                    {status === 'analyzing' ? (
                        <BrainCircuit size={48} className="text-blue-600 animate-pulse mx-auto mb-6" />
                    ) : (
                        <Loader2 size={48} className="text-purple-600 animate-spin mx-auto mb-6" />
                    )}
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {status === 'analyzing' ? 'Analyzing Structure...' : 'Processing Files...'}
                    </h3>
                    <p className="text-slate-500">
                        {status === 'analyzing' ? 'Detecting headers and data patterns.' : 'Unzipping images and scanning spreadsheet rows.'}
                    </p>
                </div>
            ) : (
                <div className="text-center">
                    <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm">
                        <Archive size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-3">Image to Excel Batch Mapper</h2>
                    <p className="text-slate-500 mb-10 text-lg leading-relaxed max-w-lg mx-auto">
                        Automatically insert images into Excel rows by matching filenames. Upload your Excel sheet and a ZIP of your images.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Excel Upload */}
                        <div 
                            onClick={() => excelInputRef.current?.click()}
                            className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer hover:bg-slate-50 ${excelFile ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto ${excelFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <h4 className="font-bold text-slate-700 mb-1">{excelFile ? 'Excel Uploaded' : '1. Upload Excel'}</h4>
                            <p className="text-xs text-slate-400 truncate px-4">{excelFile ? excelFile.name : '.xlsx or .csv containing filenames'}</p>
                            <input type="file" accept=".xlsx, .csv" className="hidden" ref={excelInputRef} onChange={handleExcelUpload} />
                        </div>

                        {/* Zip Upload */}
                        <div 
                            onClick={() => zipInputRef.current?.click()}
                            className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer hover:bg-slate-50 ${zipFile ? 'border-purple-400 bg-purple-50' : 'border-slate-200'}`}
                        >
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto ${zipFile ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Archive size={24} />
                            </div>
                            <h4 className="font-bold text-slate-700 mb-1">{zipFile ? 'ZIP Uploaded' : '2. Upload Images ZIP'}</h4>
                            <p className="text-xs text-slate-400 truncate px-4">{zipFile ? zipFile.name : 'Folder compressed as .zip'}</p>
                            <input type="file" accept=".zip" className="hidden" ref={zipInputRef} onChange={handleZipUpload} />
                        </div>
                    </div>

                    <button 
                        onClick={processFiles}
                        disabled={!excelFile || !zipFile}
                        className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 hover:shadow-lg hover:scale-[1.02] transition-all font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <ArrowRight size={22} />
                        Start Matching Process
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageMapper;
    