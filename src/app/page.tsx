import { supabase } from '@/lib/supabase';
import DashboardClient from './DashboardClient';
import { Building2, Users2, TrendingUp, AlertCircle } from 'lucide-react';

export const revalidate = 0;

export default async function DashboardPage() {
  // Récupération de TOUTES les données en parallèle sur le serveur (TRÈS RAPIDE)
  try {
    const [workersRes, projectsRes] = await Promise.all([
      supabase.from('workers').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select(`
        *,
        buildings (
          levels (
            materials (quantity_used, unit_price),
            daily_points (quantity, unit_price)
          )
        ),
        revenues (amount, status)
      `).order('created_at', { ascending: false })
    ]);

    const workersCount = workersRes.count || 0;
    const projectsData = projectsRes.data || [];

    let totalGlobalCost = 0;
    let totalGlobalRevenue = 0;
    let alertesCount = 0;

    const formattedProjects = projectsData.map((proj: any) => {
      let projCost = 0;
      let projRevenue = 0;

      if (proj.revenues) {
        proj.revenues.forEach((rev: any) => {
          if (rev.status === 'Réglée') projRevenue += Number(rev.amount);
        });
      }

      if (proj.buildings) {
        proj.buildings.forEach((bldg: any) => {
          if (bldg.levels) {
            bldg.levels.forEach((lvl: any) => {
              if (lvl.materials) lvl.materials.forEach((m: any) => projCost += (m.quantity_used * m.unit_price));
              if (lvl.daily_points) lvl.daily_points.forEach((p: any) => projCost += (p.quantity * p.unit_price));
            });
          }
        });
      }

      totalGlobalCost += projCost;
      totalGlobalRevenue += projRevenue;
      const budget = Number(proj.global_budget) || 1;
      const progress = Math.min(100, Math.round((projCost / budget) * 100));
      if (projCost > budget) alertesCount++;

      return {
        id: proj.id,
        name: proj.name,
        city: proj.city,
        budget: Number(proj.global_budget).toLocaleString() + ' DH',
        progress,
        status: progress >= 100 ? 'ALERTE DEP.' : (progress > 0 ? 'EN COURS' : 'NOUVEAU'),
      };
    });

    const margin = totalGlobalRevenue - totalGlobalCost;
    const marginPercent = totalGlobalRevenue > 0 ? ((margin / totalGlobalRevenue) * 100).toFixed(1) + '%' : '0%';

    const stats = [
      { name: 'Projets Actifs', value: projectsData.length, change: 'En cours', icon: 'building', color: 'text-amber-600', bg: 'bg-amber-100/50' },
      { name: 'Effectif Total', value: workersCount, change: 'Ouvriers inscrits', icon: 'users', color: 'text-stone-600', bg: 'bg-stone-100/50' },
      { name: 'Marge Actuelle', value: margin > 0 ? '+' + margin.toLocaleString() : margin.toLocaleString(), change: 'Marge: ' + marginPercent, icon: 'trending', color: margin >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: margin >= 0 ? 'bg-emerald-100/50' : 'bg-rose-100/50' },
      { name: 'Alertes Budget', value: alertesCount, change: alertesCount > 0 ? 'DÉPASSEMENT !' : 'TOUT VA BIEN', icon: 'alert', color: alertesCount > 0 ? 'text-red-600' : 'text-emerald-600', bg: alertesCount > 0 ? 'bg-red-100/50' : 'bg-emerald-100/50' },
    ];

    return <DashboardClient initialStats={stats} initialProjects={formattedProjects} />;
    
  } catch (err: any) {
    console.error('Crash serveur Dashboard:', err.message);
    return <div className="p-20 text-center font-black uppercase text-red-500">Erreur de connexion base de données</div>;
  }
}
