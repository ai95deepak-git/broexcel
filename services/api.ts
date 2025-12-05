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
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, data, columns })
        });
        if (!res.ok) throw new Error('Failed to save data');
        return res.json();
    },

    async loadData() {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/data`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return res.json();
    },

    async renameData(id: number, name: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/data/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to rename data');
        return response.json();
    },

    async deleteData(id: number) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/data/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to delete data');
        return response.json();
    },

    async sendOtp() {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to send OTP');
        return response.json();
    },

    async verifyOtp(code: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });
        if (!response.ok) throw new Error('Failed to verify OTP');
        return response.json();
    },

    async changePassword(otp: string, newPassword: string) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ otp, newPassword })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to change password');
        }
        return response.json();
    },

    async forgotPassword(email: string) {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error('Failed to send OTP');
        return response.json();
    },

    async resetPassword(email: string, otp: string, newPassword: string) {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to reset password');
        }
        return response.json();
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
