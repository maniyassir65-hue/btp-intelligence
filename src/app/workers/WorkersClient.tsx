'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users2,
    Plus,
    Search,
    Loader2,
    X,
    UserCircle2,
    HardHat,
    BadgeCheck,
    Phone,
    Trash2,
    FileText,
    FileSpreadsheet,
    Wallet,
    Building2,
    Edit2
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { addWorkerAction, getWorkerDetailsAction, addWorkerPaymentAction, updateWorkerPaymentAction } from '@/app/actions';

interface Worker {
    id: string;
    full_name: string;
    specialty: string;
    phone_number: string;
    cin: string;
    daily_rate: number;
    contract_days: number;
    photo_url: string;
    created_at: string;
}

interface WorkerPayment {
    id: string;
    worker_id: string;
    amount: number;
    payment_date: string;
    note: string;
}

export default function WorkersClient({ initialWorkers }: { initialWorkers: Worker[] }) {
    const router = useRouter();
    const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>([]);
    const [workerProjects, setWorkerProjects] = useState<any[]>([]);
    const [workerPoints, setWorkerPoints] = useState<any[]>([]);
    const [selectedPayId, setSelectedPayId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [name, setName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [cin, setCin] = useState('');
    const [phone, setPhone] = useState('');
    const [dailyRate, setDailyRate] = useState('');
    const [contractDays, setContractDays] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payNote, setPayNote] = useState('');

    const handleExport = (format: 'pdf' | 'excel') => {
        const columns = ['Nom Complet', 'Spécialité', 'Téléphone', 'CIN', 'Inscrit le'];
        const rows = workers.map(w => [w.full_name, w.specialty, w.phone_number, w.cin, new Date(w.created_at).toLocaleDateString()]);
        if (format === 'excel') exportToExcel(workers.map(w => ({ 'Nom Complet': w.full_name, specialty: w.specialty, cin: w.cin })), 'Liste_Ouvriers');
        else exportToPDF('Registre des Ouvriers', columns, rows, 'Liste_Ouvriers', []);
    };

    async function handleAddWorker(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('full_name', name);
            formData.append('cin', cin);
            formData.append('phone', phone);
            formData.append('specialty', specialty);
            formData.append('daily_rate', dailyRate);

            const newWorker = await addWorkerAction(formData);
            setWorkers([newWorker as any, ...workers]);
            setIsModalOpen(false);
            setName(''); setSpecialty(''); setCin(''); setPhone(''); setDailyRate('');
            router.refresh();
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    async function fetchWorkerDetails(worker: Worker) {
        setSelectedWorker(worker);
        setIsDetailModalOpen(true);
        setLoading(true);
        setSelectedPayId(null);
        setWorkerPayments([]);
        setWorkerPoints([]);
        setWorkerProjects([]);
        try {
            const { payments, points } = await getWorkerDetailsAction(worker.id);
            setWorkerPayments(payments);
            setWorkerPoints(points);
            
            const projs = points.map((p: any) => p.levels?.buildings?.projects?.name || p.levels?.buildings?.name).filter(Boolean);
            setWorkerProjects(Array.from(new Set(projs)));

        } catch (error) {
            console.error('Crash fetch details:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddPayment(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWorker) return;
        try {
            setIsSubmitting(true);
            if (selectedPayId) {
                const updatedPay = await updateWorkerPaymentAction(selectedPayId, Number(payAmount), payNote);
                setWorkerPayments(workerPayments.map((p: any) => p.id === selectedPayId ? updatedPay : p));
            } else {
                const newPayment = await addWorkerPaymentAction(selectedWorker.id, Number(payAmount), payNote);
                setWorkerPayments([newPayment as any, ...workerPayments]);
            }
            setPayAmount(''); setPayNote(''); setSelectedPayId(null);
        } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
    }

    async function handleDeletePayment(paymentId: string) {
        if (!confirm('Voulez-vous vraiment supprimer ce paiement ?')) return;
        try {
            const { error } = await supabase.from('worker_payments').delete().eq('id', paymentId);
            if (error) throw error;
            setWorkerPayments(workerPayments.filter((p: any) => p.id !== paymentId));
        } catch (error: any) { alert(error.message); }
    }

    const handleWorkerHistoryExport = () => {
        if (!selectedWorker) return;
        
        const totalGagne = workerPoints.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0);
        const totalPaye = workerPayments.reduce((acc, p) => acc + p.amount, 0);
        const reste = totalGagne - totalPaye;

        const summary = [
            { label: 'Ouvrier', value: selectedWorker.full_name },
            { label: 'Spécialité', value: selectedWorker.specialty + " (CIN: " + selectedWorker.cin + ")" },
            { label: 'Total Gagné', value: totalGagne.toLocaleString() + ' DH' },
            { label: 'Total Payé', value: totalPaye.toLocaleString() + ' DH' },
            { label: 'Reste à Devise', value: reste.toLocaleString() + ' DH' }
        ];

        const columns = ['Type', 'Date', 'Description', 'Chantier', 'Montant'];
        
        const combined = [
            ...workerPoints.map(p => ({
                type: 'Pointage', date: new Date(p.pointing_date),
                desc: `${p.quantity} jour(s) x ${p.unit_price} DH`,
                project: p.levels?.buildings?.projects?.name || p.levels?.buildings?.name || 'Local',
                amountSign: `${(p.quantity * p.unit_price).toLocaleString()}`
            })),
            ...workerPayments.map(p => ({
                type: 'Paiement', date: new Date(p.payment_date),
                desc: p.note || 'Paiement régulier',
                project: '-',
                amountSign: `-${p.amount.toLocaleString()}`
            }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime());

        const sortedRows = combined.map(item => [item.type, item.date.toLocaleDateString(), item.desc, item.project, item.amountSign + ' DH']);

        exportToPDF(`Historique: ${selectedWorker.full_name}`, columns, sortedRows, `Historique_${selectedWorker.full_name.replace(" ", "_")}`, summary);
    };

    const filteredWorkers = workers.filter(w => w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || w.specialty.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Effectif et Ouvriers</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Gérez vos équipes et suivez leurs spécialités par chantier.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white border border-stone-200 p-1.5 rounded-2xl gap-1.5 shadow-sm">
                        <button onClick={() => handleExport('pdf')} className="flex flex-col items-center justify-center py-2 px-4 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileText size={18} strokeWidth={2.5} /> PDF
                        </button>
                        <button onClick={() => handleExport('excel')} className="flex flex-col items-center justify-center py-2 px-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileSpreadsheet size={18} strokeWidth={2.5} /> EXCEL
                        </button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-4 bg-[#c97423] text-white rounded-2xl shadow-md hover:bg-amber-700 transition-all active:scale-95 text-xs font-black uppercase tracking-widest">
                        <Plus size={18} /> Nouvel Ouvrier
                    </button>
                </div>
            </div>

            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                <input type="text" placeholder="Rechercher un ouvrier..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-medium text-sm" />
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-stone-50/50 border-b border-stone-100 uppercase text-[9px] font-black tracking-widest text-stone-400">
                        <tr>
                            <th className="px-6 py-4">Ouvrier</th>
                            <th className="px-6 py-4">CIN</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {filteredWorkers.map((worker) => (
                            <tr key={worker.id} className="hover:bg-stone-50/40 transition-colors">
                                <td className="px-6 py-4 cursor-pointer" onClick={() => fetchWorkerDetails(worker)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center">
                                            {worker.photo_url ? <img src={worker.photo_url} className="w-full h-full object-cover" /> : <HardHat size={18} className="text-stone-400" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-stone-900">{worker.full_name}</div>
                                            <div className="text-[9px] font-black text-[#c97423]">{worker.specialty}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-stone-600">{worker.cin}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => fetchWorkerDetails(worker)} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase rounded-lg hover:bg-[#c97423] hover:text-white transition-all">Détails</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {isDetailModalOpen && selectedWorker && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailModalOpen(false)} className="absolute inset-0 bg-stone-950/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col">
                            <div className="p-8 bg-black text-white flex justify-between items-center">
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-stone-800 rounded-2xl overflow-hidden flex items-center justify-center">
                                        {selectedWorker.photo_url ? <img src={selectedWorker.photo_url} className="w-full h-full object-cover" /> : <HardHat size={32} className="text-amber-500" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight">{selectedWorker.full_name}</h2>
                                        <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">{selectedWorker.specialty} • CIN: {selectedWorker.cin}</p>
                                        {!loading && (
                                            <div className="flex gap-4 mt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black uppercase text-stone-500 opacity-50">Total Gagné</span>
                                                    <span className="text-sm font-black text-emerald-400">{workerPoints.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0).toLocaleString()} DH</span>
                                                </div>
                                                <div className="flex flex-col border-l border-white/10 pl-4">
                                                    <span className="text-[8px] font-black uppercase text-stone-500 opacity-50">Total Payé</span>
                                                    <span className="text-sm font-black text-[#c97423]">{workerPayments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()} DH</span>
                                                </div>
                                                <div className="flex flex-col border-l border-white/10 pl-4">
                                                    <span className="text-[8px] font-black uppercase text-stone-500 opacity-50">Reste</span>
                                                    <span className="text-sm font-black text-rose-400">{(workerPoints.reduce((acc, p) => acc + (p.quantity * p.unit_price), 0) - workerPayments.reduce((acc, p) => acc + p.amount, 0)).toLocaleString()} DH</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={handleWorkerHistoryExport} className="p-3 bg-red-500/10 text-rose-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase flex items-center gap-2 px-5 shadow-sm active:scale-95"><FileText size={16} /> Rapport PDF</button>
                                    <button onClick={() => setIsDetailModalOpen(false)} className="p-2 bg-stone-900 text-stone-400 hover:bg-white/10 hover:text-white rounded-xl transition-all"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-[#fafaf9]">
                                {loading ? (
                                    <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
                                        <Loader2 className="w-10 h-10 animate-spin text-[#c97423]" />
                                        <p className="text-stone-400 font-black uppercase text-[10px]">Chargement de l'historique...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-[#c97423]">Paiements & Avances</h3>
                                            <form onSubmit={handleAddPayment} className="grid grid-cols-3 gap-2 bg-white p-4 rounded-2xl border border-stone-200">
                                                <input required type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0 DH" className="col-span-1 px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg font-bold text-sm outline-none" />
                                                <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note..." className="col-span-1 px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg font-bold text-sm outline-none" />
                                                <button type="submit" disabled={isSubmitting} className="col-span-1 bg-[#c97423] text-white font-black text-[10px] uppercase rounded-lg hover:bg-amber-700 transition-all font-black">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : (selectedPayId ? 'Modifier' : 'Payer')}</button>
                                            </form>
                                            <div className="space-y-2">
                                                {workerPayments.length === 0 ? (
                                                    <div className="text-center py-10 text-stone-300 font-bold text-[10px] uppercase border-2 border-dashed border-stone-100 rounded-2xl">Aucun paiement enregistré</div>
                                                ) : (
                                                    workerPayments.map(p => (
                                                        <div key={p.id} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex justify-between items-center group hover:border-[#c97423]/30 transition-all">
                                                            <div className="flex-1">
                                                                <p className="font-black text-stone-900">{p.amount.toLocaleString()} <span className="text-[10px]">DH</span></p>
                                                                <p className="text-[10px] text-stone-400 font-bold uppercase">{p.note || 'Paiement régulier'}</p>
                                                            </div>
                                                            <div className="text-right flex flex-col justify-between items-end h-full">
                                                                <p className="text-[9px] text-stone-300 font-bold mb-2">{new Date(p.payment_date).toLocaleDateString()}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <button onClick={() => { setSelectedPayId(p.id); setPayAmount(p.amount.toString()); setPayNote(p.note || ''); }} className="p-1.5 bg-amber-50 text-[#c97423] rounded-md hover:bg-[#c97423] hover:text-white transition-colors shadow-sm" title="Modifier ce paiement"><Edit2 size={16} /></button>
                                                                    <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 bg-rose-50 text-rose-500 rounded-md hover:bg-rose-500 hover:text-white transition-colors shadow-sm" title="Supprimer ce paiement"><X size={16} /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-stone-900">Historique de présence</h3>
                                            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-50">
                                                {workerPoints.length === 0 ? (
                                                    <div className="p-10 text-center text-stone-300 text-[10px] font-black uppercase">Aucune présence notée</div>
                                                ) : (
                                                    workerPoints.map(p => (
                                                        <div key={p.id} className="p-4 flex justify-between items-center hover:bg-stone-50/50 group transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-stone-800">{new Date(p.pointing_date).toLocaleDateString()}</span>
                                                                <span className="text-[9px] font-bold text-stone-400 uppercase">{p.quantity} jour(s) x {p.unit_price} DH</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                                                    {p.levels?.buildings?.projects?.name || p.levels?.buildings?.name || 'Local'}
                                                                </span>
                                                                <span className="text-[10px] font-black text-stone-900 mt-1">{(p.quantity * p.unit_price).toLocaleString()} DH</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD WORKER MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-black p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Nouvel Ouvrier</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddWorker} className="p-7 space-y-5">
                                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nom Complet" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input required value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Spécialité" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm" />
                                    <input required value={cin} onChange={e => setCin(e.target.value)} placeholder="CIN" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm" />
                                </div>
                                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="N° Téléphone" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input required type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="Tarif (DH/j)" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm" />
                                    <input type="number" value={contractDays} onChange={e => setContractDays(e.target.value)} placeholder="Contrat (j)" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-sm" />
                                </div>
                                <input type="file" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-[10px] uppercase font-black tracking-widest text-[#c97423] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-amber-50 file:text-[#c97423] hover:file:bg-amber-100" />
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Inscrire l\'ouvrier'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
