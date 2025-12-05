import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LayoutGrid, Loader2, User, Lock, LogIn, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
    onSwitchToSignup: () => void;
    onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup, onLoginSuccess }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Show success state briefly
            setSuccess(true);
            setTimeout(() => {
                login(data.token, data.user);
                if (onLoginSuccess) onLoginSuccess();
            }, 1500); // Wait 1.5s to show welcome message

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center p-8 bg-white">
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6 animate-bounce">
                        <CheckCircle2 className="text-white w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Welcome Back!</h2>
                    <p className="text-slate-500 mt-2">Redirecting...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-md">
                <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50 animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform hover:rotate-12 transition-transform duration-300">
                            <LayoutGrid className="text-white w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 mt-2">Sign in to continue to BroExcel</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">Email or Mobile Number</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="you@example.com or +1234567890"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <span>Sign In</span>
                                    <LogIn className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-500">
                        Don't have an account?{' '}
                        <button onClick={onSwitchToSignup} className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline underline-offset-2 transition-all">
                            Sign up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
