'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Layers,
    Plus,
    ChevronLeft,
    MapPin,
    Wallet,
    Loader2,
    X,
    CheckCircle2,
    HardHat,
    TrendingUp,
    Receipt,
    Banknote,
    Activity,
    Calendar,
    Settings,
    FileText,
    FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Project {
    id: string;
    name: string;
    city: string;
    global_budget: number;
    budget_materials: number;
    budget_workers: number;
    budget_subcontractors: number;
    client_name: string;
    start_date: string;
    end_date: string;
}

interface Building {
    id: string;
    name: string;
}

interface Level {
    id: string;
    building_id: string;
    name: string;
    level_number: number;
}

interface Revenue {
    id: string;
    designation: string;
    amount: number;
    status: string;
    payment_date: string;
    created_at: string;
}

export default function ProjectDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { role } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [points, setPoints] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [revenues, setRevenues] = useState<Revenue[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'overview' | 'billing'>('overview');

    // States pour modales
    const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
    const [isAvenantModalOpen, setIsAvenantModalOpen] = useState(false);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

    // Formulaire Nouveau Bâtiment/Étage
    const [buildingName, setBuildingName] = useState('');
    const [levelName, setLevelName] = useState('');

    // Avenant
    const [avenantAmount, setAvenantAmount] = useState('');

    // Formulaire Revenu
    const [revName, setRevName] = useState('');
    const [revAmount, setRevAmount] = useState('');
    const [revStatus, setRevStatus] = useState('En attente');
    const [revDate, setRevDate] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (id) fetchProjectData();
    }, [id]);

    async function fetchProjectData() {
        try {
            setLoading(true);

            const { data: proj, error: projErr } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();
            if (projErr) throw projErr;
            setProject(proj);

            const { data: bldgs, error: bldgsErr } = await supabase
                .from('buildings')
                .select('*')
                .eq('project_id', id);
            if (bldgsErr) throw bldgsErr;
            setBuildings(bldgs || []);

            if (bldgs && bldgs.length > 0) {
                const bldgIds = bldgs.map(b => b.id);
                const { data: lvls, error: lvlsErr } = await supabase
                    .from('levels')
                    .select('*')
                    .in('building_id', bldgIds);
                if (lvlsErr) throw lvlsErr;
                setLevels(lvls || []);

                if (lvls && lvls.length > 0) {
                    const levelIds = lvls.map(l => l.id);
                    const { data: pts } = await supabase.from('daily_points').select('level_id, quantity, unit_price').in('level_id', levelIds);
                    setPoints(pts || []);
                    const { data: mats } = await supabase.from('materials').select('level_id, quantity_used, unit_price').in('level_id', levelIds);
                    setMaterials(mats || []);
                }
            }

            try {
                const { data: revs } = await supabase
                    .from('revenues')
                    .select('*')
                    .eq('project_id', id)
                    .order('payment_date', { ascending: true });
                setRevenues(revs || []);
            } catch (err) {
                // Table doesn't exist yet, ignore silently
            }

        } catch (error: any) {
            console.error('Erreur:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddBuilding(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('buildings')
                .insert([{ name: buildingName, project_id: id }])
                .select();
            if (error) throw error;
            setBuildings([...buildings, data[0]]);
            setIsBuildingModalOpen(false);
            setBuildingName('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAddLevel(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedBuildingId) return;
        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('levels')
                .insert([{
                    name: levelName,
                    building_id: selectedBuildingId
                }])
                .select();
            if (error) throw error;
            setLevels([...levels, data[0]]);
            setIsLevelModalOpen(false);
            setLevelName('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAddRevenue(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('revenues')
                .insert([{
                    designation: revName,
                    amount: parseFloat(revAmount) || 0,
                    status: revStatus,
                    payment_date: revDate || null,
                    project_id: id
                }])
                .select();
            if (error) throw error;
            setRevenues([...revenues, data[0]]);
            setIsRevenueModalOpen(false);
            setRevName(''); setRevAmount(''); setRevDate(''); setRevStatus('En attente');
        } catch (error: any) {
            alert('Erreur: Vous devez d\'abord appliquer le script SQL pour la table revenues. ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUpdateRevenueStatus(revId: string, newStatus: string) {
        try {
            const { error } = await supabase
                .from('revenues')
                .update({ status: newStatus })
                .eq('id', revId);

            if (error) throw error;

            // Mise à jour locale de l'état
            setRevenues(revenues.map(r => r.id === revId ? { ...r, status: newStatus } : r));
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        }
    }

    async function handleDeleteRevenue(revId: string) {
        if (!confirm('Supprimer cette facture ?')) return;
        try {
            const { error } = await supabase
                .from('revenues')
                .delete()
                .eq('id', revId);

            if (error) throw error;
            setRevenues(revenues.filter(r => r.id !== revId));
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        }
    }

    async function handleUpdateGlobalBudget(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { error } = await supabase
                .from('projects')
                .update({ global_budget: parseFloat(avenantAmount) || 0 })
                .eq('id', id);

            if (error) throw error;

            if (project) {
                setProject({ ...project, global_budget: parseFloat(avenantAmount) || 0 });
            }
            setIsAvenantModalOpen(false);
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleProjectExport = (type: 'pdf' | 'excel') => {
        if (!project) return;

        if (type === 'excel') {
            const data = buildings.map(b => {
                const bldgLevels = levels.filter(l => l.building_id === b.id);
                return bldgLevels.map(l => {
                    const costWorkers = points.filter(p => p.level_id === l.id).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
                    const costMats = materials.filter(p => p.level_id === l.id).reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);
                    return {
                        'Bâtiment': b.name,
                        'Étage': l.name,
                        'Coût Ouvriers': costWorkers,
                        'Coût Matériaux': costMats,
                        'Total Étage': costWorkers + costMats
                    };
                });
            }).flat();
            exportToExcel(data, `Rapport_Projet_${project.name}`);
        } else {
            const columns = ['Bâtiment', 'Étage', 'Coût Ouvriers', 'Coût Matériaux', 'Total'];
            const rows = buildings.map(b => {
                const bldgLevels = levels.filter(l => l.building_id === b.id);
                return bldgLevels.map(l => {
                    const costWorkers = points.filter(p => p.level_id === l.id).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
                    const costMats = materials.filter(p => p.level_id === l.id).reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);
                    return [b.name, l.name, costWorkers + ' DH', costMats + ' DH', (costWorkers + costMats) + ' DH'];
                });
            }).flat();

            const summary = [
                { label: 'Budget Initial', value: project.global_budget.toLocaleString() + ' DH' },
                { label: 'Coût Réel', value: totalCost.toLocaleString() + ' DH' },
                { label: 'Encaissé', value: totalEnkesse.toLocaleString() + ' DH' },
                { label: 'Marge', value: profitability.toLocaleString() + ' DH' }
            ];

            exportToPDF(`Projet: ${project.name}`, columns, rows, `Rapport_Projet_${project.name}`, summary);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Chargement...</p>
        </div>
    );

    if (!project) return <div>Projet introuvable</div>;

    const totalWorkers = points.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    const totalMaterials = materials.reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);
    const totalCost = totalWorkers + totalMaterials;

    // Marge Réelle = Argent réellement encaissé - Dépenses réelles
    const totalEnkesse = revenues.filter(r => r.status === "Réglée" || r.status === "Payée partiellement").reduce((a, b) => a + Number(b.amount), 0);
    const profitability = totalEnkesse - totalCost;

    // Préparation des données pour le Graphique de Trésorerie
    const chartData = revenues.map(r => ({
        date: new Date(r.payment_date || r.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        Entrées: r.amount
    }));

    return (
        <div className="space-y-10 pb-16">
            {/* Back Button & Project Summary */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/projects')}
                        className="flex items-center gap-1.5 text-stone-400 hover:text-stone-900 transition-all font-bold text-[10px] uppercase tracking-[0.15em]"
                    >
                        <ChevronLeft size={14} /> Retour à la liste
                    </button>
                    <div className="space-y-1.5">
                        <h1 className="text-4xl font-black tracking-tight text-stone-900 lowercase">{project.name}</h1>
                        <div className="flex items-center gap-5 text-stone-500 font-bold uppercase text-[10px] tracking-widest pt-1">
                            {project.client_name && (
                                <span className="flex items-center gap-1.5 text-stone-900 font-black">
                                    Client: {project.client_name}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-amber-600" /> {project.city}
                            </span>
                            {project.end_date && (
                                <span className="flex items-center gap-1.5 opacity-60">
                                    <Calendar size={14} /> Fin: {new Date(project.end_date).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-white p-1 rounded-xl border border-stone-200 gap-1">
                        <button onClick={() => handleProjectExport('pdf')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-50 flex items-center gap-1.5">
                            <FileText size={12} /> PDF
                        </button>
                        <button onClick={() => handleProjectExport('excel')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-50 flex items-center gap-1.5">
                            <FileSpreadsheet size={12} /> EXCEL
                        </button>
                    </div>
                    <button
                        onClick={() => setIsBuildingModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-full shadow-md hover:bg-amber-700 active:scale-95 transition-all text-sm font-bold tracking-wide"
                    >
                        <Plus size={16} />
                        AJOUTER UN BÂTIMENT
                    </button>
                </div>
            </div>

            {/* Dashboard Rentabilité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center relative group">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Budget Initial</p>
                        {role === 'admin' && (
                            <button
                                onClick={() => {
                                    setAvenantAmount(project.global_budget.toString());
                                    setIsAvenantModalOpen(true);
                                }}
                                className="p-1 px-2 text-[9px] font-black underline uppercase text-[#c97423] hover:bg-amber-50 rounded transition-all flex items-center gap-1.5"
                            >
                                <Settings size={12} /> Ajuster
                            </button>
                        )}
                    </div>
                    <p className="text-xl font-black text-stone-900 mt-1">{project.global_budget.toLocaleString()} DH</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Coût Main d'Œuvre</p>
                    <p className="text-xl font-black text-stone-900 mt-1">{totalWorkers.toLocaleString()} DH</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Coût Réel Total</p>
                    <p className="text-xl font-black text-rose-600 mt-1">{totalCost.toLocaleString()} DH</p>
                </div>
                {role === 'admin' && (
                    <>
                        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center">
                            <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest text-[#c97423]">Argent Encaissé</p>
                            <div className="flex items-end gap-2">
                                <p className="text-xl font-black text-emerald-600 mt-1">{totalEnkesse.toLocaleString()} DH</p>
                                <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-1 drop-shadow-sm">/ {project.global_budget.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className={cn("p-5 rounded-2xl border shadow-sm flex flex-col justify-center col-span-1 lg:col-span-1", profitability >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800")}>
                            <p className={cn("text-[9px] uppercase font-bold tracking-widest", profitability >= 0 ? "text-emerald-600/80" : "text-red-600/80")}>
                                Cash-flow / Marge Actuelle
                            </p>
                            <p className="text-2xl font-black mt-1">{profitability > 0 ? '+' : ''}{profitability.toLocaleString()} DH</p>
                        </div>
                    </>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-6 border-b border-stone-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                        "pb-3.5 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
                        activeTab === 'overview' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600"
                    )}
                >
                    <Activity size={18} /> Terrain & Coûts
                </button>
                {role === 'admin' && (
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={cn(
                            "pb-3.5 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'billing' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600"
                        )}
                    >
                        <Receipt size={18} /> Facturation & Client
                        {revenues.filter(r => r.status === 'En attente').length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                    </button>
                )}
            </div>

            {/* CONTENU TABS */}
            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                    {/* Buildings List */}
                    <div className="grid grid-cols-1 gap-12">
                        {buildings.length === 0 ? (
                            <div className="bg-white p-12 rounded-3xl text-center space-y-4 border border-stone-200">
                                <div className="bg-stone-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-stone-300">
                                    <Building2 size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-stone-900">Structure initiale</h3>
                                    <p className="text-stone-400 font-medium text-xs max-w-sm mx-auto">Veuillez ajouter un premier bloc de construction.</p>
                                </div>
                            </div>
                        ) : (
                            buildings.map((bldg) => (
                                <section key={bldg.id} className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-[#18181b] text-white rounded-[1.25rem] shadow-sm">
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black tracking-tight text-stone-900 uppercase">
                                                    {bldg.name}
                                                </h2>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                                                    Bloc de construction principal
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedBuildingId(bldg.id);
                                                setIsLevelModalOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 text-[#c97423] font-bold uppercase text-[11px] tracking-widest hover:bg-amber-50 px-4 py-2 rounded-lg transition-all"
                                        >
                                            <Plus size={14} /> NOUVEL ÉTAGE
                                        </button>
                                    </div>

                                    {/* Levels Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                                        {levels.filter(l => l.building_id === bldg.id).length === 0 ? (
                                            <div className="col-span-full py-10 bg-white rounded-[1.5rem] border border-stone-200 flex flex-col items-center gap-3 text-stone-300">
                                                <Layers size={24} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Aucun étage</span>
                                            </div>
                                        ) : (
                                            levels.filter(l => l.building_id === bldg.id).map((lvl, idx) => {
                                                const lvlCostWorkers = points.filter(p => p.level_id === lvl.id).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
                                                const lvlCostMats = materials.filter(p => p.level_id === lvl.id).reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);
                                                const lvlTotalCost = lvlCostWorkers + lvlCostMats;

                                                return (
                                                    <motion.div
                                                        key={lvl.id}
                                                        whileHover={{ y: -4, scale: 1.02 }}
                                                        onClick={() => router.push(`/levels/${lvl.id}`)}
                                                        className="bg-white p-5 rounded-[1.75rem] flex flex-col items-center justify-center gap-3 text-center cursor-pointer border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all relative group"
                                                    >
                                                        <div className="absolute top-3 right-4 text-[9px] font-bold text-stone-300 group-hover:text-stone-400">
                                                            #{idx + 1}
                                                        </div>

                                                        <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-[#FFF0E2] group-hover:text-amber-600 transition-colors">
                                                            <Layers size={24} />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Étage</p>
                                                            <p className="font-black text-[15px] text-stone-900 truncate px-2 leading-tight">{lvl.name}</p>
                                                        </div>

                                                        <div className="w-full pt-3 mt-1 border-t border-stone-50">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[8px] uppercase font-bold text-stone-400 tracking-widest">Coût engagé</span>
                                                                <span className="text-xs font-black text-[#c97423]">{lvlTotalCost.toLocaleString()} DH</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })
                                        )}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {activeTab === 'billing' && role === 'admin' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                    {/* Balance Client */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Facturé', value: revenues.reduce((a, r) => a + Number(r.amount), 0).toLocaleString() + ' DH', color: 'text-stone-900', bg: 'bg-stone-50', icon: Receipt },
                            { label: 'Encaissé (Réglé)', value: revenues.filter(r => r.status === 'Réglée').reduce((a, r) => a + Number(r.amount), 0).toLocaleString() + ' DH', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
                            { label: 'Partiel / En cours', value: revenues.filter(r => r.status === 'Payée partiellement').reduce((a, r) => a + Number(r.amount), 0).toLocaleString() + ' DH', color: 'text-amber-600', bg: 'bg-amber-50', icon: Banknote },
                            { label: 'Reste à Encaisser', value: revenues.filter(r => r.status !== 'Réglée').reduce((a, r) => a + Number(r.amount), 0).toLocaleString() + ' DH', color: 'text-red-600', bg: 'bg-red-50', icon: Activity },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl flex items-center gap-3 border border-stone-100 shadow-sm">
                                <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className={cn("text-base font-black leading-tight", stat.color)}>{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Graphique de Trésorerie */}
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm h-80 flex flex-col">
                        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-[#c97423]" /> Évolution des Encaissements
                        </h2>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 700 }} dy={10} />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 800 }} />
                                    <Area type="monotone" dataKey="Entrées" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenus)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 gap-2">
                                <Banknote size={32} className="opacity-40" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Aucune donnée de trésorerie</span>
                            </div>
                        )}
                    </div>

                    {/* Échéancier de Facturation */}
                    <div>
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-black text-stone-900 uppercase">Échéancier de Facturation</h2>
                            <button onClick={() => setIsRevenueModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#18181b] text-white rounded-xl shadow-sm hover:bg-stone-800 transition-all text-xs font-bold uppercase tracking-widest">
                                <Plus size={16} /> Ajouter Facture
                            </button>
                        </div>

                        {revenues.length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl text-center border border-stone-100 shadow-sm">
                                <Receipt className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                                <p className="text-stone-400 font-bold text-sm">Aucune facture ou acompte enregistré.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-50 border-b border-stone-100 text-[9px] font-black uppercase tracking-widest text-stone-400">
                                        <tr>
                                            <th className="px-6 py-4">Désignation</th>
                                            <th className="px-6 py-4">Date de Paiement</th>
                                            <th className="px-6 py-4">Montant</th>
                                            <th className="px-6 py-4">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {revenues.map((rev) => (
                                            <tr key={rev.id} className="hover:bg-stone-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-stone-900 text-sm">{rev.designation}</span>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-bold text-stone-500">
                                                    {rev.payment_date ? new Date(rev.payment_date).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-stone-900">{Number(rev.amount).toLocaleString()} DH</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={rev.status}
                                                        onChange={(e) => handleUpdateRevenueStatus(rev.id, e.target.value)}
                                                        className={cn(
                                                            "text-[9px] px-2 py-1 uppercase tracking-widest font-black rounded-md border outline-none cursor-pointer transition-all",
                                                            rev.status === 'Réglée' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                rev.status === 'Payée partiellement' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                    "bg-rose-50 text-rose-600 border-rose-100"
                                                        )}
                                                    >
                                                        <option value="En attente">En attente</option>
                                                        <option value="Payée partiellement">Partielle</option>
                                                        <option value="Réglée">Réglée ✔️</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteRevenue(rev.id)}
                                                        className="p-1.5 text-stone-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* FOOTER TIP */}
            <div className="bg-[#1e1c1a] p-6 rounded-[2rem] flex flex-col sm:flex-row items-center gap-6 shadow-xl text-white relative overflow-hidden mt-8">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-600/20 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                <div className="bg-[#c97423] p-3 rounded-xl text-white shadow-md relative z-10 shrink-0">
                    <HardHat size={24} />
                </div>
                <div className="space-y-1 relative z-10 text-center sm:text-left">
                    <h3 className="text-base font-black uppercase tracking-wide">Conseil de gestion</h3>
                    <p className="text-[#a8a29e] font-medium text-xs leading-relaxed max-w-2xl">
                        Cliquez sur un étage pour enregistrer les pointages journaliers. La structure hiérarchique vous permet une analyse fine de la rentabilité par section de bâtiment.
                    </p>
                </div>
            </div>

            {/* MODAL BUILDING */}
            <AnimatePresence>
                {isBuildingModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBuildingModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="bg-stone-50 p-6 flex justify-between items-center border-b border-stone-100">
                                <h2 className="text-lg font-black uppercase tracking-tight text-stone-900">Bloc / Bâtiment</h2>
                                <button onClick={() => setIsBuildingModalOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-900 bg-white rounded-lg shadow-sm border border-stone-200 transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddBuilding} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Désignation du bâtiment</label>
                                    <input required value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="ex: Bloc A" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 text-sm transition-all" />
                                </div>
                                <button disabled={isSubmitting} className="w-full py-3 bg-[#c97423] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-amber-700 transition-all text-xs tracking-widest uppercase">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle2 size={16} /> Créer le bloc</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL LEVEL */}
            <AnimatePresence>
                {isLevelModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLevelModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="bg-stone-50 p-6 flex justify-between items-center border-b border-stone-100">
                                <h2 className="text-lg font-black uppercase tracking-tight text-stone-900">Nouvel Étage</h2>
                                <button onClick={() => setIsLevelModalOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-900 bg-white rounded-lg shadow-sm border border-stone-200 transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddLevel} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Nom de l'étage</label>
                                    <input required value={levelName} onChange={e => setLevelName(e.target.value)} placeholder="ex: RDC / PH" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 text-sm transition-all" />
                                </div>
                                <button disabled={isSubmitting} className="w-full py-3 bg-[#c97423] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-amber-700 transition-all text-xs tracking-widest uppercase">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle2 size={16} /> Valider l'étage</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL REVENUE */}
            <AnimatePresence>
                {isRevenueModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRevenueModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="bg-emerald-950 p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Appel de Fonds / Facture</h2>
                                <button onClick={() => setIsRevenueModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddRevenue} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Désignation</label>
                                    <input required value={revName} onChange={e => setRevName(e.target.value)} placeholder="ex: Acompte 30% Gros Oeuvre" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-stone-900 text-sm transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Montant (DH)</label>
                                        <input required type="number" value={revAmount} onChange={e => setRevAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500/20 text-emerald-700 font-black text-sm transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Statut</label>
                                        <select required value={revStatus} onChange={e => setRevStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm">
                                            <option value="En attente">En attente</option>
                                            <option value="Payée partiellement">Partiellement payée</option>
                                            <option value="Réglée">Réglée ✔️</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Date estimée ou réelle</label>
                                    <input type="date" value={revDate} onChange={e => setRevDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-600 text-sm" />
                                </div>
                                <button disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 transition-all text-xs tracking-widest uppercase mt-4">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle2 size={16} /> Enregistrer l'entrée</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* MODAL AVENANT (Ajuster Budget Actuel) */}
            <AnimatePresence>
                {isAvenantModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAvenantModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl relative overflow-hidden">
                            <div className="bg-amber-600 p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Avenant / Ajustement</h2>
                                <button onClick={() => setIsAvenantModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleUpdateGlobalBudget} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Nouveau Budget Global (DH)</label>
                                    <input
                                        required
                                        type="number"
                                        value={avenantAmount}
                                        onChange={e => setAvenantAmount(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 outline-none focus:ring-2 focus:ring-amber-500/20 text-stone-900 font-black text-sm transition-all"
                                    />
                                    <p className="text-[9px] font-bold text-stone-400 mt-2 ml-1">Ce montant remplacera le contrat initial pour calculer la nouvelle rentabilité globale du projet.</p>
                                </div>
                                <button disabled={isSubmitting} className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-stone-800 transition-all text-xs tracking-widest uppercase">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle2 size={16} /> Enregistrer modification</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
