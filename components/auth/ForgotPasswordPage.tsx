import React, { useState } from 'react';
import { api } from '../../services/api';
import { Mail, Lock, Key, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ForgotPasswordPageProps {
    onBack: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack }) => {
    const [step, setStep] = useState<'email' | 'verify'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.forgotPassword(email);
            setStep('verify');
            setSuccess('Verification code sent! Check your backend console.');
        } catch (err: any) {
            setError('Failed to send code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.resetPassword(email, otp, newPassword);
            setSuccess('Password reset successfully! You can now login.');
            setTimeout(onBack, 2000); // Redirect to login after 2s
        } catch (err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                <ArrowLeft size={16} /> Back to Login
            </button>

            <div className="text-center mb-8">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                    <Key size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                <p className="text-slate-500 mt-2 text-sm">
                    {step === 'email' ? "Enter your email to receive a verification code." : "Enter the code and your new password."}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            {step === 'email' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Code'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Enter 6-digit code"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
};
