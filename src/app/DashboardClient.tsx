'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users2,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  ChevronRight,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';

export default function DashboardClient({ initialStats, initialProjects, role }: any) {
  const router = useRouter();
  const [projectsList] = useState<any[]>(initialProjects);

  const handleGlobalExport = (type: 'pdf' | 'excel') => {
    if (type === 'excel') {
      const data = projectsList.map(p => ({
        'Projet': p.name,
        'Ville': p.city,
        'Budget': p.budget,
        'Progression': p.progress + '%',
        'Statut': p.status
      }));
      exportToExcel(data, 'Rapport_Global_Projets');
    } else {
      const columns = ['Projet', 'Ville', 'Budget', 'Progression', 'Statut'];
      const rows = projectsList.map(p => [p.name, p.city, p.budget, p.progress + '%', p.status]);
      const summary = initialStats.map((s: any) => ({ label: s.name, value: String(s.value) }));
      exportToPDF('BTP Intelligence - Rapport Global', columns, rows, 'Rapport_Global_Projets', summary);
    }
  };

  const iconMap: any = {
    building: Building2,
    users: Users2,
    trending: TrendingUp,
    alert: AlertCircle
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Bonjour, Admin</h1>
          <div className="flex items-center gap-3 mt-1.5 font-medium text-sm text-stone-500">
            Voici l'état actuel de vos chantiers aujourd'hui.
            <div className="flex items-center gap-1.5 ml-4">
              <button onClick={() => handleGlobalExport('pdf')} className="px-3 py-1 text-[10px] font-black uppercase text-red-600 bg-red-50 rounded-lg"><FileText size={12} /></button>
              <button onClick={() => handleGlobalExport('excel')} className="px-3 py-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 rounded-lg"><FileSpreadsheet size={12} /></button>
            </div>
          </div>
        </div>
        <button onClick={() => router.push('/projects')} className="flex items-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-xl shadow-md font-bold text-sm uppercase"><Plus size={18} /> Nouveau Projet</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {initialStats.filter((_: any, i: number) => role === 'admin' || (i !== 2 && i !== 3)).map((stat: any, i: number) => {
          const Icon = iconMap[stat.icon] || Building2;
          return (
            <motion.div key={stat.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-white p-5 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-4">
                <div className={cn("p-3.5 rounded-xl w-fit", stat.bg)}>
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{stat.name}</p>
                  <div className="flex items-baseline gap-2 mt-1.5 font-black">
                    <h3 className="text-2xl text-stone-900">{stat.value}</h3>
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full", i === 3 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>{stat.change}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-5">
          <h2 className="text-xl font-black text-stone-900 uppercase">Projets Récents</h2>
          <div className="bg-white rounded-[1.5rem] overflow-hidden border border-stone-100 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-stone-50/50 border-b border-stone-100 uppercase text-[9px] font-black text-stone-400">
                <tr><th className="px-6 py-4">Nom du Projet</th><th className="px-6 py-4">Ville</th><th className="px-6 py-4">Progrès</th><th className="px-6 py-4">Statut</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {projectsList.map((project) => (
                  <tr key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="hover:bg-stone-50/40 cursor-pointer group transition-colors font-bold text-stone-900">
                    <td className="px-6 py-4"><div>{project.name}</div><div className="text-[11px] text-stone-400">{project.budget}</div></td>
                    <td className="px-6 py-4"><span className="text-[11px] px-2.5 py-1 bg-stone-50 rounded-lg border border-stone-100">{project.city}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden min-w-[80px]">
                          <div style={{ width: `${project.progress}%` }} className={cn("h-full", project.progress === 100 ? "bg-emerald-500" : "bg-[#c97423]")} />
                        </div>
                        <span className="text-xs font-black">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-widest", project.status === 'ALERTE DEP.' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{project.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
