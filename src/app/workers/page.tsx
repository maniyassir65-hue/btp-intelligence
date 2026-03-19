import { supabase } from '@/lib/supabase';
import WorkersClient from './WorkersClient';

export const revalidate = 0;

export default async function WorkersPage() {
    // Récupération directe sur le serveur (très rapide)
    const { data: workers, error } = await supabase
        .from('workers')
        .select('id, full_name, specialty, phone_number, cin, daily_rate, contract_days, photo_url, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur Serveur Workers:', error.message);
    }

    return (
        <WorkersClient initialWorkers={workers || []} />
    );
}
