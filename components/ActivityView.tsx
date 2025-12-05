import React from 'react';
import { Activity, Clock, FileText, Upload, Save, Trash2, Edit2 } from 'lucide-react';

const ActivityView: React.FC = () => {
    // Mock activity data for now - in a real app this would come from the backend
    const activities = [
        { id: 1, type: 'login', text: 'Logged in successfully', time: 'Just now', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
        { id: 2, type: 'save', text: 'Saved dataset "Q3 Financials"', time: '2 hours ago', icon: Save, color: 'text-blue-500', bg: 'bg-blue-50' },
        { id: 3, type: 'upload', text: 'Uploaded "sales_data.xlsx"', time: '5 hours ago', icon: Upload, color: 'text-purple-500', bg: 'bg-purple-50' },
        { id: 4, type: 'delete', text: 'Deleted "Old Report Draft"', time: 'Yesterday', icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
                    <p className="text-slate-500">Track your recent actions and changes</p>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                    <Clock size={20} />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {activities.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                                <item.icon size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{item.text}</p>
                                <p className="text-xs text-slate-400">{item.time}</p>
                            </div>
                        </div>
                    ))}

                    {activities.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No recent activity found.
                        </div>
                    )}
                </div>
                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All History</button>
                </div>
            </div>
        </div>
    );
};

export default ActivityView;
