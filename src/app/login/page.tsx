'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, Building2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

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
                        BTP Intelligence
                    </h1>
                    <p className="text-stone-400 text-sm mt-2 font-medium relative z-10">
                        Gestion de Chantiers Professionnelle
                    </p>
                </div>

                <form onSubmit={handleLogin} className="p-10 space-y-6">
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center uppercase tracking-wider"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-4">
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
                        className="w-full bg-[#18181b] hover:bg-[#c97423] text-white font-black py-4 rounded-2xl shadow-lg shadow-stone-200 hover:shadow-[#c97423]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se Connecter'}
                    </button>

                    <div className="text-center">
                        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                            Plateforme Sécurisée • Accès Restreint
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
