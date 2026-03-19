import { supabase } from '@/lib/supabase';
import LevelDetailsClient from './LevelDetailsClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function LevelPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (!id) return notFound();

    try {
        const [lvlRes, wrkRes, ptsRes, matRes] = await Promise.all([
            supabase.from('levels').select('id, name, building_id, buildings(name, project_id)').eq('id', id).single(),
            supabase.from('workers').select('id, full_name, specialty, daily_rate'),
            supabase.from('daily_points').select('id, pointing_date, quantity, unit_price, worker_id, workers(full_name, specialty)').eq('level_id', id).order('pointing_date', { ascending: false }),
            supabase.from('materials').select('id, material_name, unit_price, quantity_used, quantity_wasted, consumption_date, receipt_url').eq('level_id', id).order('consumption_date', { ascending: false })
        ]);

        if (lvlRes.error || !lvlRes.data) return notFound();
        const building: any = lvlRes.data.buildings;

        return (
            <LevelDetailsClient 
                initialLevel={lvlRes.data}
                initialWorkers={wrkRes.data || []}
                initialPoints={(ptsRes.data || []).map((p: any) => ({ ...p, worker: p.workers }))}
                initialMaterials={matRes.data || []}
                initialBuildingName={building?.name || 'Bâtiment'}
                initialProjectId={building?.project_id}
            />
        );
    } catch (err) {
        console.error('Crash serveur Niveau Detail:', err);
        return <div className="p-20 text-center font-black uppercase text-red-500">Erreur de chargement de l'étage</div>;
    }
}
