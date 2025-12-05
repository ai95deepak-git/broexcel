import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { X } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="max-h-[90vh] overflow-y-auto">
                    <div className="max-h-[90vh] overflow-y-auto">
                        {view === 'login' && (
                            <LoginPage
                                onSwitchToSignup={() => setView('signup')}
                                onForgotPassword={() => setView('forgot')}
                            />
                        )}
                        {view === 'signup' && (
                            <SignupPage onSwitchToLogin={() => setView('login')} />
                        )}
                        {view === 'forgot' && (
                            <ForgotPasswordPage onBack={() => setView('login')} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
