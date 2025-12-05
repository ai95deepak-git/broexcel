import React, { useState } from 'react';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { X } from 'lucide-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="max-h-[90vh] overflow-y-auto">
                    {isLogin ? (
                        <LoginPage onSwitchToSignup={() => setIsLogin(false)} />
                    ) : (
                        <SignupPage onSwitchToLogin={() => setIsLogin(true)} />
                    )}
                </div>
            </div>
        </div>
    );
};
