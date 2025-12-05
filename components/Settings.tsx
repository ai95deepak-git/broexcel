import React, { useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { api } from '../services/api';
import { User, Lock, Mail, Phone, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [otpSent, setOtpSent] = useState(false);

    const handleSendOtp = async () => {
        setLoading(true);
        setMessage(null);
        try {
            await api.sendOtp();
            setOtpSent(true);
            setMessage({ type: 'success', text: 'Verification code sent! Check your console.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to send verification code.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(otp, newPassword);
            setMessage({ type: 'success', text: 'Password changed successfully' });
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            setOtpSent(false);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to change password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Account Settings</h1>

            {/* Profile Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <User size={20} className="text-blue-500" />
                    Profile Information
                </h2>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
                            <div className="text-slate-800 font-medium">{user?.name || 'Not set'}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">User ID</label>
                            <div className="text-slate-800 font-mono text-sm bg-slate-50 inline-block px-2 py-1 rounded">
                                {user?.id}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-4">
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                            <Shield size={16} className="mt-0.5 text-emerald-500 shrink-0" />
                            <div>
                                <p className="font-medium text-slate-700">Privacy Mode Enabled</p>
                                <p>Your sensitive details like email and phone number are hidden by default to protect your privacy.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                                <Mail size={14} /> Email (Hidden)
                            </label>
                            <div className="text-slate-800">
                                {user?.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                                <Phone size={14} /> Mobile (Hidden)
                            </label>
                            <div className="text-slate-800">
                                {user?.mobile ? user.mobile.replace(/(\d{2})(.*)(\d{2})/, "$1******$3") : 'Not set'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Lock size={20} className="text-purple-500" />
                    Security
                </h2>

                <div className="max-w-md">
                    {/* Step 1: Send OTP */}
                    {!otpSent && (
                        <div>
                            <p className="text-slate-600 mb-4 text-sm">
                                To change your password, we need to verify your identity. Click below to send a verification code to your registered email/mobile.
                            </p>
                            <button
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                            >
                                {loading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Verify OTP & Change Password */}
                    {otpSent && (
                        <form onSubmit={handleChangePassword} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code (OTP)</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1">Check your backend console for the code.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showPass"
                                    checked={showPassword}
                                    onChange={() => setShowPassword(!showPassword)}
                                    className="rounded text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="showPass" className="text-sm text-slate-600 cursor-pointer">Show Passwords</label>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {loading ? 'Updating...' : 'Change Password'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setOtpSent(false); setMessage(null); }}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
