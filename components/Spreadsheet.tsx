
import React, { useState, useRef, useMemo } from 'react';
import { DataItem, ColumnDef } from '../types';
import { Plus, Trash2, Wand2, Upload, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';

interface SpreadsheetProps {
  data: DataItem[];
  columns: ColumnDef[];
  onUpdate: (newData: DataItem[]) => void;
  onGenerateData: (query: string) => void;
  onUpload: (file: File) => void;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ data, columns, onUpdate, onGenerateData, onUpload }) => {
  const [prompt, setPrompt] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination Logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  const handleCellChange = (rowIndex: number, key: string, value: string | number) => {
    // Calculate actual index in the full data array
    const actualIndex = (currentPage - 1) * rowsPerPage + rowIndex;
    const newData = [...data];
    newData[actualIndex] = { ...newData[actualIndex], [key]: value };
    onUpdate(newData);
  };

  const addRow = () => {
    const newRow: DataItem = {};
    columns.forEach(col => {
        newRow[col.key] = col.type === 'number' ? 0 : '';
    });
    newRow.id = Math.random().toString(36).substr(2, 9);
    onUpdate([...data, newRow]);
    // Go to last page to see new row
    setCurrentPage(Math.ceil((data.length + 1) / rowsPerPage));
  };

  const removeRow = (rowIndex: number) => {
    const actualIndex = (currentPage - 1) * rowsPerPage + rowIndex;
    const newData = [...data];
    newData.splice(actualIndex, 1);
    onUpdate(newData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      setCurrentPage(1); // Reset to first page on new upload
    }
  };

  const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-100">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 self-start md:self-auto">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                <FileSpreadsheet size={18}/>
            </div>
            Data Editor 
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{data.length} rows</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
                <Upload size={14} />
                <span>Import Excel</span>
            </button>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 w-full sm:w-auto focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all">
                <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='AI: "Add 5 rows..."'
                    className="px-3 py-1 bg-transparent text-sm w-full sm:w-56 focus:outline-none placeholder-slate-400"
                />
                <button 
                    onClick={() => onGenerateData(prompt)}
                    className="p-1.5 bg-white text-purple-600 rounded-md shadow-sm border border-slate-100 hover:text-purple-700 hover:shadow-md transition-all shrink-0"
                    title="Generate with AI"
                >
                    <Wand2 size={14} />
                </button>
            </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="flex-1 overflow-auto bg-slate-50/30 relative">
        {data.length === 0 && columns.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <FileSpreadsheet size={48} className="mb-4 opacity-20" />
                <p>No data loaded.</p>
                <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-blue-600 font-medium hover:underline">Upload an Excel file</button>
            </div>
        ) : (
            <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm ring-1 ring-slate-100">
                <tr>
                <th className="px-4 py-4 w-10 text-center bg-slate-50 border-b border-slate-200">#</th>
                {columns.map((col) => (
                    <th key={col.key} className="px-6 py-4 font-semibold tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap min-w-[150px]">
                        <div className="flex items-center gap-1">
                            {col.label}
                            <span className="text-[10px] text-slate-400 font-normal lowercase bg-slate-100 px-1 rounded">{col.type}</span>
                        </div>
                    </th>
                ))}
                <th className="px-4 py-4 text-center bg-slate-50 border-b border-slate-200 w-16"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
                {currentData.map((row, index) => {
                    const rowIndex = index; // Relative index for display
                    const globalIndex = (currentPage - 1) * rowsPerPage + rowIndex;
                    
                    return (
                        <tr key={row.id || globalIndex} className="hover:bg-blue-50/50 group transition-colors duration-150">
                            <td className="px-4 py-2.5 text-center text-slate-300 text-xs">{globalIndex + 1}</td>
                            {columns.map((col) => (
                                <td key={col.key} className="px-6 py-2.5 min-w-[150px]">
                                    {col.type === 'number' ? (
                                        <input
                                            type="number"
                                            value={row[col.key] || 0}
                                            onChange={(e) => handleCellChange(rowIndex, col.key, parseFloat(e.target.value) || 0)}
                                            className="w-full text-right bg-transparent focus:outline-none border-b border-transparent focus:border-blue-400 px-1 py-0.5 font-mono text-slate-600"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={row[col.key] || ''}
                                            onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                                            className="w-full bg-transparent focus:outline-none border-b border-transparent focus:border-blue-400 px-1 py-0.5 text-slate-700"
                                        />
                                    )}
                                </td>
                            ))}
                            <td className="px-4 py-2.5 text-center">
                            <button
                                onClick={() => removeRow(rowIndex)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md hover:bg-red-50"
                                title="Delete Row"
                            >
                                <Trash2 size={14} />
                            </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
            </table>
        )}
      </div>

      {/* Footer / Pagination */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-slate-600 font-medium text-xs hover:text-blue-600 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-200"
        >
          <Plus size={14} />
          Add Row
        </button>
        
        {data.length > 0 && (
            <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} className="text-slate-600" />
                    </button>
                    <button 
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Spreadsheet;
