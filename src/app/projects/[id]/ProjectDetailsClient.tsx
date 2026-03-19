'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    FileSpreadsheet,
    Edit2
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { addBuildingAction, addLevelAction, addRevenueAction, updateRevenueAction } from '@/app/actions';

export default function ProjectDetailsClient({ 
    initialProject, 
    initialBuildings, 
    initialLevels, 
    initialPoints, 
    initialMaterials, 
    initialRevenues,
    initialSubcontracts,
    role 
}: any) {
    const router = useRouter();
    const [project, setProject] = useState(initialProject);
    const [buildings, setBuildings] = useState(initialBuildings);
    const [levels, setLevels] = useState(initialLevels);
    const [points, setPoints] = useState(initialPoints);
    const [materials, setMaterials] = useState(initialMaterials);
    const [revenues, setRevenues] = useState(initialRevenues);
    const [subcontracts] = useState(initialSubcontracts || []);
    
    const [activeTab, setActiveTab] = useState<'overview' | 'billing'>('overview');

    // Modals state
    const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
    const [isAvenantModalOpen, setIsAvenantModalOpen] = useState(false);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

    const [selectedRevId, setSelectedRevId] = useState<string | null>(null);

    // Form states

    const [buildingName, setBuildingName] = useState('');
    const [levelName, setLevelName] = useState('');
    const [avenantAmount, setAvenantAmount] = useState('');
    const [revName, setRevName] = useState('');
    const [revAmount, setRevAmount] = useState('');
    const [revStatus, setRevStatus] = useState('En attente');
    const [revDate, setRevDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const id = project.id;

    async function handleAddBuilding(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const newBuilding = await addBuildingAction(id, buildingName);
            setBuildings([...buildings, newBuilding as any]);
            setIsBuildingModalOpen(false);
            setBuildingName('');
            router.refresh();
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    async function handleAddLevel(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedBuildingId) return;
        try {
            setIsSubmitting(true);
            const newLevel = await addLevelAction(id, selectedBuildingId, levelName);
            setLevels([...levels, newLevel as any]);
            setIsLevelModalOpen(false);
            setLevelName('');
            router.refresh();
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    async function handleAddRevenue(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            if (selectedRevId) {
                const updatedRev = await updateRevenueAction(selectedRevId, id, revName, parseFloat(revAmount) || 0, revStatus, revDate || null);
                setRevenues(revenues.map((r: any) => r.id === selectedRevId ? updatedRev : r));
            } else {
                const newRevenue = await addRevenueAction(id, revName, parseFloat(revAmount) || 0, revStatus, revDate || null);
                setRevenues([newRevenue as any, ...revenues]);
            }
            setIsRevenueModalOpen(false);
            setRevName(''); setRevAmount(''); setRevDate(''); setRevStatus('En attente'); setSelectedRevId(null);
            router.refresh();
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    async function handleUpdateRevenueStatus(revId: string, newStatus: string) {
        try {
            const { error } = await supabase.from('revenues').update({ status: newStatus }).eq('id', revId);
            if (error) throw error;
            setRevenues(revenues.map((r: any) => r.id === revId ? { ...r, status: newStatus } : r));
        } catch (error: any) { alert(error.message); }
    }

    async function handleDeleteRevenue(revId: string) {
        if (!confirm('Supprimer cette facture ?')) return;
        try {
            const { error } = await supabase.from('revenues').delete().eq('id', revId);
            if (error) throw error;
            setRevenues(revenues.filter((r: any) => r.id !== revId));
        } catch (error: any) { alert(error.message); }
    }

    async function handleUpdateGlobalBudget(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { error } = await supabase.from('projects').update({ global_budget: parseFloat(avenantAmount) || 0 }).eq('id', id);
            if (error) throw error;
            setProject({ ...project, global_budget: parseFloat(avenantAmount) || 0 });
            setIsAvenantModalOpen(false);
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    const totalWorkers = points.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_price), 0);
    const totalMaterials = materials.reduce((acc: number, curr: any) => acc + (curr.quantity_used * curr.unit_price), 0);
    const totalSubcontracting = subcontracts.reduce((acc: number, curr: any) => acc + (curr.agreed_amount || 0), 0);
    const totalSubcontractingPaid = subcontracts.reduce((acc: number, curr: any) => acc + (curr.paid_amount || 0), 0);
    const totalCost = totalWorkers + totalMaterials + totalSubcontracting;
    const totalEnkesse = revenues.filter((r: any) => r.status === "Réglée" || r.status === "Payée partiellement").reduce((a: number, b: any) => a + Number(b.amount), 0);
    const profitability = totalEnkesse - totalCost;

    const progressPercentage = project.global_budget > 0 ? Math.min((totalEnkesse / project.global_budget) * 100, 100) : 0;
    const remainingToInvoice = Math.max(project.global_budget - totalEnkesse, 0);

    const handleProjectExport = (type: 'pdf' | 'excel') => {
        if (type === 'excel') {
            const data = buildings.map((b: any) => {
                const bldgLevels = levels.filter((l: any) => l.building_id === b.id);
                return bldgLevels.map((l: any) => {
                    const costWorkers = points.filter((p: any) => p.level_id === l.id).reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_price), 0);
                    const costMats = materials.filter((p: any) => p.level_id === l.id).reduce((acc: number, curr: any) => acc + (curr.quantity_used * curr.unit_price), 0);
                    return { 'Bâtiment': b.name, 'Étage': l.name, 'Coût Ouvriers': costWorkers, 'Coût Matériaux': costMats, 'Total Étage': costWorkers + costMats };
                });
            }).flat();
            exportToExcel(data, `Rapport_Projet_${project.name}`);
        } else {
            const columns = ['Bâtiment', 'Étage', 'Coût Ouvriers', 'Coût Matériaux', 'Total'];
            const rows = buildings.map((b: any) => {
                const bldgLevels = levels.filter((l: any) => l.building_id === b.id);
                return bldgLevels.map((l: any) => {
                    const costWorkers = points.filter((p: any) => p.level_id === l.id).reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_price), 0);
                    const costMats = materials.filter((p: any) => p.level_id === l.id).reduce((acc: number, curr: any) => acc + (curr.quantity_used * curr.unit_price), 0);
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

    return (
        <div className="space-y-10 pb-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-4">
                    <button onClick={() => router.push('/projects')} className="flex items-center gap-1.5 text-stone-400 hover:text-stone-900 transition-all font-bold text-[10px] uppercase tracking-[0.15em]"><ChevronLeft size={14} /> Retour à la liste</button>
                    <div className="space-y-1.5">
                        <h1 className="text-4xl font-black tracking-tight text-stone-900 lowercase">{project.name}</h1>
                        <div className="flex items-center gap-5 text-stone-500 font-bold uppercase text-[10px] tracking-widest pt-1">
                            {project.client_name && <span className="flex items-center gap-1.5 text-stone-900 font-black">Client: {project.client_name}</span>}
                            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-amber-600" /> {project.city}</span>
                            {project.end_date && <span className="flex items-center gap-1.5 opacity-60"><Calendar size={14} /> Fin: {new Date(project.end_date).toLocaleDateString()}</span>}
                        </div>
                    </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white border border-stone-200 p-1.5 rounded-2xl gap-1.5 shadow-sm h-fit">
                        <button onClick={() => handleProjectExport('pdf')} className="flex flex-col items-center justify-center py-2 px-4 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileText size={18} strokeWidth={2.5} /> PDF
                        </button>
                        <button onClick={() => handleProjectExport('excel')} className="flex flex-col items-center justify-center py-2 px-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileSpreadsheet size={18} strokeWidth={2.5} /> EXCEL
                        </button>
                    </div>
                    <button onClick={() => setIsBuildingModalOpen(true)} className="flex items-center gap-2 px-6 py-4 bg-[#c97423] text-white rounded-2xl shadow-md hover:bg-amber-700 transition-all active:scale-95 text-xs font-black uppercase tracking-widest h-fit">
                        <Plus size={18} /> Bloc
                    </button>
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-bold">
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm relative group">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase font-bold text-stone-400 tracking-widest">Budget Initial</p>
                        {role === 'admin' && <button onClick={() => { setAvenantAmount(project.global_budget.toString()); setIsAvenantModalOpen(true); }} className="p-1 px-2 text-[9px] font-black underline uppercase text-[#c97423] hover:bg-amber-50 rounded"><Settings size={12} /></button>}
                    </div>
                    <p className="text-xl font-black text-stone-900 mt-1">{project.global_budget.toLocaleString()} DH</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm"><p className="text-[9px] uppercase text-stone-400">Coût Main d'Œuvre</p><p className="text-xl font-black text-stone-900 mt-1">{totalWorkers.toLocaleString()} DH</p></div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm"><p className="text-[9px] uppercase text-stone-400">Coût Matériaux</p><p className="text-xl font-black text-stone-900 mt-1">{totalMaterials.toLocaleString()} DH</p></div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
                    <p className="text-[9px] uppercase text-stone-400">Coût Sous-Traitance</p>
                    <p className="text-xl font-black text-amber-600 mt-1">{totalSubcontracting.toLocaleString()} DH</p>
                    {subcontracts.length > 0 && (
                        <p className="text-[9px] text-stone-400 font-bold mt-0.5">{subcontracts.length} contrat{subcontracts.length > 1 ? 's' : ''} · payé: {totalSubcontractingPaid.toLocaleString()} DH</p>
                    )}
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm"><p className="text-[9px] uppercase text-stone-400">Coût Réel Total</p><p className="text-xl font-black text-rose-600 mt-1">{totalCost.toLocaleString()} DH</p></div>
                {role === 'admin' && (
                    <div className={cn("p-5 rounded-2xl border shadow-sm flex flex-col justify-center", profitability >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800")}>
                        <p className="text-[9px] uppercase font-bold tracking-widest">Calcul Marge/Trésorerie</p>
                        <p className="text-xl font-black mt-1">{profitability > 0 ? '+' : ''}{profitability.toLocaleString()} DH</p>
                        <p className="text-[8px] font-bold text-current opacity-60 mt-0.5">Encaissé - (Ouvriers + Matériaux + ST)</p>
                    </div>
                )}
            </div>

            <div className="flex gap-6 border-b border-stone-200">
                <button onClick={() => setActiveTab('overview')} className={cn("pb-3.5 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2", activeTab === 'overview' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400")}>Terrain</button>
                {role === 'admin' && <button onClick={() => setActiveTab('billing')} className={cn("pb-3.5 text-sm font-black uppercase transition-all border-b-2 flex items-center gap-2", activeTab === 'billing' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400")}>Finance</button>}
            </div>

            {activeTab === 'overview' ? (
                <div className="space-y-12">
                    {buildings.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl text-center border font-bold text-stone-400 uppercase text-xs">Aucun bâtiment ajouté</div>
                    ) : (
                        buildings.map((bldg: any) => (
                            <section key={bldg.id} className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-stone-900 text-white rounded-xl"><Building2 size={20} /></div>
                                        <h2 className="text-2xl font-black text-stone-900 uppercase">{bldg.name}</h2>
                                    </div>
                                    <button onClick={() => { setSelectedBuildingId(bldg.id); setIsLevelModalOpen(true); }} className="text-[#c97423] font-black uppercase text-[10px] tracking-widest border border-amber-100 px-4 py-2 rounded-xl">Ajouter Étage</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {levels.filter((l: any) => l.building_id === bldg.id).map((lvl: any) => {
                                        const cost = points.filter((p: any) => p.level_id === lvl.id).reduce((a: number, b: any) => a + (b.quantity * b.unit_price), 0) + materials.filter((m: any) => m.level_id === lvl.id).reduce((a: number, b: any) => a + (b.quantity_used * b.unit_price), 0);
                                        return (
                                            <div key={lvl.id} onClick={() => router.push(`/levels/${lvl.id}`)} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm cursor-pointer hover:border-amber-400 transition-all font-bold text-center space-y-2">
                                                <Layers size={20} className="mx-auto text-stone-300" />
                                                <p className="text-stone-900 uppercase text-sm truncate">{lvl.name}</p>
                                                <p className="text-[10px] text-amber-600 font-black">{cost.toLocaleString()} DH</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl border border-stone-100 shadow-sm gap-6">
                        <div className="w-full sm:w-1/2">
                            <h2 className="text-xl font-black uppercase tracking-tight mb-4">Objectif de Facturation</h2>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                <span>TOTAL DEVIS: {project.global_budget.toLocaleString()} DH</span>
                                <span className={remainingToInvoice === 0 ? "text-emerald-500" : "text-[#c97423]"}>{remainingToInvoice === 0 ? "PAYÉ MIEUX" : `RESTE À ENCAISSER: ${remainingToInvoice.toLocaleString()} DH`}</span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-2">
                                <div className={cn("h-2 rounded-full transition-all", remainingToInvoice === 0 ? "bg-emerald-500" : "bg-[#c97423]")} style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                        </div>
                        <button onClick={() => { setSelectedRevId(null); setRevName(''); setRevAmount(''); setRevDate(''); setRevStatus('En attente'); setIsRevenueModalOpen(true); }} className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-700 shadow-md transition-all active:scale-95"><Plus size={16}/> Ajouter Paiement</button>
                    </div>

                    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                        <table className="w-full text-left font-bold text-sm">
                            <thead className="bg-stone-50 border-b text-[9px] uppercase text-stone-400"><tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Montant</th><th className="px-6 py-4">Statut</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-stone-50">
                                {revenues.map((rev: any) => (
                                    <tr key={rev.id}>
                                        <td className="px-6 py-4">{rev.designation}</td>
                                        <td className="px-6 py-4">{Number(rev.amount).toLocaleString()} DH</td>
                                        <td className="px-6 py-4"><span className="text-[10px] uppercase font-black">{rev.status}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setSelectedRevId(rev.id); setRevName(rev.designation); setRevAmount(rev.amount.toString()); setRevDate(rev.payment_date ? rev.payment_date.split('T')[0] : ''); setRevStatus(rev.status); setIsRevenueModalOpen(true); }} className="p-2 bg-amber-50 text-[#c97423] rounded-lg hover:bg-[#c97423] hover:text-white transition-colors shadow-sm cursor-pointer" title="Modifier l'encaissement"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteRevenue(rev.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-colors shadow-sm cursor-pointer" title="Supprimer l'encaissement"><X size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>

                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals are briefly implemented for continuity */}
            <AnimatePresence>
                {isBuildingModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBuildingModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl relative overflow-hidden">
                            <div className="bg-black p-6 flex justify-between text-white uppercase text-xs font-black"><h2>Nouveau Bâtiment</h2><button onClick={() => setIsBuildingModalOpen(false)}><X size={18} /></button></div>
                            <form onSubmit={handleAddBuilding} className="p-6 space-y-4">
                                <input value={buildingName} onChange={e => setBuildingName(e.target.value)} required placeholder="Nom du bloc" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                <button disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-md">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Créer'}</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isLevelModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLevelModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl relative overflow-hidden">
                             <div className="bg-stone-900 p-6 flex justify-between text-white uppercase text-xs font-black"><h2>Nouvel Étage</h2><button onClick={() => setIsLevelModalOpen(false)}><X size={18} /></button></div>
                             <form onSubmit={handleAddLevel} className="p-6 space-y-4">
                                 <input value={levelName} onChange={e => setLevelName(e.target.value)} required placeholder="ex: RDC" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                 <button disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-md">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Enregistrer'}</button>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Revenue */}
            <AnimatePresence>
                {isRevenueModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRevenueModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl relative overflow-hidden">
                             <div className="bg-stone-900 p-6 flex justify-between text-white uppercase text-xs font-black"><h2>{selectedRevId ? 'Modifier l\'encaissement' : 'Nouvel Encaissement'}</h2><button onClick={() => setIsRevenueModalOpen(false)}><X size={18} /></button></div>
                             <form onSubmit={handleAddRevenue} className="p-6 space-y-4">
                                 <input value={revName} onChange={e => setRevName(e.target.value)} required placeholder="Désignation (ex: Avance 1, Facture N°2)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                 <input value={revAmount} onChange={e => setRevAmount(e.target.value)} required type="number" placeholder="Montant (DH)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                 <input value={revDate} onChange={e => setRevDate(e.target.value)} required type="date" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm text-stone-500" />
                                 <select value={revStatus} onChange={e => setRevStatus(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                     <option value="En attente">En attente</option>
                                     <option value="Payée partiellement">Acompte (Payé partiellement)</option>
                                     <option value="Réglée">Réglée</option>
                                 </select>
                                 <button disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-md">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Enregistrer'}</button>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
