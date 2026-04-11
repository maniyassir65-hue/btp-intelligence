'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Loader2, Check, X, ShieldAlert, ShieldCheck, Clock, Lock } from 'lucide-react';
import { updateProfileRoleAction, getProfilesAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

export default function UsersClient({ initialProfiles = [] }: { initialProfiles?: any[] }) {
    const { role, user, loading: authLoading } = useAuth();
    const [profiles, setProfiles] = useState(initialProfiles);
    const [fetching, setFetching] = useState(initialProfiles.length === 0);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchProfiles = async () => {
            if (role === 'admin') {
                try {
                    setFetching(true);
                    const data = await getProfilesAction();
                    setProfiles(data);
                } catch (error) {
                    console.error('Erreur chargement profils:', error);
                } finally {
                    setFetching(false);
                }
            }
        };

        if (!authLoading && role === 'admin' && initialProfiles.length === 0) {
            fetchProfiles();
        }
    }, [role, authLoading, initialProfiles.length]);

    const handleUpdateRole = async (userId: string, newRole: string) => {
        setLoadingId(userId);
        try {
            await updateProfileRoleAction(userId, newRole);
            setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
            router.refresh();
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoadingId(null);
        }
    };

    if (authLoading || (fetching && role === 'admin')) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 size={40} className="animate-spin text-[#c97423]" />
                <p className="text-stone-400 text-sm font-bold uppercase tracking-widest">Chargement des accès...</p>
            </div>
        );
    }

    if (role !== 'admin') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-8">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-stone-100"
                >
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-red-100/50">
                        <Lock size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight mb-4 leading-tight">Accès Refusé</h2>
                    <p className="text-stone-500 text-sm font-medium leading-relaxed mb-8">
                        Cette section est réservée aux <strong>administrateurs</strong>. Si vous pensez qu'il s'agit d'une erreur, contactez votre responsable.
                    </p>
                </motion.div>
            </div>
        );
    }

    // Le reste du composant (div max-w-6xl...) reste identique
    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#c97423] text-white rounded-2xl shadow-lg shadow-amber-900/10">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-stone-900 uppercase tracking-tight">Accès & Utilisateurs</h1>
                        <p className="text-stone-400 text-sm font-bold uppercase tracking-widest">Gérer les permissions de l'équipe</p>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-xl shadow-stone-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-stone-50/50 border-b border-stone-100">
                                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Utilisateur</th>
                                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Date d'Inscription</th>
                                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Rôle Actuel</th>
                                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] text-right">Modifier l'Accès</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {profiles.map((p) => (
                                <motion.tr 
                                    layout
                                    key={p.id}
                                    className="hover:bg-stone-50/40 transition-colors group"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors border border-stone-200/50">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-stone-900 truncate max-w-[200px]">{p.full_name || 'Sans Nom'}</p>
                                                <p className="text-[11px] font-bold text-stone-400 truncate max-w-[200px]">{p.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-stone-500 uppercase tracking-wider">
                                        {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-5">
                                        {getRoleBadge(p.role)}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-end gap-2">
                                            {loadingId === p.id ? (
                                                <Loader2 size={20} className="animate-spin text-stone-300 mr-4" />
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateRole(p.id, 'chef')}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            p.role === 'chef' 
                                                                ? "bg-emerald-600 text-white shadow-md cursor-default pointer-events-none" 
                                                                : "bg-stone-100 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700"
                                                        )}
                                                    >
                                                        Chef
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateRole(p.id, 'admin')}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            p.role === 'admin' 
                                                                ? "bg-amber-600 text-white shadow-md cursor-default pointer-events-none" 
                                                                : "bg-stone-100 text-stone-400 hover:bg-amber-50 hover:text-amber-700"
                                                        )}
                                                    >
                                                        Admin
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateRole(p.id, 'guest')}
                                                        className={cn(
                                                            "p-2 rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all ml-2",
                                                            p.role === 'guest' && "hidden"
                                                        )}
                                                        title="Révoquer l'accès"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
