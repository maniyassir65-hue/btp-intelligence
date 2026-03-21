'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Mail, Lock, Loader2, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });

            if (signUpError) throw signUpError;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'inscription");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white rounded-[2.5rem] p-10 text-center shadow-xl border border-stone-100"
                >
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight mb-2">Compte créé !</h2>
                    <p className="text-stone-500 text-sm font-medium mb-8 leading-relaxed">
                        Votre demande d'accès a été enregistrée. <strong>Vérifiez vos emails</strong> pour confirmer votre adresse, puis contactez l'administrateur pour activer votre accès.
                    </p>
                    <Link href="/login" className="inline-block w-full py-4 bg-[#18181b] text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-[#c97423] transition-all shadow-lg hover:shadow-[#c97423]/20">
                        Retour à la connexion
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden"
            >
                <div className="bg-[#18181b] p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute inset-0 bg-[radial-gradient(#c97423_1px,transparent_1px)] [background-size:20px_20px]" />
                    </div>
                    
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c97423] rounded-2xl mb-6 relative z-10 shadow-lg shadow-amber-900/20">
                        <Building2 className="text-white w-8 h-8" />
                    </div>
                    
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight relative z-10">
                        Rejoindre l'équipe
                    </h1>
                    <p className="text-stone-400 text-sm mt-2 font-medium relative z-10">
                        BTP Intelligence • Inscription
                    </p>
                </div>

                <form onSubmit={handleSignup} className="p-10 space-y-5">
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black rounded-xl text-center uppercase tracking-wider leading-relaxed"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Nom Complet</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#c97423] transition-colors">
                                    <UserIcon size={18} />
                                </div>
                                <input 
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Jean Dupont"
                                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-[#c97423] focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Email professionnel</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#c97423] transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nom@entreprise.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-[#c97423] focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Mot de passe</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[#c97423] transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-[#c97423] focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#18181b] hover:bg-[#c97423] text-white font-black py-4 rounded-2xl shadow-lg shadow-stone-200 hover:shadow-[#c97423]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-xs mt-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
                    </button>

                    <div className="text-center pt-2">
                        <Link href="/login" className="flex items-center justify-center gap-2 text-stone-400 hover:text-[#c97423] transition-colors text-[10px] font-black uppercase tracking-widest">
                            <ArrowLeft size={14} /> Déjà un compte ? Se connecter
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
