'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Plus,
    MapPin,
    Wallet,
    Calendar,
    Loader2,
    X,
    CheckCircle,
    AlertCircle,
    Search,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    city: string;
    client_name: string;
    global_budget: number;
    budget_materials: number;
    budget_workers: number;
    budget_subcontractors: number;
    start_date: string;
    end_date: string;
    created_at: string;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newName, setNewName] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newClient, setNewClient] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newBudget, setNewBudget] = useState('');
    const [matBudget, setMatBudget] = useState('');
    const [workBudget, setWorkBudget] = useState('');
    const [subBudget, setSubBudget] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error: any) {
            console.error('Erreur:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddProject(e: React.FormEvent) {
        e.preventDefault();
        if (!newName) return;

        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    name: newName,
                    city: newCity,
                    client_name: newClient || 'Client Inconnu',
                    start_date: newStartDate || null,
                    end_date: newEndDate || null,
                    global_budget: parseFloat(newBudget) || 0,
                    budget_materials: parseFloat(matBudget) || 0,
                    budget_workers: parseFloat(workBudget) || 0,
                    budget_subcontractors: parseFloat(subBudget) || 0
                }])
                .select();

            if (error) throw error;

            setProjects([data[0], ...projects]);
            setNewName(''); setNewCity(''); setNewClient(''); setNewStartDate(''); setNewEndDate('');
            setNewBudget(''); setMatBudget(''); setWorkBudget(''); setSubBudget('');
            setIsModalOpen(false);
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Mes Chantiers</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Gérez la structure et le budget de vos projets actifs.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-full shadow-md hover:bg-amber-700 transition-all active:scale-95 group text-sm font-bold"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span className="uppercase tracking-wide">Nouveau Projet</span>
                </button>
            </div>

            {/* Barre de recherche */}
            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
                <input
                    type="text"
                    placeholder="Rechercher par nom ou ville..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-medium text-sm"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px]">Synchronisation...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="bg-white p-16 rounded-[2rem] text-center space-y-4 border border-stone-100 shadow-sm">
                    <div className="bg-stone-50 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-stone-300">
                        <Building2 size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-stone-900">Aucun projet</h3>
                        <p className="text-stone-400 text-xs font-medium max-w-xs mx-auto">
                            {searchTerm ? "Aucun résultat pour votre recherche." : "Votre liste de chantiers est vide."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link href={`/projects/${project.id}`}>
                                <div className="bg-white overflow-hidden rounded-[1.75rem] border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                                    <div className="bg-[#1e1c1a] p-5 text-white flex justify-between items-start h-20">
                                        <div className="bg-white/10 p-2.5 rounded-xl">
                                            <Building2 className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-400">
                                            Actif
                                        </span>
                                    </div>

                                    <div className="p-6 space-y-6 -mt-5 bg-white rounded-t-[1.5rem] relative">
                                        <div className="space-y-0.5">
                                            <h3 className="text-xl font-black tracking-tight text-stone-900 group-hover:text-[#c97423] transition-colors truncate">
                                                {project.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                                                <MapPin className="w-3.5 h-3.5 text-stone-300" />
                                                {project.city || 'Casablanca'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-stone-50">
                                            <div className="space-y-1">
                                                <p className="text-[9px] uppercase font-bold text-stone-300 tracking-widest">Budget</p>
                                                <p className="font-black text-xs text-stone-900 leading-none">
                                                    {project.global_budget.toLocaleString()} <span className="text-stone-400 font-bold">DH</span>
                                                </p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] uppercase font-bold text-stone-300 tracking-widest">Créé le</p>
                                                <p className="font-bold text-xs text-stone-600 leading-none">
                                                    {new Date(project.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] font-black text-[#c97423] uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-all">
                                                Gérer <ArrowRight size={14} />
                                            </span>
                                            <div className="flex -space-x-1.5">
                                                {[1, 2].map(j => (
                                                    <div key={j} className="w-7 h-7 rounded-full bg-stone-50 border-2 border-white flex items-center justify-center shadow-inner">
                                                        <span className="text-[9px] font-bold text-stone-300">B{j}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* MODALE */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden relative max-h-[90vh] flex flex-col">
                            <div className="bg-stone-950 p-6 flex justify-between items-center text-white shrink-0">
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-black uppercase tracking-tight">Nouveau Projet</h2>
                                    <p className="text-stone-400 text-[9px] font-bold uppercase tracking-widest">Dossier technique & financier</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                            </div>

                            <div className="p-7 overflow-y-auto">
                                <form onSubmit={handleAddProject} className="space-y-6">
                                    {/* Section Infos */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase text-stone-400 tracking-widest border-b border-stone-100 pb-2">Informations Générales</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nom du Chantier / Projet</label>
                                                <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex: Résidence El Mansour"
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Client / Maître d'ouvrage</label>
                                                <input type="text" value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Nom du client"
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Localisation (Ville / Adresse)</label>
                                                <input type="text" value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Rabat, Casablanca..."
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Date de début</label>
                                                <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Date de fin prévue</label>
                                                <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-sm" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section Budget */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase text-stone-400 tracking-widest border-b border-stone-100 pb-2">Budget Prévisionnel</h3>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-[#c97423] uppercase tracking-widest ml-1">Budget Total Contrat (DH)</label>
                                            <input required type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} placeholder="85000000"
                                                className="w-full px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-black text-amber-700 transition-all text-lg" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Matériaux (DH)</label>
                                                <input type="number" value={matBudget} onChange={(e) => setMatBudget(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Main d'Œuvre (DH)</label>
                                                <input type="number" value={workBudget} onChange={(e) => setWorkBudget(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">Sous-traitance (DH)</label>
                                                <input type="number" value={subBudget} onChange={(e) => setSubBudget(e.target.value)} placeholder="0"
                                                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-sm" />
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSubmitting}
                                        className="w-full py-4 bg-[#18181b] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-95 transition-all text-xs tracking-widest uppercase shadow-md mt-4"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle size={18} /> valider la création du projet</>}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
