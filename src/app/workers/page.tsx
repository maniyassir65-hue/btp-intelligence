'use client';

import React, { useState, useEffect } from 'react';
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
    ChevronRight,
    FileText,
    FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

interface Worker {
    id: string;
    full_name: string;
    specialty: string;
    phone_number: string;
    cin: string;
    created_at: string;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Formulaire
    const [name, setName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [cin, setCin] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleExport = (format: 'pdf' | 'excel') => {
        const columns = ['Nom Complet', 'Spécialité', 'Téléphone', 'CIN', 'Inscrit le'];
        const rows = workers.map(w => [
            w.full_name,
            w.specialty,
            w.phone_number,
            w.cin,
            new Date(w.created_at).toLocaleDateString()
        ]);

        if (format === 'excel') {
            const data = workers.map(w => ({
                'Nom Complet': w.full_name,
                Spécialité: w.specialty,
                Téléphone: w.phone_number,
                CIN: w.cin,
                'Date Inscription': new Date(w.created_at).toLocaleDateString()
            }));
            exportToExcel(data, 'Liste_Ouvriers');
        } else {
            const summary = [
                { label: 'Total Ouvriers', value: workers.length.toString() }
            ];
            exportToPDF('Registre des Ouvriers', columns, rows, 'Liste_Ouvriers', summary);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    async function fetchWorkers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('workers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWorkers(data || []);
        } catch (error: any) {
            console.error('Erreur:', error.message);
            console.dir(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddWorker(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('workers')
                .insert([{
                    full_name: name,
                    specialty: specialty,
                    cin: cin,
                    phone_number: phone
                }])
                .select();

            if (error) throw error;
            setWorkers([data[0], ...workers]);
            setIsModalOpen(false);
            setName(''); setSpecialty(''); setCin(''); setPhone('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredWorkers = workers.filter(w =>
        w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.cin.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Effectif et Ouvriers</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Gérez vos équipes et suivez leurs spécialités par chantier.</p>
                </div>
                <div className="flex gap-3">
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
                        <span className="uppercase tracking-wide">Nouvel Ouvrier</span>
                    </button>
                </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
                <input
                    type="text"
                    placeholder="Rechercher par nom, CIN ou spécialité..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-medium text-sm"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px]">Mise à jour...</p>
                </div>
            ) : filteredWorkers.length === 0 ? (
                <div className="bg-white p-16 rounded-[2rem] text-center space-y-4 border border-stone-100 shadow-sm">
                    <div className="bg-stone-50 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-stone-300">
                        <Users2 size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-stone-900">Pas d'ouvriers</h3>
                        <p className="text-stone-400 text-xs font-medium max-w-xs mx-auto">Ajoutez vos ouvriers pour commencer le suivi.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50/50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Ouvrier</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Document (CIN)</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">ID Unique</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filteredWorkers.map((worker, i) => (
                                    <motion.tr
                                        key={worker.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="group hover:bg-stone-50/40 transition-colors cursor-default"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="p-2.5 bg-stone-100 rounded-xl text-stone-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                                    <HardHat size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-stone-900 text-base group-hover:text-[#c97423] transition-colors leading-tight">{worker.full_name}</div>
                                                    <div className="text-[9px] font-black text-[#c97423] uppercase tracking-widest opacity-80 mt-0.5">{worker.specialty}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-stone-600 font-bold text-xs uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                                                {worker.cin}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-mono font-bold text-stone-300">ID_{worker.id.slice(0, 8).toUpperCase()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
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
                            <div className="bg-stone-900 p-6 flex justify-between items-center text-white">
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-black uppercase tracking-tight">Nouvel Ouvrier</h2>
                                    <p className="text-stone-400 text-[9px] font-black uppercase tracking-widest">Ajout du personnel de chantier</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleAddWorker} className="p-7 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nom Complet</label>
                                    <div className="relative">
                                        <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 w-4.5 h-4.5" />
                                        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Prénon et Nom"
                                            className="w-full pl-11 pr-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Spécialité</label>
                                        <input required value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="ex: Maçon"
                                            className="w-full px-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">CIN</label>
                                        <input required value={cin} onChange={e => setCin(e.target.value)} placeholder="Numéro ID"
                                            className="w-full px-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 w-4.5 h-4.5" />
                                        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XX XX XX XX"
                                            className="w-full pl-11 pr-5 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold text-stone-900 transition-all text-sm" />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting}
                                    className="w-full py-4 bg-[#c97423] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all text-xs tracking-widest uppercase shadow-md"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BadgeCheck size={18} /> valider l'inscription</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
