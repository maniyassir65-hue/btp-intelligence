import { supabase } from '@/lib/supabase';
import MaterialsClient from './MaterialsClient';

export default async function MaterialsPage() {
    // Parallel fetching for initial data
    const [materialsRes, projectsRes, levelsRes] = await Promise.all([
        supabase.from('materials').select('*').order('consumption_date', { ascending: false }),
        supabase.from('projects').select('id, name'),
        supabase.from('levels').select('id, name, building_id, buildings(name, project_id)')
    ]);

    return (
        <MaterialsClient 
            initialMaterials={materialsRes.data || []} 
            initialProjects={projectsRes.data || []} 
            initialLevels={levelsRes.data || []} 
        />
    );
}
