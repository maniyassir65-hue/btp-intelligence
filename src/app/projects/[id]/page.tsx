import { supabase } from '@/lib/supabase';
import ProjectDetailsClient from './ProjectDetailsClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!id) return notFound();

    try {
        const [projRes, bldgsRes, revsRes] = await Promise.all([
            supabase.from('projects').select('*').eq('id', id).single(),
            supabase.from('buildings').select('*').eq('project_id', id),
            supabase.from('revenues').select('*').eq('project_id', id).order('payment_date', { ascending: true })
        ]);

        if (projRes.error || !projRes.data) {
            console.error('Projet non trouvé id:', id, projRes.error);
            return notFound();
        }

        const buildings = bldgsRes.data || [];
        const bldgIds = buildings.map(b => b.id);

        let levelsData: any[] = [];
        let pointsData: any[] = [];
        let materialsData: any[] = [];
        let subcontractsData: any[] = [];

        if (bldgIds.length > 0) {
            const lvlsRes = await supabase.from('levels').select('id, name, building_id, status').in('building_id', bldgIds);
            levelsData = lvlsRes.data || [];
            const levelIds = levelsData.map(l => l.id);

            if (levelIds.length > 0) {
                const [ptsRes, matsRes] = await Promise.all([
                    supabase.from('daily_points').select('level_id, quantity, unit_price').in('level_id', levelIds),
                    supabase.from('materials').select('level_id, quantity_used, unit_price').in('level_id', levelIds),
                ]);
                pointsData = ptsRes.data || [];
                materialsData = matsRes.data || [];
            }

            // Fetch subcontracts linked to this project at any scope (project/building/level)
            // Exclude cancelled subcontracts from cost calculation
            const orFilter = [
                `project_id.eq.${id}`,
                bldgIds.length > 0 ? `building_id.in.(${bldgIds.join(',')})` : null,
                levelIds.length > 0 ? `level_id.in.(${levelIds.join(',')})` : null,
            ].filter(Boolean).join(',');

            const subRes = await supabase
                .from('subcontracts')
                .select('id, agreed_amount, paid_amount, status, description, subcontractor_id, project_id, building_id, level_id, subcontractors(company_name)')
                .or(orFilter)
                .neq('status', 'Annulé');
            subcontractsData = subRes.data || [];
        } else {
            // No buildings yet — still look for project-level subcontracts
            const subRes = await supabase
                .from('subcontracts')
                .select('id, agreed_amount, paid_amount, status, description, subcontractor_id, project_id, building_id, level_id, subcontractors(company_name)')
                .eq('project_id', id)
                .neq('status', 'Annulé');
            subcontractsData = subRes.data || [];
        }

        return (
            <ProjectDetailsClient 
                initialProject={projRes.data}
                initialBuildings={buildings}
                initialLevels={levelsData}
                initialPoints={pointsData}
                initialMaterials={materialsData}
                initialRevenues={revsRes.data || []}
                initialSubcontracts={subcontractsData}
                role="admin"
            />
        );
    } catch (err) {
        console.error('Crash serveur Projet Detail:', err);
        return <div className="p-20 text-center font-black uppercase text-red-500">Erreur de chargement du projet</div>;
    }
}
