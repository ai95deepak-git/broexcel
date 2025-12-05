import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileText, Download, Trash2, Edit2, FolderOpen, Search, Loader2 } from 'lucide-react';
import { DataItem, ColumnDef } from '../types';

interface WorkspaceProps {
    onOpen: (data: DataItem[], columns: ColumnDef[]) => void;
}

interface SavedDataset {
    id: number;
    name: string;
    created_at: string;
    data: DataItem[];
    columns: ColumnDef[];
}

const Workspace: React.FC<WorkspaceProps> = ({ onOpen }) => {
    const [datasets, setDatasets] = useState<SavedDataset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            setLoading(true);
            const data = await api.loadData();
            if (Array.isArray(data)) {
                setDatasets(data);
            }
        } catch (err) {
            setError('Failed to load saved items.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await api.deleteData(id);
            setDatasets(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            alert('Failed to delete item');
        }
    };

    const handleRename = async (id: number) => {
        if (!editName.trim()) return;
        try {
            await api.renameData(id, editName);
            setDatasets(prev => prev.map(d => d.id === id ? { ...d, name: editName } : d));
            setEditingId(null);
        } catch (err) {
            alert('Failed to rename item');
        }
    };

    const startEditing = (dataset: SavedDataset) => {
        setEditingId(dataset.id);
        setEditName(dataset.name);
    };

    const handleDownload = (dataset: SavedDataset) => {
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
            JSON.stringify(dataset.data)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `${dataset.name}.json`;
        link.click();
    };

    const filteredDatasets = datasets.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Workspace</h1>
                    <p className="text-slate-500">Manage your saved files and reports</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : error ? (
                <div className="text-red-500 text-center py-8">{error}</div>
            ) : filteredDatasets.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <FolderOpen className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 text-lg">No saved items found</p>
                    <p className="text-slate-400 text-sm">Save your work from the dashboard to see it here.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredDatasets.map(dataset => (
                        <div key={dataset.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow flex items-center justify-between group">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1">
                                    {editingId === dataset.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                            />
                                            <button onClick={() => handleRename(dataset.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save</button>
                                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 px-2 py-1">Cancel</button>
                                        </div>
                                    ) : (
                                        <h3 className="font-medium text-slate-800">{dataset.name}</h3>
                                    )}
                                    <p className="text-xs text-slate-400">
                                        {new Date(dataset.created_at).toLocaleDateString()} • {dataset.data.length} rows
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onOpen(dataset.data, dataset.columns)}
                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Open"
                                >
                                    <FolderOpen size={18} />
                                </button>
                                <button
                                    onClick={() => handleDownload(dataset)}
                                    className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Download JSON"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={() => startEditing(dataset)}
                                    className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Rename"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(dataset.id)}
                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Workspace;
