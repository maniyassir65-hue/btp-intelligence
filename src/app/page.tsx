'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users2,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  MapPin,
  Wallet,
  Calendar,
  ChevronRight,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';

export default function DashboardPage() {
  const router = useRouter();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]); // Pour l'export
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([
    { title: 'Système en ligne', subtitle: 'Connexion Supabase établie', time: 'À l\'instant', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // 1. Fetch Workers count
      const { count: workersCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Projects with nested costs and revenues
      // Note: Make sure to type properly or cast
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          buildings (
            levels (
              materials (quantity_used, unit_price),
              daily_points (quantity, unit_price)
            )
          ),
          revenues (amount, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let totalGlobalCost = 0;
      let totalGlobalRevenue = 0;
      let alertesCount = 0;

      const formattedProjects = (projectsData || []).map((proj: any) => {
        let projCost = 0;
        let projRevenue = 0;

        // Calculate revenues
        if (proj.revenues) {
          proj.revenues.forEach((rev: any) => {
            if (rev.status === 'Réglée') {
              projRevenue += Number(rev.amount);
            }
          });
        }

        // Calculate costs
        if (proj.buildings) {
          proj.buildings.forEach((bldg: any) => {
            if (bldg.levels) {
              bldg.levels.forEach((lvl: any) => {
                if (lvl.materials) {
                  lvl.materials.forEach((mat: any) => {
                    projCost += (mat.quantity_used * mat.unit_price);
                  });
                }
                if (lvl.daily_points) {
                  lvl.daily_points.forEach((pt: any) => {
                    projCost += (pt.quantity * pt.unit_price);
                  });
                }
              });
            }
          });
        }

        totalGlobalCost += projCost;
        totalGlobalRevenue += projRevenue;

        // Progress = (Cost / Global Budget) * 100
        const budget = Number(proj.global_budget) || 1;
        let progress = Math.min(100, Math.round((projCost / budget) * 100));
        if (projCost > budget) {
          alertesCount++;
        }

        return {
          id: proj.id,
          name: proj.name,
          city: proj.city,
          budget: Number(proj.global_budget).toLocaleString() + ' DH',
          progress: progress,
          status: progress >= 100 ? 'ALERTE DEP.' : (progress > 0 ? 'EN COURS' : 'NOUVEAU'),
        };
      });

      // Calculate Global Profitability
      const margin = totalGlobalRevenue - totalGlobalCost;
      const marginPercent = totalGlobalRevenue > 0 ? ((margin / totalGlobalRevenue) * 100).toFixed(1) + '%' : '0%';

      setStats([
        {
          name: 'Projets Actifs',
          value: projectsData?.length || 0,
          change: 'En cours',
          icon: Building2,
          color: 'text-amber-600',
          bg: 'bg-amber-100/50'
        },
        {
          name: 'Effectif Total',
          value: workersCount || 0,
          change: 'Ouvriers inscrits',
          icon: Users2,
          color: 'text-stone-600',
          bg: 'bg-stone-100/50'
        },
        {
          name: 'Marge Actuelle',
          value: margin > 0 ? '+' + margin.toLocaleString() : margin.toLocaleString(),
          change: 'Marge: ' + marginPercent,
          icon: TrendingUp,
          color: margin >= 0 ? 'text-emerald-600' : 'text-rose-600',
          bg: margin >= 0 ? 'bg-emerald-100/50' : 'bg-rose-100/50'
        },
        {
          name: 'Alertes Budget',
          value: alertesCount,
          change: alertesCount > 0 ? 'DÉPASSEMENT !' : 'TOUT VA BIEN',
          icon: AlertCircle,
          color: alertesCount > 0 ? 'text-red-600' : 'text-emerald-600',
          bg: alertesCount > 0 ? 'bg-red-100/50' : 'bg-emerald-100/50'
        },
      ]);

      setRawProjects(formattedProjects);
      setProjectsList(formattedProjects);

    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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
      const summary = stats.map(s => ({ label: s.name, value: String(s.value) }));
      exportToPDF('BTP Intelligence - Rapport Global', columns, rows, 'Rapport_Global_Projets', summary);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Bonjour, Admin</h1>
          <div className="flex items-center gap-3 mt-1.5 font-medium text-sm">
            <p className="text-stone-500">
              Voici l'état actuel de vos chantiers aujourd'hui.
            </p>
            <div className="flex items-center gap-1.5 ml-4">
              <button onClick={() => handleGlobalExport('pdf')} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 flex items-center gap-1.5">
                <FileText size={12} /> PDF
              </button>
              <button onClick={() => handleGlobalExport('excel')} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 flex items-center gap-1.5">
                <FileSpreadsheet size={12} /> Excel
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-xl shadow-md hover:bg-amber-700 transition-all active:scale-95 group text-sm font-bold"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          <span className="uppercase tracking-wide">Nouveau Projet</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.filter((_, i) => role === 'admin' || (i !== 2 && i !== 3)).map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white p-5 rounded-2xl border-none shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex flex-col gap-4">
              <div className={cn("p-3.5 rounded-xl w-fit", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">{stat.name}</p>
                <div className="flex items-baseline gap-2 mt-1.5 font-black">
                  <h3 className="text-2xl text-stone-900">{stat.value}</h3>
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight",
                    i === 3 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Projects Section */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase">Projets Récents</h2>
            <button className="text-[11px] font-bold text-[#c97423] uppercase tracking-widest flex items-center gap-1 hover:gap-1.5 transition-all">
              Tout voir <ChevronRight size={12} />
            </button>
          </div>

          <div className="bg-white rounded-[1.5rem] overflow-hidden border border-stone-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Nom du Projet</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Ville</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Progrès</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {projectsList.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="hover:bg-stone-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-stone-900 group-hover:text-[#c97423] transition-colors text-base">{project.name}</div>
                        <div className="text-[11px] font-medium text-stone-400">{project.budget}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-stone-500 px-2.5 py-1 bg-stone-50 border border-stone-100 rounded-lg">{project.city}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden min-w-[80px]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              className={cn(
                                "h-full transition-all duration-1000",
                                project.progress === 100 ? "bg-emerald-500" : "bg-[#c97423]"
                              )}
                            />
                          </div>
                          <span className="text-xs font-black text-stone-900">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right sm:text-left">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-widest",
                          project.status === 'ALERTE DEP.'
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        )}>
                          <Clock className="w-3 h-3" />
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Timeline Section */}
        <div className="lg:col-span-4 space-y-5">
          <h2 className="text-xl font-black text-stone-900 tracking-tight px-2 uppercase">Activités Récents</h2>
          <div className="bg-white p-6 rounded-[1.5rem] border border-stone-100 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute left-[2.25rem] top-10 bottom-24 w-0.5 bg-stone-50" />

            {activities.map((act, i) => (
              <div key={i} className="flex gap-4 group relative z-10">
                <div className={cn("p-2.5 rounded-xl shrink-0 shadow-sm transition-transform group-hover:scale-105", act.bg)}>
                  <act.icon className={cn("w-4 h-4", act.color)} />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-[13px] font-bold text-stone-800 leading-tight group-hover:text-[#c97423] transition-colors">
                    {act.title}
                  </p>
                  <p className="text-[10px] font-bold text-stone-400 leading-none">
                    {act.subtitle}
                  </p>
                  <p className="text-[9px] font-bold text-stone-300 pt-0.5 tracking-tight uppercase">
                    {act.time}
                  </p>
                </div>
              </div>
            ))}

            <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-[#18181b] bg-stone-50 border border-stone-100 rounded-xl hover:bg-stone-900 hover:text-white transition-all active:scale-95">
              Voir tout l'historique
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
