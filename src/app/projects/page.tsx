import { supabase } from '@/lib/supabase';
import ProjectsClient from './ProjectsClient';

// Désactiver le cache pour avoir les données fraîches, 
// mais le chargement se fera sur le serveur (plus rapide)
export const revalidate = 0;

export default async function ProjectsPage() {
    // Récupération des données directment sur le serveur
    // C'est beaucoup plus proche de la base de données (0ms de latence réseau utilisateur)
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur Serveur:', error.message);
    }

    return (
        <ProjectsClient initialProjects={projects || []} />
    );
}
