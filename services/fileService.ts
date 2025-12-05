
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
// @ts-ignore
import ExcelJS from 'exceljs';
import { DataItem, ColumnDef } from '../types';
import { detectHeaderRow } from './geminiService';

// --- Helper Functions ---
const normalize = (name: string) => name.toLowerCase().trim().replace(/\.[^/.]+$/, "");
const loose = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
  });
};

// --- Service Methods ---

export const parseExcelFile = async (file: File): Promise<{ data: DataItem[], columns: ColumnDef[] }> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Get raw data to check structure
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (!rawData || rawData.length === 0) throw new Error("Excel file is empty");

    // AI Detection for Header
    const sample = rawData.slice(0, 10);
    const { hasHeader, headerRowIndex } = await detectHeaderRow(sample);
    
    let jsonData: DataItem[] = [];
    let detectedCols: ColumnDef[] = [];

    if (hasHeader) {
        // Standard parsing using the identified header row
        jsonData = XLSX.utils.sheet_to_json<DataItem>(worksheet, { range: headerRowIndex });
        if (jsonData.length > 0) {
            detectedCols = Object.keys(jsonData[0]).map(key => ({
                key,
                label: key,
                type: 'string' as const
            }));
        }
    } else {
        // No header - treat first row as data
        jsonData = XLSX.utils.sheet_to_json<DataItem>(worksheet, { header: "A" });
        if (jsonData.length > 0) {
            detectedCols = Object.keys(jsonData[0]).map(key => ({
                key,
                label: `Column ${key}`, 
                type: 'string' as const
            }));
        }
    }

    // Refine Column Types
    const finalCols = detectedCols.map(col => {
        // Check first few rows to guess type
        const isNum = jsonData.slice(0, 50).every(row => {
            const val = row[col.key];
            return val === undefined || val === null || val === '' || typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
        });
        return { ...col, type: isNum ? 'number' : 'string' };
    });

    // Clean Data Types
    const cleanData = jsonData.map((row) => {
        const newRow: DataItem = { ...row };
        finalCols.filter(c => c.type === 'number').forEach(col => {
            if (typeof newRow[col.key] === 'string') {
                newRow[col.key] = parseFloat((newRow[col.key] as string).replace(/[^0-9.-]/g, '')) || 0;
            }
        });
        if (!newRow.id) newRow.id = Math.random().toString(36).substr(2, 9);
        return newRow;
    });

    return { data: cleanData, columns: finalCols as ColumnDef[] };
};

export const processImageBatch = async (
    zipFile: File
): Promise<{ 
    exactMap: Record<string, Blob>, 
    normMap: Record<string, Blob>, 
    fuzzyMap: Record<string, Blob>,
    imageCount: number 
}> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);
    
    const eMap: Record<string, Blob> = {};
    const nMap: Record<string, Blob> = {};
    const fMap: Record<string, Blob> = {};
    let imageCount = 0;

    const filePromises: Promise<void>[] = [];

    zipContent.forEach((relativePath, zipEntry) => {
        // Filter out folders and system files
        if (zipEntry.dir) return;
        if (relativePath.includes('__MACOSX')) return;
        if (relativePath.split('/').pop()?.startsWith('.')) return;

        const filename = relativePath.split('/').pop();
        if (!filename) return;

        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const promise = zipEntry.async('blob').then(blob => {
                // Key 1: Exact Name
                eMap[filename] = blob;
                
                // Key 2: Normalized Name (lower, trimmed, no ext)
                const normName = normalize(filename);
                nMap[normName] = blob;

                // Key 3: Fuzzy Name (alphanumeric only of normalized)
                const fuzzyName = loose(normName);
                if (fuzzyName) fMap[fuzzyName] = blob;
                
                imageCount++;
            });
            filePromises.push(promise);
        }
    });

    await Promise.all(filePromises);
    return { exactMap: eMap, normMap: nMap, fuzzyMap: fMap, imageCount };
};

export const findBestMatchColumn = (
    data: DataItem[], 
    columns: ColumnDef[], 
    maps: { exactMap: Record<string, Blob>, normMap: Record<string, Blob>, fuzzyMap: Record<string, Blob> }
): { bestCol: string, maxMatches: number } => {
    let bestCol = columns[0]?.key || '';
    let maxMatches = 0;

    const { exactMap, normMap, fuzzyMap } = maps;

    columns.forEach(col => {
        let matches = 0;
        data.forEach(row => {
            const val = String(row[col.key] || '').trim();
            if (!val) return;
            
            const v = val;
            const n = normalize(val);
            const f = loose(val);
            
            if (exactMap[v] || normMap[n] || (f && fuzzyMap[f])) {
                matches++;
            }
        });
        
        if (matches > maxMatches) {
            maxMatches = matches;
            bestCol = col.key;
        }
    });

    return { bestCol, maxMatches };
};

export const generateImageMappedExcel = async (
    data: DataItem[],
    columns: ColumnDef[],
    matchColumn: string,
    maps: { exactMap: Record<string, Blob>, normMap: Record<string, Blob>, fuzzyMap: Record<string, Blob> },
    filename: string = 'Matched_Images'
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Matched Images');

    // Setup Columns
    const excelCols = [
        { header: '#', key: 'index', width: 5 },
        ...columns.map(c => ({ header: c.label, key: c.key, width: 25 })),
        { header: 'Image Preview', key: 'image_preview', width: 15 }
    ];
    worksheet.columns = excelCols;

    // Style Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
    };

    const { exactMap, normMap, fuzzyMap } = maps;

    // Add Data Rows and Embed Images
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowIndex = i + 2; 
        
        const rowValues: any = { index: i + 1, ...row };
        const addedRow = worksheet.addRow(rowValues);
        
        const val = String(row[matchColumn] || '').trim();
        
        // Find Match Logic duplicated here for generation
        let blob = exactMap[val];
        if(!blob) blob = normMap[normalize(val)];
        if(!blob) {
            const f = loose(val);
            if(f) blob = fuzzyMap[f];
        }

        if (blob) {
            const base64Full = await blobToBase64(blob);
            const base64Data = base64Full.split(',')[1];
            const ext = blob.type.split('/')[1] || 'png';

            const imageId = workbook.addImage({
                base64: base64Data,
                extension: ext as any,
            });

            const imageColIndex = excelCols.length - 1;

            worksheet.addImage(imageId, {
                tl: { col: imageColIndex, row: rowIndex - 1 },
                ext: { width: 80, height: 80 },
                editAs: 'oneCell'
            });

            addedRow.height = 60; 
            const cell = addedRow.getCell(imageColIndex + 1);
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
            addedRow.height = 20;
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
    