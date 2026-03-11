'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Plus,
    Search,
    Loader2,
    X,
    Hammer,
    Banknote,
    Trash2,
    Calendar,
    AlertCircle,
    TrendingDown,
    ChevronRight,
    CheckCircle2,
    Image as ImageIcon,
    FileText,
    FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

interface Material {
    id: string;
    material_name: string;
    quantity_used: number;
    unit_price: number;
    quantity_wasted: number;
    quantity_left: number;
    remarks: string;
    consumption_date: string;
    receipt_url: string | null;
}

export default function MaterialsPage() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Formulaire
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('unité');
    const [price, setPrice] = useState('');
    const [used, setUsed] = useState('');
    const [wasted, setWasted] = useState('0');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Nouveaux états pour le choix du lieu
    const [projects, setProjects] = useState<any[]>([]);
    const [allLevels, setAllLevels] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedLevelId, setSelectedLevelId] = useState('');

    const handleExport = (format: 'pdf' | 'excel') => {
        const columns = ['Date', 'Matériau', 'Quantité', 'Prix Unitaire', 'Total'];
        const rows = materials.map(m => [
            new Date(m.consumption_date).toLocaleDateString(),
            m.material_name,
            m.quantity_used,
            m.unit_price.toLocaleString() + ' DH',
            (m.quantity_used * m.unit_price).toLocaleString() + ' DH'
        ]);

        if (format === 'excel') {
            const data = materials.map(m => ({
                Date: new Date(m.consumption_date).toLocaleDateString(),
                Matériau: m.material_name,
                Quantité: m.quantity_used,
                'Prix Unitaire': m.unit_price,
                Total: m.quantity_used * m.unit_price
            }));
            exportToExcel(data, 'Inventaire_Materiaux');
        } else {
            const totalCost = materials.reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);
            const summary = [
                { label: 'Total Logs', value: materials.length.toString() },
                { label: 'Dépense Totale', value: totalCost.toLocaleString() + ' DH' }
            ];
            exportToPDF('Inventaire Global des Matériaux', columns, rows, 'Inventaire_Materiaux', summary);
        }
    };

    useEffect(() => {
        fetchMaterials();
        fetchProjectsAndLevels();
    }, []);

    async function fetchProjectsAndLevels() {
        // Charger les projets
        const { data: projs } = await supabase.from('projects').select('id, name');
        setProjects(projs || []);

        // Charger tous les étages avec leur bâtiment et projet pour le filtrage
        const { data: lvls } = await supabase
            .from('levels')
            .select('id, name, building_id, buildings(name, project_id)');
        setAllLevels(lvls || []);
    }

    async function fetchMaterials() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .order('consumption_date', { ascending: false });

            if (error) throw error;
            setMaterials(data || []);
        } catch (error: any) {
            console.error('Erreur:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMaterial(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedLevelId) {
            alert("Veuillez sélectionner un étage pour ce matériau.");
            return;
        }

        try {
            setIsSubmitting(true);

            let receipt_url = null;
            if (receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, receiptFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receipt_url = publicUrlData.publicUrl;
            }

            const { data, error } = await supabase
                .from('materials')
                .insert([{
                    material_name: `${name} | ${unit}`,
                    unit_price: parseFloat(price) || 0,
                    quantity_used: parseFloat(used) || 0,
                    quantity_wasted: parseFloat(wasted) || 0,
                    level_id: selectedLevelId,
                    receipt_url
                }])
                .select();

            if (error) throw error;

            setMaterials([...(data || []), ...materials]);
            setIsModalOpen(false);
            setName(''); setUnit('unité'); setPrice(''); setUsed(''); setWasted('0'); setReceiptFile(null);
            setSelectedProjectId(''); setSelectedLevelId('');
        } catch (error: any) {
            alert('Erreur: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredMaterials = materials.filter(m =>
        m.material_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCost = materials.reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Journal Matériaux</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Suivez les consommations et optimisez vos coûts.</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[9px] uppercase font-bold text-stone-400 tracking-widest leading-none">Dépense Totale</span>
                        <span className="text-xl font-black text-[#c97423]">{totalCost.toLocaleString()} DH</span>
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-stone-200 gap-1 h-fit">
                        <button onClick={() => handleExport('pdf')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-50 flex items-center gap-1.5">
                            <FileText size={12} /> PDF
                        </button>
                        <button onClick={() => handleExport('excel')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 flex items-center gap-1.5">
                            <FileSpreadsheet size={12} /> EXCEL
                        </button>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-full shadow-md hover:bg-amber-700 transition-all active:scale-95 group text-sm font-bold"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span className="uppercase tracking-wide">Nouvelle Entrée</span>
                    </button>
                </div>
            </div>

            {/* Stats Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { label: 'Entrées Stock', value: `${materials.length} logs`, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Gaspillage Moyen', value: `${materials.length > 0 ? (materials.reduce((a, b) => a + b.quantity_wasted, 0) / materials.length).toFixed(1) : 0} unités`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Dernière Activité', value: "Aujourd'hui", icon: Calendar, color: 'text-stone-500', bg: 'bg-stone-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4.5 rounded-2xl flex items-center gap-4 border border-stone-100 shadow-sm">
                        <div className={cn("p-3 rounded-xl", stat.bg)}>
                            <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-lg font-black text-stone-900 leading-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Barre de recherche */}
            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
                <input
                    type="text"
                    placeholder="Filtrer les matériaux (Ciment, Acier...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-medium text-sm"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px]">Inventaire Cloud...</p>
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="bg-white p-16 rounded-[2rem] text-center space-y-4 border border-stone-100 shadow-sm">
                    <div className="bg-stone-50 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-stone-300">
                        <Hammer size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-stone-900">Aucune consommation</h3>
                        <p className="text-stone-400 text-xs font-medium max-w-xs mx-auto">Enregistrez vos premières entrées.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50/50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Date</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Matériau</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Consommation</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Coût Total</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filteredMaterials.map((material, i) => {
                                    const nameParts = material.material_name.split(' | ');
                                    const displayMatName = nameParts[0];
                                    const displayUnit = nameParts[1] || 'unité';

                                    return (
                                        <motion.tr
                                            key={material.id}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="group hover:bg-stone-50/40 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-bold text-stone-400">
                                                    {new Date(material.consumption_date).toLocaleDateString('fr-FR')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="p-2.5 bg-stone-100 rounded-xl text-stone-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                                        <Package size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-stone-900 text-base group-hover:text-[#c97423] transition-colors leading-tight">{displayMatName}</div>
                                                        <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{material.unit_price.toLocaleString()} DH / {displayUnit}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-stone-900">{material.quantity_used} <span className="text-[10px] text-stone-400 font-bold uppercase">{displayUnit}(s)</span></span>
                                                    {material.quantity_wasted > 0 && (
                                                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded-md w-fit mt-1 border border-red-100">
                                                            +{material.quantity_wasted} gaspillé
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1.5 bg-amber-50 text-[#c97423] text-xs font-black rounded-lg border border-amber-100">
                                                    {(material.quantity_used * material.unit_price).toLocaleString()} DH
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2 text-stone-300">
                                                {material.receipt_url && (
                                                    <a href={material.receipt_url} target="_blank" rel="noreferrer" className="p-2 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Voir le justificatif">
                                                        <ImageIcon size={16} />
                                                    </a>
                                                )}
                                                <button className="p-2 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-[#18181b] p-6 flex justify-between items-center text-white">
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-black uppercase tracking-tight">Nouvelle Saisie</h2>
                                    <p className="text-stone-400 text-[9px] font-black uppercase tracking-widest">Matériaux & Consommation</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleAddMaterial} className="p-7 space-y-4">
                                {/* SELECTION DU LIEU */}
                                <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Choix du Projet</label>
                                        <select required value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setSelectedLevelId(''); }}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-xs">
                                            <option value="">-- Projet --</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Choix de l'Étage</label>
                                        <select required disabled={!selectedProjectId} value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 font-bold text-stone-900 text-xs disabled:opacity-50">
                                            <option value="">-- Étage --</option>
                                            {allLevels
                                                .filter(l => l.buildings?.project_id === selectedProjectId)
                                                .map(l => (
                                                    <option key={l.id} value={l.id}>{l.buildings?.name} - {l.name}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Désignation</label>
                                        <input required value={name} onChange={e => setName(e.target.value)} placeholder="ex: Ciment CPJ45"
                                            className="w-full px-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Unité</label>
                                        <select required value={unit} onChange={e => setUnit(e.target.value)}
                                            className="w-full px-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm">
                                            <option value="unité">Unité / Pièce</option>
                                            <option value="kg">Kilogramme (kg)</option>
                                            <option value="Tonne">Tonne (t)</option>
                                            <option value="L">Litre (L)</option>
                                            <option value="Sac">Sac</option>
                                            <option value="Boîte">Boîte / Box</option>
                                            <option value="m²">Mètre carré (m²)</option>
                                            <option value="m³">Mètre cube (m³)</option>
                                            <option value="ml">Mètre linéaire (ml)</option>
                                            <option value="Voyage">Voyage / Camion</option>
                                            <option value="Jour">Jour (Location)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Prix Unitaire (DH)</label>
                                        <input required type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                                            className="w-full px-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Qté Utilisée</label>
                                        <input required type="number" value={used} onChange={e => setUsed(e.target.value)} placeholder="0"
                                            className="w-full px-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1 text-red-500">Pertes</label>
                                        <input type="number" value={wasted} onChange={e => setWasted(e.target.value)} placeholder="0"
                                            className="w-full px-5 py-3 rounded-xl bg-red-50/50 border border-red-100 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-red-600 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1 text-emerald-600">Reçu/Photo</label>
                                        <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                                            className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 outline-none text-[10px] font-bold text-stone-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-700" />
                                    </div>
                                </div>

                                <button disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all text-xs tracking-widest uppercase shadow-md mt-4">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle2 size={18} /> enregistrer l'entrée</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
