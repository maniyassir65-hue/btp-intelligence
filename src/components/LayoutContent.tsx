'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, role } = useAuth();
  
  const isLoginPage = pathname === '/login';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf9] gap-4">
        <Loader2 className="w-10 h-10 text-[#c97423] animate-spin" />
        <p className="text-stone-400 font-black text-[10px] uppercase tracking-widest animate-pulse">
            Vérification de la session...
        </p>
      </div>
    );
  }
  // Si on est sur une page publique, on n'affiche pas la sidebar
  const isPublicPage = pathname === '/login' || pathname === '/signup';
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Interception globale pour les utilisateurs en attente de validation (rôle = guest ou null)
  if (!role || role === 'guest') {
    return (
      <div className="flex min-h-screen bg-[#fafaf9]">
        <Sidebar />
        <main className="flex-1 lg:ml-[280px] flex items-center justify-center p-4 lg:p-8 pt-20 lg:pt-8 transition-all duration-300">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-stone-100"
          >
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-amber-100/50">
              <Clock size={40} />
            </div>
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight mb-4 leading-tight">Accès en Attente</h2>
            <p className="text-stone-500 text-sm font-medium leading-relaxed mb-8">
              Votre compte a été créé avec succès, mais un administrateur doit encore <strong>valider vos accès</strong> pour que vous puissiez voir les données.
            </p>
            <div className="pt-4 border-t border-stone-50">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Contactez votre responsable</p>
              <p className="text-[11px] font-bold text-[#c97423]">maniyassir65@gmail.com</p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Pour toutes les autres pages, on affiche la sidebar si l'utilisateur est connecté
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-[280px] p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
