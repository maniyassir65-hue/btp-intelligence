'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Plus,
    Search,
    Loader2,
    X,
    Hammer,
    Trash2,
    Calendar,
    TrendingDown,
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

export default function MaterialsClient({ 
    initialMaterials, 
    initialProjects, 
    initialLevels 
}: { 
    initialMaterials: Material[], 
    initialProjects: any[], 
    initialLevels: any[] 
}) {
    const [materials, setMaterials] = useState<Material[]>(initialMaterials);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('unité');
    const [price, setPrice] = useState('');
    const [used, setUsed] = useState('');
    const [wasted, setWasted] = useState('0');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
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

    async function handleAddMaterial(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            let receipt_url = null;
            if (receiptFile) {
                const fileName = `${Math.random()}.${receiptFile.name.split('.').pop()}`;
                await supabase.storage.from('receipts').upload(fileName, receiptFile);
                receipt_url = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
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
            setMaterials([data[0], ...materials]);
            setIsModalOpen(false);
            setName(''); setUnit('unité'); setPrice(''); setUsed(''); setWasted('0'); setReceiptFile(null);
            setSelectedProjectId(''); setSelectedLevelId('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredMaterials = materials.filter(m => m.material_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalCost = materials.reduce((acc, curr) => acc + (curr.quantity_used * curr.unit_price), 0);

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Journal Matériaux</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Suivez les consommations et optimisez vos coûts.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex flex-col items-end mr-2">
                        <span className="text-[9px] uppercase font-bold text-stone-400 tracking-widest leading-none">Dépense Totale</span>
                        <span className="text-xl font-black text-[#c97423]">{totalCost.toLocaleString()} DH</span>
                    </div>
                    <div className="flex bg-white border border-stone-200 p-1.5 rounded-2xl gap-1.5 shadow-sm">
                        <button onClick={() => handleExport('pdf')} className="flex flex-col items-center justify-center py-2 px-4 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileText size={18} strokeWidth={2.5} /> PDF
                        </button>
                        <button onClick={() => handleExport('excel')} className="flex flex-col items-center justify-center py-2 px-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileSpreadsheet size={18} strokeWidth={2.5} /> EXCEL
                        </button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-4 bg-[#c97423] text-white rounded-2xl shadow-md hover:bg-amber-700 transition-all active:scale-95 text-xs font-black uppercase tracking-widest">
                        <Plus size={18} /> Nouvelle Entrée
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-4.5 rounded-2xl flex items-center gap-4 border border-stone-100 shadow-sm">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Package size={20} /></div>
                    <div><p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Entrées Stock</p><p className="text-lg font-black text-stone-900">{materials.length} logs</p></div>
                </div>
                <div className="bg-white p-4.5 rounded-2xl flex items-center gap-4 border border-stone-100 shadow-sm">
                    <div className="p-3 bg-red-50 rounded-xl text-red-600"><TrendingDown size={20} /></div>
                    <div><p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Gaspillage Moyen</p><p className="text-lg font-black text-stone-900">{materials.length > 0 ? (materials.reduce((a, b) => a + b.quantity_wasted, 0) / materials.length).toFixed(1) : 0} unités</p></div>
                </div>
                <div className="bg-white p-4.5 rounded-2xl flex items-center gap-4 border border-stone-100 shadow-sm">
                    <div className="p-3 bg-stone-50 rounded-xl text-stone-500"><Calendar size={20} /></div>
                    <div><p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Dernière Activité</p><p className="text-lg font-black text-stone-900">Aujourd'hui</p></div>
                </div>
            </div>

            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                <input type="text" placeholder="Rechercher un matériau..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 outline-none font-medium text-sm" />
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-stone-50/50 border-b border-stone-100 text-[9px] font-black uppercase text-stone-400 tracking-widest">
                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Matériau</th><th className="px-6 py-4">Consommation</th><th className="px-6 py-4">Coût Total</th><th className="px-6 py-4"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 font-bold text-stone-900">
                        {filteredMaterials.map(m => (
                            <tr key={m.id} className="hover:bg-stone-50/40 transition-colors">
                                <td className="px-6 py-4 text-[11px] text-stone-400">{new Date(m.consumption_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-stone-100 rounded-lg"><Package size={16} /></div>
                                        <div><div className="text-sm">{m.material_name.split(' | ')[0]}</div><div className="text-[9px] text-stone-400 uppercase">{m.unit_price} DH / {m.material_name.split(' | ')[1]}</div></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm">{m.quantity_used}</td>
                                <td className="px-6 py-4"><span className="text-xs bg-amber-50 text-[#c97423] p-1.5 rounded-lg">{(m.quantity_used * m.unit_price).toLocaleString()} DH</span></td>
                                <td className="px-6 py-4 text-right">
                                    {m.receipt_url && <a href={m.receipt_url} target="_blank" className="p-2 text-stone-300 hover:text-emerald-500"><ImageIcon size={16} /></a>}
                                    <button className="p-2 text-stone-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal simplified for brevity but complete logic */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-black p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase">Nouvelle Entrée</h2>
                                <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddMaterial} className="p-7 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <select required value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-xs outline-none">
                                        <option value="">Sélectionner le Projet</option>
                                        {initialProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <select required value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-xs outline-none" disabled={!selectedProjectId}>
                                        <option value="">Sélectionner l'Étage</option>
                                        {initialLevels.filter(l => l.buildings?.project_id === selectedProjectId).map(l => <option key={l.id} value={l.id}>{l.buildings?.name} - {l.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nom du Matériau" className="col-span-2 p-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-sm outline-none" />
                                    <select required value={unit} onChange={e => setUnit(e.target.value)} className="col-span-1 p-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-sm outline-none">
                                        <option value="unité">Unité</option>
                                        <option value="m²">Mètre carré (m²)</option>
                                        <option value="m³">Mètre cube (m³)</option>
                                        <option value="mL">Mètre linéaire</option>
                                        <option value="kg">Kilogramme (Kg)</option>
                                        <option value="tonne">Tonne</option>
                                        <option value="sac">Sac</option>
                                        <option value="litre">Litre (L)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Prix Unitaire (DH)" className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-sm outline-none" />
                                    <input required type="number" step="0.01" value={used} onChange={e => setUsed(e.target.value)} placeholder="Quantité consommée" className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl font-bold text-sm outline-none" />
                                </div>
                                <label className="flex flex-col items-center justify-center gap-2 p-5 bg-stone-50/50 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-all text-center">
                                    <ImageIcon size={24} className={receiptFile ? "text-emerald-500" : "text-stone-300"} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                        {receiptFile ? receiptFile.name : 'Joindre une photo ou facture (Optionnel)'}
                                    </span>
                                    <input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,.pdf" />
                                </label>
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black rounded-xl uppercase tracking-widest text-xs flex justify-center items-center gap-2 shadow-lg">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={18} /> Enregistrer</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
