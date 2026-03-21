import { supabase } from '@/lib/supabase';
import UsersClient from './UsersClient';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function UsersPage() {
    // On récupère la session pour vérifier le rôle admin côté serveur
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return notFound();

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profile?.role !== 'admin') {
        return <div className="p-20 text-center font-black uppercase text-red-500 tracking-widest">Accès Réservé aux Administrateurs</div>;
    }

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement profils:', error);
        return <div>Erreur de chargement.</div>;
    }

    return (
        <UsersClient initialProfiles={profiles || []} />
    );
}
