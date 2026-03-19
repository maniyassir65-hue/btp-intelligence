import { supabase } from '@/lib/supabase';
import SubcontractorsClient from './SubcontractorsClient';

export const revalidate = 0;

export default async function SubcontractorsPage() {
    const [subsRes, contractsRes, projsRes, bldgsRes, lvlsRes] = await Promise.all([
        supabase.from('subcontractors').select('*').order('created_at', { ascending: false }),
        supabase.from('subcontracts').select('*, subcontractors(company_name, specialty), projects(name)').order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('buildings').select('id, name, project_id').order('name'),
        supabase.from('levels').select('id, name, building_id').order('name'),
    ]);

    return (
        <SubcontractorsClient 
            initialSubcontractors={subsRes.data || []} 
            initialSubcontracts={contractsRes.data || []} 
            initialProjects={projsRes.data || []}
            initialBuildings={bldgsRes.data || []}
            initialLevels={lvlsRes.data || []}
            role="admin"
        />
    );
}
