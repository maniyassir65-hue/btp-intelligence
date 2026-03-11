'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { Loader2 } from 'lucide-react';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
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

  // Si on est sur la page de login, on n'affiche pas la sidebar
  if (isLoginPage) {
    return <>{children}</>;
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
