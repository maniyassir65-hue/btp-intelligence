'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { addDailyPointAction, addMaterialAction } from '@/app/actions';

export default function LevelDetailsClient({ 
    initialLevel, 
    initialWorkers, 
    initialPoints, 
    initialMaterials,
    initialBuildingName,
    initialProjectId
}: any) {
    const router = useRouter();
    const [level, setLevel] = useState(initialLevel);
    const [workers, setWorkers] = useState(initialWorkers);
    const [points, setPoints] = useState(initialPoints);
    const [materials, setMaterials] = useState(initialMaterials);
    
    const [activeTab, setActiveTab] = useState<'workers' | 'materials'>('workers');
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [workQuantity, setWorkQuantity] = useState('1');
    const [matName, setMatName] = useState('');
    const [matUnit, setMatUnit] = useState('unité');
    const [matPrice, setMatPrice] = useState('');
    const [matUsed, setMatUsed] = useState('');
    const [matWasted, setMatWasted] = useState('0');
    const [matReceiptFile, setMatReceiptFile] = useState<File | null>(null);

    const id = level.id;

    async function handleAddPoint(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWorkerId) return alert('Veuillez sélectionner un ouvrier');
        try {
            setIsSubmitting(true);
            const worker = workers.find((w: any) => w.id === selectedWorkerId);
            const newPoint = await addDailyPointAction(initialProjectId, id, selectedWorkerId, parseFloat(workQuantity) || 1, worker?.daily_rate || 0);
            setPoints([{ ...(newPoint as any), worker, pointing_date: new Date().toISOString() }, ...points]);
            setIsWorkerModalOpen(false);
            router.refresh();
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    async function handleAddMaterial(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            let receipt_url = null;
            if (matReceiptFile) {
                const fileName = `${Math.random()}.${matReceiptFile.name.split('.').pop()}`;
                await supabase.storage.from('receipts').upload(fileName, matReceiptFile);
                receipt_url = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
            }
            const newMat = await addMaterialAction(initialProjectId, id, `${matName} | ${matUnit}`, parseFloat(matPrice) || 0, parseFloat(matUsed) || 0, parseFloat(matWasted) || 0, receipt_url);
            setMaterials([{ ...(newMat as any), consumption_date: new Date().toISOString() }, ...materials]);
            setIsMaterialModalOpen(false);
            router.refresh();
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    const totalWorkersCost = points.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_price), 0);
    const totalMaterialsCost = materials.reduce((acc: number, curr: any) => acc + (curr.quantity_used * curr.unit_price), 0);

    const handleLevelExport = (type: 'pdf' | 'excel') => {
        if (type === 'excel') {
            const data = [
                ...points.map((p: any) => ({ 'Type': 'Main d\'œuvre', 'Désignation': p.worker?.full_name, 'Date': new Date(p.pointing_date).toLocaleDateString(), 'Qté': p.quantity, 'P.U': p.unit_price, 'Total': p.quantity * p.unit_price })),
                ...materials.map((m: any) => ({ 'Type': 'Matériau', 'Désignation': m.material_name, 'Date': new Date(m.consumption_date).toLocaleDateString(), 'Qté': m.quantity_used, 'P.U': m.unit_price, 'Total': m.quantity_used * m.unit_price }))
            ];
            exportToExcel(data, `Rapport_Etage_${level.name}`);
        } else {
            const columns = ['Type', 'Désignation', 'Date', 'Qté', 'Total'];
            const rows = [
                ...points.map((p: any) => ['Ouvrier', p.worker?.full_name, new Date(p.pointing_date).toLocaleDateString(), p.quantity, (p.quantity * p.unit_price).toLocaleString() + ' DH']),
                ...materials.map((m: any) => ['Matériau', m.material_name, new Date(m.consumption_date).toLocaleDateString(), m.quantity_used, (m.quantity_used * m.unit_price).toLocaleString() + ' DH'])
            ];
            const summary = [{ label: 'Main d\'œuvre', value: totalWorkersCost.toLocaleString() + ' DH' }, { label: 'Matériaux', value: totalMaterialsCost.toLocaleString() + ' DH' }, { label: 'TOTAL ÉTAGE', value: (totalWorkersCost + totalMaterialsCost).toLocaleString() + ' DH' }];
            exportToPDF(`Rapport Étage: ${level.name}`, columns, rows, `Rapport_Etage_${level.name}`, summary);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-4">
                    <button onClick={() => router.push(`/projects/${initialProjectId}`)} className="flex items-center gap-1.5 text-stone-400 hover:text-stone-900 transition-all font-bold text-[10px] uppercase tracking-widest"><ChevronLeft size={14} /> Retour au Projet</button>
                    <div>
                        <div className="flex items-center gap-2"><Layers size={24} className="text-stone-400" /><h1 className="text-3xl font-black text-stone-900 uppercase">{level.name}</h1></div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mt-1">{initialBuildingName} • Suivi de chantier</p>
                    </div>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-stone-200 h-fit gap-1 shadow-sm">
                    <button onClick={() => handleLevelExport('pdf')} className="px-3 py-1.5 text-[10px] font-black uppercase text-red-600 bg-red-50 rounded-lg"><FileText size={12} /> PDF</button>
                    <button onClick={() => handleLevelExport('excel')} className="px-3 py-1.5 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 rounded-lg"><FileSpreadsheet size={12} /> Excel</button>
                </div>
            </div>

            <div className="flex gap-6 border-b border-stone-200">
                <button onClick={() => setActiveTab('workers')} className={cn("pb-3.5 text-sm font-black uppercase transition-all border-b-2", activeTab === 'workers' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400")}>Main d'œuvre ({totalWorkersCost.toLocaleString()} DH)</button>
                <button onClick={() => setActiveTab('materials')} className={cn("pb-3.5 text-sm font-black uppercase transition-all border-b-2", activeTab === 'materials' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400")}>Matériaux ({totalMaterialsCost.toLocaleString()} DH)</button>
            </div>

            {activeTab === 'workers' ? (
                <div className="space-y-5">
                    <div className="flex justify-between items-center"><h2 className="text-xl font-black text-stone-900 uppercase">Pointage Quotidien</h2><button onClick={() => setIsWorkerModalOpen(true)} className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-black uppercase shadow-lg"><Plus size={16} className="inline mr-2" /> Pointer</button></div>
                    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                        <table className="w-full text-left font-bold text-sm">
                            <thead className="bg-stone-50 border-b text-[9px] uppercase text-stone-400 tracking-widest"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Jours</th><th className="px-6 py-4 text-right">Montant</th></tr></thead>
                            <tbody className="divide-y divide-stone-50">
                                {points.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-stone-50/50">
                                        <td className="px-6 py-4 text-stone-400 font-medium">{new Date(p.pointing_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4"><div>{p.worker?.full_name}</div><div className="text-[9px] text-[#c97423] uppercase">{p.worker?.specialty}</div></td>
                                        <td className="px-6 py-4">{p.quantity} j</td>
                                        <td className="px-6 py-4 text-right font-black text-stone-900">{(p.quantity * p.unit_price).toLocaleString()} DH</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                 <div className="space-y-5">
                    <div className="flex justify-between items-center"><h2 className="text-xl font-black text-stone-900 uppercase">Consommation</h2><button onClick={() => setIsMaterialModalOpen(true)} className="px-5 py-2.5 bg-[#c97423] text-white rounded-xl text-xs font-black uppercase shadow-lg"><Plus size={16} className="inline mr-2" /> Matériau</button></div>
                    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                        <table className="w-full text-left font-bold text-sm">
                            <thead className="bg-stone-50 border-b text-[9px] uppercase text-stone-400 tracking-widest"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Matériau</th><th className="px-6 py-4">Quantité</th><th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4"></th></tr></thead>
                            <tbody className="divide-y divide-stone-50">
                                {materials.map((m: any) => (
                                    <tr key={m.id} className="hover:bg-stone-50/50">
                                        <td className="px-6 py-4 text-stone-400">{new Date(m.consumption_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{m.material_name.split(' | ')[0]}</td>
                                        <td className="px-6 py-4">{m.quantity_used} <span className="text-[10px] uppercase opacity-50">{m.material_name.split(' | ')[1]}</span></td>
                                        <td className="px-6 py-4 text-right font-black">{(m.quantity_used * m.unit_price).toLocaleString()} DH</td>
                                        <td className="px-6 py-4 text-right">{m.receipt_url && <a href={m.receipt_url} target="_blank" className="text-amber-600"><ImageIcon size={14} /></a>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Pointage */}
            <AnimatePresence>
                {isWorkerModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsWorkerModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl relative overflow-hidden">
                             <div className="bg-black p-6 flex justify-between text-white uppercase text-xs font-black"><h2>Pointer un ouvrier</h2><button onClick={() => setIsWorkerModalOpen(false)}><X size={18} /></button></div>
                             <form onSubmit={handleAddPoint} className="p-6 space-y-4">
                                 <select required value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                     <option value="">Sélectionner...</option>
                                     {workers.map((w: any) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                                 </select>
                                 <input type="number" step="0.5" value={workQuantity} onChange={e => setWorkQuantity(e.target.value)} required placeholder="Fractions de jours" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                 <button disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black rounded-xl uppercase tracking-widest text-[10px]">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Confirmer'}</button>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Matériau */}
            <AnimatePresence>
                {isMaterialModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMaterialModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-xl relative overflow-hidden">
                             <div className="bg-[#c97423] p-6 flex justify-between text-white uppercase text-xs font-black"><h2>Ajouter un matériau</h2><button onClick={() => setIsMaterialModalOpen(false)}><X size={18} /></button></div>
                             <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
                                 <div className="grid grid-cols-2 gap-3">
                                    <input required value={matName} onChange={e => setMatName(e.target.value)} placeholder="Nom (ex: Ciment)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                    <select required value={matUnit} onChange={e => setMatUnit(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                        <option value="unité">Unité / Pièce</option>
                                        <option value="KG">Kilogrammes (KG)</option>
                                        <option value="L">Litres (L)</option>
                                        <option value="Sac">Sacs</option>
                                        <option value="m">Mètres (m)</option>
                                        <option value="m2">Mètres Carrés (m²)</option>
                                        <option value="m3">Mètres Cubes (m³)</option>
                                        <option value="Tonnes">Tonnes</option>
                                        <option value="Voyage">Voyage</option>
                                    </select>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <input required type="number" value={matPrice} onChange={e => setMatPrice(e.target.value)} placeholder="Prix Unitaire (DH)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                    <input required type="number" value={matUsed} onChange={e => setMatUsed(e.target.value)} placeholder="Quantité utilisée" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                 </div>
                                 <label className="flex flex-col items-center justify-center gap-2 p-5 bg-stone-50/50 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-all text-center">
                                    <ImageIcon size={24} className={matReceiptFile ? "text-emerald-500" : "text-stone-300"} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                        {matReceiptFile ? matReceiptFile.name : 'Joindre une photo ou facture (Optionnel)'}
                                    </span>
                                    <input type="file" onChange={e => setMatReceiptFile(e.target.files?.[0] || null)} className="hidden" accept="image/*,.pdf" />
                                 </label>
                                 <button disabled={isSubmitting} className="w-full py-4 bg-black text-white font-black rounded-xl uppercase tracking-widest text-[10px]">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Enregistrer'}</button>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
