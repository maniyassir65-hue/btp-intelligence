'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wrench,
    Plus,
    Search,
    Loader2,
    X,
    Phone,
    Building2,
    CheckCircle2,
    Trash2,
    ChevronRight,
    FileText,
    FileSpreadsheet,
    BadgeCheck,
    Banknote,
    AlertCircle
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

interface Subcontractor {
    id: string;
    company_name: string;
    contact_name: string;
    phone: string;
    specialty: string;
    created_at: string;
}

interface Subcontract {
    id: string;
    project_id: string;
    subcontractor_id: string;
    description: string;
    agreed_amount: number;
    paid_amount: number;
    status: string;
    start_date: string;
    end_date: string | null;
    created_at: string;
    subcontractors?: Subcontractor;
    projects?: { name: string };
}

interface Project {
    id: string;
    name: string;
}

export default function SubcontractorsPage() {
    const { role } = useAuth();
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [subcontracts, setSubcontracts] = useState<Subcontract[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'list' | 'contracts'>('list');

    // Modal Sous-traitant
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subCompany, setSubCompany] = useState('');
    const [subContact, setSubContact] = useState('');
    const [subPhone, setSubPhone] = useState('');
    const [subSpecialty, setSubSpecialty] = useState('');

    // Modal Contrat
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [contractSubId, setContractSubId] = useState('');
    const [contractProjectId, setContractProjectId] = useState('');
    const [contractDesc, setContractDesc] = useState('');
    const [contractAmount, setContractAmount] = useState('');
    const [contractStart, setContractStart] = useState('');

    // Modal Paiement
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payContractId, setPayContractId] = useState('');
    const [payAmount, setPayAmount] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);

            const { data: subs } = await supabase.from('subcontractors').select('*').order('created_at', { ascending: false });
            setSubcontractors(subs || []);

            const { data: contracts } = await supabase
                .from('subcontracts')
                .select('*, subcontractors(company_name, specialty), projects(name)')
                .order('created_at', { ascending: false });
            setSubcontracts(contracts || []);

            const { data: projs } = await supabase.from('projects').select('id, name');
            setProjects(projs || []);

        } catch (error: any) {
            console.error('Erreur:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSubcontractor(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('subcontractors')
                .insert([{
                    company_name: subCompany,
                    contact_name: subContact,
                    phone: subPhone,
                    specialty: subSpecialty
                }])
                .select();

            if (error) throw error;
            setSubcontractors([data[0], ...subcontractors]);
            setIsSubModalOpen(false);
            setSubCompany(''); setSubContact(''); setSubPhone(''); setSubSpecialty('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAddContract(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const { data, error } = await supabase
                .from('subcontracts')
                .insert([{
                    project_id: contractProjectId,
                    subcontractor_id: contractSubId,
                    description: contractDesc,
                    agreed_amount: parseFloat(contractAmount) || 0,
                    start_date: contractStart || new Date().toISOString().split('T')[0]
                }])
                .select('*, subcontractors(company_name, specialty), projects(name)');

            if (error) throw error;
            setSubcontracts([data[0], ...subcontracts]);
            setIsContractModalOpen(false);
            setContractSubId(''); setContractProjectId(''); setContractDesc(''); setContractAmount(''); setContractStart('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handlePayContract(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const contract = subcontracts.find(c => c.id === payContractId);
            if (!contract) return;

            const newPaid = contract.paid_amount + (parseFloat(payAmount) || 0);
            const { error } = await supabase
                .from('subcontracts')
                .update({ paid_amount: newPaid })
                .eq('id', payContractId);

            if (error) throw error;
            setSubcontracts(subcontracts.map(c => c.id === payContractId ? { ...c, paid_amount: newPaid } : c));
            setIsPayModalOpen(false);
            setPayAmount('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUpdateStatus(contractId: string, newStatus: string) {
        try {
            const { error } = await supabase
                .from('subcontracts')
                .update({ status: newStatus })
                .eq('id', contractId);
            if (error) throw error;
            setSubcontracts(subcontracts.map(c => c.id === contractId ? { ...c, status: newStatus } : c));
        } catch (error: any) {
            alert(error.message);
        }
    }

    async function handleDeleteSubcontractor(subId: string) {
        if (!confirm('Supprimer ce sous-traitant et tous ses contrats ?')) return;
        try {
            const { error } = await supabase.from('subcontractors').delete().eq('id', subId);
            if (error) throw error;
            setSubcontractors(subcontractors.filter(s => s.id !== subId));
            setSubcontracts(subcontracts.filter(c => c.subcontractor_id !== subId));
        } catch (error: any) {
            alert(error.message);
        }
    }

    const handleExport = (format: 'pdf' | 'excel') => {
        if (activeTab === 'list') {
            const columns = ['Entreprise', 'Contact', 'Téléphone', 'Spécialité'];
            const rows = subcontractors.map(s => [s.company_name, s.contact_name, s.phone, s.specialty]);
            if (format === 'excel') {
                const data = subcontractors.map(s => ({
                    Entreprise: s.company_name, Contact: s.contact_name,
                    Téléphone: s.phone, Spécialité: s.specialty
                }));
                exportToExcel(data, 'Sous_Traitants');
            } else {
                exportToPDF('Registre des Sous-Traitants', columns, rows, 'Sous_Traitants');
            }
        } else {
            const columns = ['Sous-traitant', 'Projet', 'Description', 'Montant', 'Payé', 'Reste', 'Statut'];
            const rows = subcontracts.map(c => [
                c.subcontractors?.company_name || '', c.projects?.name || '',
                c.description, c.agreed_amount.toLocaleString() + ' DH',
                c.paid_amount.toLocaleString() + ' DH',
                (c.agreed_amount - c.paid_amount).toLocaleString() + ' DH', c.status
            ]);
            if (format === 'excel') {
                const data = subcontracts.map(c => ({
                    'Sous-traitant': c.subcontractors?.company_name, Projet: c.projects?.name,
                    Description: c.description, 'Montant Convenu': c.agreed_amount,
                    'Montant Payé': c.paid_amount, 'Reste à Payer': c.agreed_amount - c.paid_amount, Statut: c.status
                }));
                exportToExcel(data, 'Contrats_Sous_Traitance');
            } else {
                const totalConvenu = subcontracts.reduce((a, c) => a + c.agreed_amount, 0);
                const totalPaye = subcontracts.reduce((a, c) => a + c.paid_amount, 0);
                const summary = [
                    { label: 'Montant Total Convenu', value: totalConvenu.toLocaleString() + ' DH' },
                    { label: 'Total Payé', value: totalPaye.toLocaleString() + ' DH' },
                    { label: 'Reste à Payer', value: (totalConvenu - totalPaye).toLocaleString() + ' DH' }
                ];
                exportToPDF('Contrats de Sous-Traitance', columns, rows, 'Contrats_Sous_Traitance', summary);
            }
        }
    };

    const filteredSubs = subcontractors.filter(s =>
        s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalConvenu = subcontracts.reduce((a, c) => a + c.agreed_amount, 0);
    const totalPaye = subcontracts.reduce((a, c) => a + c.paid_amount, 0);
    const enCours = subcontracts.filter(c => c.status === 'En cours').length;

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Sous-Traitance</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Gérez vos sous-traitants et suivez les contrats actifs.</p>
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
                        onClick={() => activeTab === 'list' ? setIsSubModalOpen(true) : setIsContractModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#c97423] text-white rounded-full shadow-md hover:bg-amber-700 transition-all active:scale-95 group text-sm font-bold"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span className="uppercase tracking-wide">{activeTab === 'list' ? 'Nouveau ST' : 'Nouveau Contrat'}</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { label: 'Sous-Traitants', value: subcontractors.length, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Contrats En Cours', value: enCours, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Engagé', value: totalConvenu.toLocaleString() + ' DH', icon: Banknote, color: 'text-stone-600', bg: 'bg-stone-50' },
                    { label: 'Reste à Payer', value: (totalConvenu - totalPaye).toLocaleString() + ' DH', icon: AlertCircle, color: totalConvenu - totalPaye > 0 ? 'text-red-600' : 'text-emerald-600', bg: totalConvenu - totalPaye > 0 ? 'bg-red-50' : 'bg-emerald-50' },
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

            {/* Tabs */}
            <div className="flex gap-6 border-b border-stone-200">
                <button onClick={() => setActiveTab('list')} className={cn("pb-3.5 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2", activeTab === 'list' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600")}>
                    <Wrench size={18} /> Annuaire
                </button>
                <button onClick={() => setActiveTab('contracts')} className={cn("pb-3.5 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2", activeTab === 'contracts' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600")}>
                    <Building2 size={18} /> Contrats
                    {enCours > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm focus:ring-2 focus:ring-amber-500/10 outline-none transition-all font-medium text-sm" />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                    <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px]">Chargement...</p>
                </div>
            ) : activeTab === 'list' ? (
                /* ANNUAIRE DES SOUS-TRAITANTS */
                filteredSubs.length === 0 ? (
                    <div className="bg-white p-16 rounded-[2rem] text-center space-y-4 border border-stone-100 shadow-sm">
                        <div className="bg-stone-50 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-stone-300">
                            <Wrench size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-stone-900">Aucun sous-traitant</h3>
                            <p className="text-stone-400 text-xs font-medium max-w-xs mx-auto">Ajoutez vos premiers sous-traitants pour commencer.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredSubs.map((sub, i) => (
                            <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all group relative"
                            >
                                <button onClick={() => handleDeleteSubcontractor(sub.id)} className="absolute top-4 right-4 p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14} />
                                </button>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                                        <Wrench size={20} />
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <h3 className="text-base font-black text-stone-900 truncate">{sub.company_name}</h3>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{sub.specialty}</span>
                                        {sub.contact_name && (
                                            <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5 mt-2">
                                                <BadgeCheck size={12} className="text-stone-400" /> {sub.contact_name}
                                            </p>
                                        )}
                                        {sub.phone && (
                                            <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
                                                <Phone size={12} className="text-stone-400" /> {sub.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )
            ) : (
                /* CONTRATS */
                subcontracts.length === 0 ? (
                    <div className="bg-white p-16 rounded-[2rem] text-center space-y-4 border border-stone-100 shadow-sm">
                        <div className="bg-stone-50 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-stone-300">
                            <Building2 size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-stone-900">Aucun contrat</h3>
                            <p className="text-stone-400 text-xs font-medium max-w-xs mx-auto">Créez votre premier contrat de sous-traitance.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50/50 border-b border-stone-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Sous-traitant</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Projet</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Description</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Montant</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Payé</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Reste</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-stone-400">Statut</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {subcontracts.map((contract, i) => {
                                        const reste = contract.agreed_amount - contract.paid_amount;
                                        return (
                                            <motion.tr key={contract.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                                className="hover:bg-stone-50/40 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-stone-900 text-sm">{contract.subcontractors?.company_name}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-stone-500">{contract.projects?.name}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-stone-600 font-medium">{contract.description}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-stone-900 text-sm">{contract.agreed_amount.toLocaleString()} DH</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-emerald-600 text-sm">{contract.paid_amount.toLocaleString()} DH</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn("font-black text-sm", reste > 0 ? "text-red-600" : "text-emerald-600")}>
                                                        {reste.toLocaleString()} DH
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select value={contract.status} onChange={(e) => handleUpdateStatus(contract.id, e.target.value)}
                                                        className={cn(
                                                            "text-[9px] px-2 py-1 uppercase tracking-widest font-black rounded-md border outline-none cursor-pointer transition-all",
                                                            contract.status === 'Terminé' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                            contract.status === 'Annulé' ? "bg-red-50 text-red-600 border-red-100" :
                                                            "bg-amber-50 text-amber-600 border-amber-100"
                                                        )}>
                                                        <option value="En cours">En cours</option>
                                                        <option value="Terminé">Terminé ✔️</option>
                                                        <option value="Annulé">Annulé ❌</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {role === 'admin' && reste > 0 && (
                                                        <button onClick={() => { setPayContractId(contract.id); setIsPayModalOpen(true); }}
                                                            className="text-[9px] font-black uppercase tracking-widest text-[#c97423] hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-all border border-amber-100">
                                                            Payer
                                                        </button>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* MODAL: Nouveau Sous-traitant */}
            <AnimatePresence>
                {isSubModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSubModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-[#18181b] p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Nouveau Sous-traitant</h2>
                                <button onClick={() => setIsSubModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddSubcontractor} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nom Entreprise</label>
                                    <input required value={subCompany} onChange={e => setSubCompany(e.target.value)} placeholder="ex: ELEC PRO SARL"
                                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Spécialité</label>
                                    <input required value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} placeholder="ex: Électricité, Plomberie..."
                                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Contact</label>
                                        <input value={subContact} onChange={e => setSubContact(e.target.value)} placeholder="M. Ahmed"
                                            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Téléphone</label>
                                        <input value={subPhone} onChange={e => setSubPhone(e.target.value)} placeholder="06 00 00 00 00"
                                            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
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

            {/* MODAL: Nouveau Contrat */}
            <AnimatePresence>
                {isContractModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsContractModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-[#18181b] p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Nouveau Contrat</h2>
                                <button onClick={() => setIsContractModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddContract} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Sous-traitant</label>
                                    <select required value={contractSubId} onChange={e => setContractSubId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm">
                                        <option value="">-- Choisir --</option>
                                        {subcontractors.map(s => <option key={s.id} value={s.id}>{s.company_name} ({s.specialty})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Projet / Chantier</label>
                                    <select required value={contractProjectId} onChange={e => setContractProjectId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm">
                                        <option value="">-- Choisir --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Description</label>
                                    <input required value={contractDesc} onChange={e => setContractDesc(e.target.value)} placeholder="ex: Lot Électricité - Bâtiment A"
                                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Montant (DH)</label>
                                        <input required type="number" value={contractAmount} onChange={e => setContractAmount(e.target.value)} min="0"
                                            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Date Début</label>
                                        <input type="date" value={contractStart} onChange={e => setContractStart(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                    </div>
                                </div>
                                <button disabled={isSubmitting} type="submit" className="w-full py-3 bg-[#c97423] text-white font-bold rounded-xl text-xs uppercase tracking-widest flex justify-center mt-2 shadow-md">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le Contrat'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: Payer un Contrat */}
            <AnimatePresence>
                {isPayModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPayModalOpen(false)} className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden relative">
                            <div className="bg-[#18181b] p-6 flex justify-between items-center text-white">
                                <h2 className="text-lg font-black uppercase tracking-tight">Enregistrer un Paiement</h2>
                                <button onClick={() => setIsPayModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handlePayContract} className="p-6 space-y-5">
                                {payContractId && (() => {
                                    const c = subcontracts.find(x => x.id === payContractId);
                                    if (!c) return null;
                                    return (
                                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Contrat: {c.subcontractors?.company_name}</p>
                                            <p className="text-sm font-black text-stone-900">Reste à payer: <span className="text-red-600">{(c.agreed_amount - c.paid_amount).toLocaleString()} DH</span></p>
                                        </div>
                                    );
                                })()}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Montant du Versement (DH)</label>
                                    <input required type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min="0" placeholder="0"
                                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none font-bold text-stone-900 text-sm" />
                                </div>
                                <button disabled={isSubmitting} type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest flex justify-center mt-2 shadow-md">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer le Paiement'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
