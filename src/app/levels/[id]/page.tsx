'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Layers,
    HardHat,
    Package,
    Plus,
    Loader2,
    X,
    CheckCircle2,
    Trash2,
    Image as ImageIcon,
    FileText,
    FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

interface Level {
    id: string;
    name: string;
    building_id: string;
}

interface Worker {
    id: string;
    full_name: string;
    specialty: string;
}

interface DailyPoint {
    id: string;
    worker_id: string;
    quantity: number;
    unit_price: number;
    pointing_date: string;
    worker: Worker;
}

interface Material {
    id: string;
    material_name: string;
    quantity_used: number;
    unit_price: number;
    quantity_wasted: number;
    consumption_date: string;
    receipt_url: string | null;
}

export default function LevelDetailsPage() {
    const { id } = useParams();
    const router = useRouter();

    const [level, setLevel] = useState<Level | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [buildingName, setBuildingName] = useState<string>('');

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [points, setPoints] = useState<DailyPoint[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

    const [loading, setLoading] = useState(true);

    // Modals state
    const [activeTab, setActiveTab] = useState<'workers' | 'materials'>('workers');
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Forms state (Worker Pointing)
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [workQuantity, setWorkQuantity] = useState('1'); // Ex: 1 jour
    const [workPrice, setWorkPrice] = useState(''); // Prix par jour/unité

    // Forms state (Material)
    const [matName, setMatName] = useState('');
    const [matUnit, setMatUnit] = useState('unité');
    const [matPrice, setMatPrice] = useState('');
    const [matUsed, setMatUsed] = useState('');
    const [matWasted, setMatWasted] = useState('0');
    const [matReceiptFile, setMatReceiptFile] = useState<File | null>(null);

    useEffect(() => {
        if (id) fetchLevelData();
    }, [id]);

    async function fetchLevelData() {
        try {
            setLoading(true);

            // 1. Fetch Level and Building Info
            const { data: lvl, error: lvlErr } = await supabase
                .from('levels')
                .select('*, buildings(name, project_id)')
                .eq('id', id)
                .single();

            if (lvlErr) throw lvlErr;
            setLevel(lvl);
            setBuildingName(lvl.buildings?.name || 'Bâtiment');
            setProjectId(lvl.buildings?.project_id);

            // 2. Fetch Workers list for the select dropdown
            const { data: wrkList, error: wrkErr } = await supabase
                .from('workers')
                .select('id, full_name, specialty');
            if (wrkErr) throw wrkErr;
            setWorkers(wrkList || []);

            // 3. Fetch Points for this level
            const { data: ptsList, error: ptsErr } = await supabase
                .from('daily_points')
                .select('id, quantity, unit_price, pointing_date, worker_id, workers(id, full_name, specialty)')
                .eq('level_id', id)
                .order('pointing_date', { ascending: false });
            if (ptsErr) throw ptsErr;

            const formattedPts: DailyPoint[] = (ptsList || []).map(p => ({
                id: p.id,
                worker_id: p.worker_id,
                quantity: p.quantity,
                unit_price: p.unit_price,
                pointing_date: p.pointing_date,
                worker: p.workers as unknown as Worker
            }));
            setPoints(formattedPts);

            // 4. Fetch Materials used in this level
            const { data: matList, error: matErr } = await supabase
                .from('materials')
                .select('*')
                .eq('level_id', id)
                .order('consumption_date', { ascending: false });
            if (matErr) throw matErr;
            setMaterials(matList || []);

        } catch (error: any) {
            console.error('Erreur:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddPoint(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWorkerId) return alert('Veuillez sélectionner un ouvrier');

        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('daily_points')
                .insert([{
                    level_id: id,
                    worker_id: selectedWorkerId,
                    quantity: parseFloat(workQuantity) || 1,
                    unit_price: parseFloat(workPrice) || 0
                }])
                .select('*, workers(id, full_name, specialty)');

            if (error) throw error;

            const newPoint: DailyPoint = {
                id: data[0].id,
                worker_id: data[0].worker_id,
                quantity: data[0].quantity,
                unit_price: data[0].unit_price,
                pointing_date: data[0].pointing_date,
                worker: data[0].workers as unknown as Worker
            };

            setPoints([newPoint, ...points]);
            setIsWorkerModalOpen(false);
            setSelectedWorkerId(''); setWorkQuantity('1'); setWorkPrice('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAddMaterial(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);

            let receipt_url = null;
            if (matReceiptFile) {
                const fileExt = matReceiptFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, matReceiptFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receipt_url = publicUrlData.publicUrl;
            }

            const { data, error } = await supabase
                .from('materials')
                .insert([{
                    material_name: `${matName} | ${matUnit}`,
                    unit_price: parseFloat(matPrice) || 0,
                    quantity_used: parseFloat(matUsed) || 0,
                    quantity_wasted: parseFloat(matWasted) || 0,
                    level_id: id,
                    receipt_url
                }])
                .select();

            if (error) throw error;
            setMaterials([data[0], ...materials]);
            setIsMaterialModalOpen(false);
            setMatName(''); setMatUnit('unité'); setMatPrice(''); setMatUsed(''); setMatWasted('0'); setMatReceiptFile(null);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }



    const handleLevelExport = (type: 'pdf' | 'excel') => {
        if (!level) return;

        if (type === 'excel') {
            // On peut faire deux feuilles ou une liste plate. Faisons une liste plate pour simplifier.
            const workerData = points.map(p => ({
                'Type': 'Main d\'œuvre',
                'Désignation': p.worker?.full_name,
                'Date': new Date(p.pointing_date).toLocaleDateString(),
                'Qté/Jours': p.quantity,
                'Prix U.': p.unit_price,
                'Total': p.quantity * p.unit_price
            }));
            const materialData = materials.map(m => ({
                'Type': 'Matériau',
                'Désignation': m.material_name,
                'Date': new Date(m.consumption_date).toLocaleDateString(),
                'Qté': m.quantity_used,
                'Prix U.': m.unit_price,
                'Total': m.quantity_used * m.unit_price
            }));
            exportToExcel([...workerData, ...materialData], `Rapport_Etage_${level.name}`);
        } else {
            const columns = ['Type', 'Désignation', 'Date', 'Qté', 'Total'];
            const rows = [
                ...points.map(p => ['Ouvrier', p.worker?.full_name, new Date(p.pointing_date).toLocaleDateString(), p.quantity, (p.quantity * p.unit_price) + ' DH']),
                ...materials.map(m => ['Matériau', m.material_name, new Date(m.consumption_date).toLocaleDateString(), m.quantity_used, (m.quantity_used * m.unit_price) + ' DH'])
            ];

            const summary = [
                { label: 'Total Main d\'œuvre', value: totalWorkersCost.toLocaleString() + ' DH' },
                { label: 'Total Matériaux', value: totalMaterialsCost.toLocaleString() + ' DH' },
                { label: 'Total Engagé Étage', value: (totalWorkersCost + totalMaterialsCost).toLocaleString() + ' DH' }
            ];

            exportToPDF(`Rapport Étage: ${level.name} (${buildingName})`, columns, rows, `Rapport_Etage_${level.name}`, summary);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
        </div>
    );

    if (!level) return <div>Étage introuvable</div>;

    const totalWorkersCost = points.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
    const totalMaterialsCost = materials.reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-4">
                    <button
                        onClick={() => router.push(projectId ? `/projects/${projectId}` : '/projects')}
                        className="flex items-center gap-1.5 text-stone-400 hover:text-stone-900 transition-all font-bold text-[10px] uppercase tracking-[0.15em]"
                    >
                        <ChevronLeft size={14} /> Retour au Bâtiment
                    </button>

                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <div className="bg-stone-100 p-1.5 rounded-lg text-stone-400">
                                <Layers size={20} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-stone-900">{level.name}</h1>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 pl-1">
                            <span>{buildingName}</span>
                            <span className="w-1 h-1 rounded-full bg-stone-300" />
                            <span className="text-[#c97423]">Suivi Actif</span>
                        </div>
                    </div>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-stone-200 h-fit self-end mb-2 gap-1">
                    <button onClick={() => handleLevelExport('pdf')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-50 flex items-center gap-1.5">
                        <FileText size={12} /> PDF
                    </button>
                    <button onClick={() => handleLevelExport('excel')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-50 flex items-center gap-1.5">
                        <FileSpreadsheet size={12} /> EXCEL
                    </button>
                </div>
            </div>

            {/* Tabs / Menu Dépenses */}
            <div className="flex gap-4 border-b border-stone-200">
                <button
                    onClick={() => setActiveTab('workers')}
                    className={cn(
                        "pb-3.5 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex gap-2 items-center",
                        activeTab === 'workers' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600"
                    )}
                >
                    <HardHat size={18} />
                    Main d'Œuvre
                    <span className={cn("ml-2 px-2 py-0.5 rounded-full text-[9px]", activeTab === 'workers' ? 'bg-amber-100' : 'bg-stone-100')}>
                        {totalWorkersCost.toLocaleString()} DH
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('materials')}
                    className={cn(
                        "pb-3.5 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex gap-2 items-center",
                        activeTab === 'materials' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600"
                    )}
                >
                    <Package size={18} />
                    Matériaux
                    <span className={cn("ml-2 px-2 py-0.5 rounded-full text-[9px]", activeTab === 'materials' ? 'bg-amber-100' : 'bg-stone-100')}>
                        {totalMaterialsCost.toLocaleString()} DH
                    </span>
                </button>
            </div>

            {/* TABS CONTENT */}
            {activeTab === 'workers' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-stone-900 uppercase">Pointages Journaliers</h2>
                        <button onClick={() => setIsWorkerModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#18181b] text-white rounded-xl shadow-sm hover:bg-stone-800 transition-all text-xs font-bold uppercase tracking-widest">
                            <Plus size={16} /> Ajouter Pointage
                        </button>
                    </div>

                    {points.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl text-center border border-stone-100 shadow-sm">
                            <HardHat className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                            <p className="text-stone-400 font-bold text-sm">Aucun pointage d'ouvrier sur cet étage.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 border-b border-stone-100 text-[9px] font-black uppercase tracking-widest text-stone-400">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Ouvrier</th>
                                        <th className="px-6 py-4">Pointage</th>
                                        <th className="px-6 py-4">Rémunération</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {points.map((pt) => (
                                        <tr key={pt.id} className="hover:bg-stone-50/50 transition-colors">
                                            <td className="px-6 py-4 text-[11px] font-bold text-stone-500">
                                                {new Date(pt.pointing_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-stone-900 text-sm">{pt.worker?.full_name || 'Inconnu'}</div>
                                                <div className="text-[9px] font-black text-[#c97423] uppercase tracking-widest">{pt.worker?.specialty || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-stone-900">{pt.quantity} <span className="text-[9px] text-stone-400 uppercase">jour(s)/unité</span></span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-black rounded-lg border border-stone-200">
                                                    {(pt.quantity * pt.unit_price).toLocaleString()} DH
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'materials' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-stone-900 uppercase">Consommation Matériaux</h2>
                        <button onClick={() => setIsMaterialModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#c97423] text-white rounded-xl shadow-sm hover:bg-amber-700 transition-all text-xs font-bold uppercase tracking-widest">
                            <Plus size={16} /> Ajouter Consommation
                        </button>
                    </div>

                    {materials.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl text-center border border-stone-100 shadow-sm">
                            <Package className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                            <p className="text-stone-400 font-bold text-sm">Aucun matériau enregistré sur cet étage.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50 border-b border-stone-100 text-[9px] font-black uppercase tracking-widest text-stone-400">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Matériau</th>
                                        <th className="px-6 py-4">Quantité</th>
                                        <th className="px-6 py-4">Coût</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {materials.map((mat) => {
                                        const nameParts = mat.material_name.split(' | ');
                                        const displayMatName = nameParts[0];
                                        const displayUnit = nameParts[1] || 'unité';

                                        return (
                                            <tr key={mat.id} className="hover:bg-stone-50/50 transition-colors">
                                                <td className="px-6 py-4 text-[11px] font-bold text-stone-500">
                                                    {new Date(mat.consumption_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-stone-900 text-sm">{displayMatName}</div>
                                                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{mat.unit_price} DH / {displayUnit}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-stone-900">{mat.quantity_used} <span className="text-[9px] text-stone-400 font-bold uppercase">{displayUnit}(s)</span></span>
                                                        {mat.quantity_wasted > 0 && (
                                                            <span className="text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 mt-1 px-1 py-0.5 rounded w-fit border border-red-100">
                                                                +{mat.quantity_wasted} gaspillé
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1.5 bg-amber-50 text-[#c97423] text-xs font-black rounded-lg border border-amber-100">
                                                        {(mat.quantity_used * mat.unit_price).toLocaleString()} DH
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {mat.receipt_url && (
                                                            <a href={mat.receipt_url} target="_blank" rel="noreferrer" className="p-2 text-stone-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Voir le justificatif">
                                                                <ImageIcon size={16} />
                                                            </a>
                                                        )}
                                                        <button className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* MODAL WORKER POINTING */}
            <AnimatePresence>
                {isWorkerModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsWorkerModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-[#18181b] p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Pointage Ouvrier</h2>
                                <button onClick={() => setIsWorkerModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddPoint} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Sélection Ouvrier</label>
                                    <select required value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-sm">
                                        <option value="">-- Choisir un ouvrier --</option>
                                        {workers.map(w => (
                                            <option key={w.id} value={w.id}>{w.full_name} ({w.specialty})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Quantité / Jours</label>
                                        <input required type="number" step="0.5" value={workQuantity} onChange={e => setWorkQuantity(e.target.value)} min="0" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Tarif unitaire (DH)</label>
                                        <input required type="number" value={workPrice} onChange={e => setWorkPrice(e.target.value)} min="0" placeholder="0" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                </div>
                                <button disabled={isSubmitting} type="submit" className="w-full py-3 bg-[#c97423] text-white font-bold rounded-xl text-xs uppercase tracking-widest flex justify-center mt-2 shadow-md">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL MATERIALS */}
            <AnimatePresence>
                {isMaterialModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMaterialModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-[#18181b] p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Saisie Matériaux</h2>
                                <button onClick={() => setIsMaterialModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddMaterial} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Matériau</label>
                                        <input required value={matName} onChange={e => setMatName(e.target.value)} placeholder="ex: Béton B25" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Unité</label>
                                        <select required value={matUnit} onChange={e => setMatUnit(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 transition-all text-sm">
                                            <option value="unité">Unité / Pièce</option>
                                            <option value="kg">Kilogramme (kg)</option>
                                            <option value="Tonne">Tonne (t)</option>
                                            <option value="L">Litre (L)</option>
                                            <option value="Sac">Sac</option>
                                            <option value="Boîte">Boîte / Box</option>
                                            <option value="m²">Mètre carré (m²)</option>
                                            <option value="m³">Mètre cube (m³)</option>
                                            <option value="ml">Mètre linéaire (ml)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Prix U. (DH)</label>
                                        <input required type="number" value={matPrice} onChange={e => setMatPrice(e.target.value)} min="0" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Qté Utilisée</label>
                                        <input required type="number" value={matUsed} onChange={e => setMatUsed(e.target.value)} min="0" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">Gaspillage (optionnel)</label>
                                    <input type="number" value={matWasted} onChange={e => setMatWasted(e.target.value)} min="0" className="w-full px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 outline-none font-bold text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Photo / Reçu</label>
                                    <input type="file" accept="image/*,.pdf" onChange={e => setMatReceiptFile(e.target.files?.[0] || null)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200" />
                                </div>
                                <button disabled={isSubmitting} type="submit" className="w-full py-3 bg-[#c97423] text-white font-bold rounded-xl text-xs uppercase tracking-widest flex justify-center mt-2 shadow-md">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
