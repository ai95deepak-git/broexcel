import { DataItem, ColumnDef, PivotConfig, PivotSuggestion, ReportTemplate } from "../types";

const API_URL = '/api'; // Proxied by Vite

export const api = {
    async chat(prompt: string, history?: any[], systemInstruction?: string) {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, history: JSON.stringify(history), systemInstruction })
        });
        return res.json();
    },

    async generateReport(data: DataItem[], userInstructions: string) {
        const res = await fetch(`${API_URL}/analyze/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, userInstructions })
        });
        return res.json();
    },

    async suggestPivots(columns: ColumnDef[]) {
        const res = await fetch(`${API_URL}/analyze/pivot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columns })
        });
        return res.json();
    },

    async deepAnalysis(data: DataItem[], columns: ColumnDef[]) {
        const res = await fetch(`${API_URL}/analyze/deep`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, columns })
        });
        return res.json();
    },

    async suggestTemplates(data: DataItem[], columns: ColumnDef[]) {
        const res = await fetch(`${API_URL}/analyze/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, columns })
        });
        return res.json();
    },

    async preReportAnalysis(data: DataItem[], columns: ColumnDef[]) {
        const res = await fetch(`${API_URL}/analyze/pre-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, columns })
        });
        return res.json();
    },

    async saveData(name: string, data: DataItem[], columns: ColumnDef[]) {
        const res = await fetch(`${API_URL}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, data, columns })
        });
        return res.json();
    },

    async loadData() {
        const res = await fetch(`${API_URL}/data`);
        return res.json();
    },

    async uploadFile(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    }
};
