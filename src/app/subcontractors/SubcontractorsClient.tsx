'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wrench,
    Plus,
    Search,
    Loader2,
    X,
    Phone,
    BadgeCheck,
    Banknote,
    AlertCircle,
    FileText,
    FileSpreadsheet,
    ClipboardList,
    CheckCircle2,
    XCircle,
    Clock,
    Pencil,
    Trash2,
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { addSubcontractorAction, addSubcontractAction, addSubcontractPaymentAction, updateSubcontractStatusAction, updateSubcontractAction, deleteSubcontractAction } from '@/app/actions';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    'En cours':  { label: 'En cours',  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100',  icon: <Clock size={10} /> },
    'Terminé':   { label: 'Terminé',   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <CheckCircle2 size={10} /> },
    'Annulé':    { label: 'Annulé',    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100',    icon: <XCircle size={10} /> },
};

export default function SubcontractorsClient({ 
    initialSubcontractors, 
    initialSubcontracts, 
    initialProjects,
    initialBuildings,
    initialLevels,
    role 
}: any) {
    const [subcontractors, setSubcontractors] = useState<any[]>(initialSubcontractors);
    const [subcontracts, setSubcontracts] = useState<any[]>(initialSubcontracts);
    const [projects] = useState<any[]>(initialProjects || []);
    const [allBuildings] = useState<any[]>(initialBuildings || []);
    const [allLevels] = useState<any[]>(initialLevels || []);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'list' | 'contracts'>('list');
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Subcontractor form states
    const [subCompany, setSubCompany] = useState('');
    const [subSpecialty, setSubSpecialty] = useState('');
    const [subContact, setSubContact] = useState('');
    const [subPhone, setSubPhone] = useState('');

    // Contract form states
    const [contractSubId, setContractSubId] = useState('');
    const [contractProjectId, setContractProjectId] = useState('');
    const [contractBuildingId, setContractBuildingId] = useState('');
    const [contractLevelId, setContractLevelId] = useState('');
    const [contractDesc, setContractDesc] = useState('');
    const [contractAmount, setContractAmount] = useState('');
    const [contractStatus, setContractStatus] = useState('En cours');

    // Derived: buildings and levels filtered by selected project
    const contractBuildings = contractProjectId ? allBuildings.filter(b => b.project_id === contractProjectId) : [];
    const contractLevels = contractBuildingId ? allLevels.filter(l => l.building_id === contractBuildingId) : [];

    // Payment form states
    const [payContractId, setPayContractId] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [payNote, setPayNote] = useState('');

    // Edit contract states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editContractId, setEditContractId] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editStatus, setEditStatus] = useState('En cours');

    function openEditModal(c: any) {
        setEditContractId(c.id);
        setEditDesc(c.description || '');
        setEditAmount(String(c.agreed_amount || 0));
        setEditStatus(c.status || 'En cours');
        setIsEditModalOpen(true);
    }

    const handleExport = (format: 'pdf' | 'excel') => {
        if (activeTab === 'list') {
            const columns = ['Entreprise', 'Spécialité', 'Contact', 'Téléphone'];
            const rows = subcontractors.map(s => [s.company_name, s.specialty, s.contact_name, s.phone]);
            if (format === 'excel') exportToExcel(subcontractors.map(s => ({ Entreprise: s.company_name, Spécialité: s.specialty, Contact: s.contact_name, Téléphone: s.phone })), 'Sous_Traitants');
            else exportToPDF('Registre des Sous-Traitants', columns, rows, 'Sous_Traitants');
        } else {
            const columns = ['Sous-traitant', 'Projet', 'Description', 'Montant', 'Payé', 'Reste', 'Statut'];
            const rows = subcontracts.map(c => [
                c.subcontractors?.company_name,
                c.projects?.name,
                c.description,
                (c.agreed_amount || 0).toLocaleString() + ' DH',
                (c.paid_amount || 0).toLocaleString() + ' DH',
                ((c.agreed_amount || 0) - (c.paid_amount || 0)).toLocaleString() + ' DH',
                c.status || 'En cours'
            ]);
            if (format === 'excel') exportToExcel(subcontracts.map(c => ({
                'Sous-traitant': c.subcontractors?.company_name,
                'Projet': c.projects?.name,
                'Description': c.description,
                'Montant Convenu': c.agreed_amount,
                'Montant Payé': c.paid_amount,
                'Reste': (c.agreed_amount || 0) - (c.paid_amount || 0),
                'Statut': c.status || 'En cours'
            })), 'Contrats_ST');
            else exportToPDF('Contrats Sous-Traitance', columns, rows, 'Contrats_ST', []);
        }
    };

    async function handleAddSub(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const newSub = await addSubcontractorAction(subCompany, subSpecialty, subContact, subPhone);
            setSubcontractors([newSub, ...subcontractors]);
            setIsSubModalOpen(false);
            setSubCompany(''); setSubSpecialty(''); setSubContact(''); setSubPhone('');
        } catch (error: any) { alert('Erreur: ' + error.message); } finally { setIsSubmitting(false); }
    }

    async function handleAddContract(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const newContract = await addSubcontractAction(
                contractSubId,
                contractProjectId || null,
                contractDesc,
                parseFloat(contractAmount) || 0,
                contractBuildingId || null,
                contractLevelId || null
            );
            setSubcontracts([newContract, ...subcontracts]);
            setIsContractModalOpen(false);
            setContractSubId(''); setContractProjectId(''); setContractBuildingId(''); setContractLevelId(''); setContractDesc(''); setContractAmount(''); setContractStatus('En cours');
        } catch (error: any) { alert('Erreur: ' + error.message); } finally { setIsSubmitting(false); }
    }

    async function handlePay(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const contract = subcontracts.find(c => c.id === payContractId);
            const updated = await addSubcontractPaymentAction(payContractId, contract.paid_amount || 0, parseFloat(payAmount) || 0);
            setSubcontracts(subcontracts.map(c => c.id === payContractId ? { ...c, paid_amount: updated.paid_amount } : c));
            setIsPayModalOpen(false);
            setPayAmount(''); setPayNote('');
        } catch (error: any) { alert('Erreur: ' + error.message); } finally { setIsSubmitting(false); }
    }

    async function handleEditContract(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const updated = await updateSubcontractAction(editContractId, editDesc, parseFloat(editAmount) || 0, editStatus);
            setSubcontracts(subcontracts.map(c => c.id === editContractId ? { ...c, ...updated } : c));
            setIsEditModalOpen(false);
        } catch (error: any) { alert('Erreur: ' + error.message); } finally { setIsSubmitting(false); }
    }

    async function handleDeleteContract(contractId: string) {
        if (!confirm('Supprimer ce contrat ? Cette action est irréversible.')) return;
        try {
            await deleteSubcontractAction(contractId);
            setSubcontracts(subcontracts.filter(c => c.id !== contractId));
        } catch (error: any) { alert('Erreur: ' + error.message); }
    }

    async function handleUpdateStatus(contractId: string, newStatus: string) {
        try {
            await updateSubcontractStatusAction(contractId, newStatus);
            setSubcontracts(subcontracts.map(c => c.id === contractId ? { ...c, status: newStatus } : c));
        } catch (error: any) { alert('Erreur: ' + error.message); }
    }

    const filteredSubs = subcontractors.filter(s => s.company_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredContracts = subcontracts.filter(c =>
        (c.subcontractors?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const totalConvenu = subcontracts.reduce((a, c) => a + (c.agreed_amount || 0), 0);
    const totalPaye = subcontracts.reduce((a, c) => a + (c.paid_amount || 0), 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Sous-Traitance</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Gérez vos sous-traitants et suivez les contrats actifs.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white border border-stone-200 p-1.5 rounded-2xl gap-1.5 shadow-sm h-fit">
                        <button onClick={() => handleExport('pdf')} className="flex flex-col items-center justify-center py-2 px-4 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileText size={18} strokeWidth={2.5} /> PDF
                        </button>
                        <button onClick={() => handleExport('excel')} className="flex flex-col items-center justify-center py-2 px-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-black text-[10px] tracking-wide uppercase gap-1">
                            <FileSpreadsheet size={18} strokeWidth={2.5} /> EXCEL
                        </button>
                    </div>
                    <button
                        onClick={() => activeTab === 'list' ? setIsSubModalOpen(true) : setIsContractModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-[#c97423] text-white rounded-2xl shadow-md hover:bg-amber-700 transition-all active:scale-95 text-xs font-black uppercase tracking-widest h-fit"
                    >
                        <Plus size={18} /> {activeTab === 'list' ? 'Nouveau ST' : 'Nouveau Contrat'}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Wrench size={20} /></div>
                    <div><p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">Partenaires</p><p className="text-lg font-black text-stone-900 mt-1">{subcontractors.length}</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ClipboardList size={20} /></div>
                    <div><p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">Contrats</p><p className="text-lg font-black text-stone-900 mt-1">{subcontracts.length}</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-stone-50 text-stone-600 rounded-xl"><Banknote size={20} /></div>
                    <div><p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">Total Engagé</p><p className="text-lg font-black text-stone-900 mt-1">{totalConvenu.toLocaleString()} DH</p></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertCircle size={20} /></div>
                    <div><p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">Reste à Payer</p><p className="text-lg font-black text-red-600 mt-1">{(totalConvenu - totalPaye).toLocaleString()} DH</p></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-stone-200">
                <button onClick={() => setActiveTab('list')} className={cn("pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2", activeTab === 'list' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600")}>Annuaire ST</button>
                <button onClick={() => setActiveTab('contracts')} className={cn("pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2", activeTab === 'contracts' ? "border-[#c97423] text-[#c97423]" : "border-transparent text-stone-400 hover:text-stone-600")}>Contrats & Suivi</button>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm outline-none font-medium text-sm" />
            </div>

            {/* Content */}
            {activeTab === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-bold">
                    {filteredSubs.length === 0 && (
                        <div className="col-span-full text-center py-16 text-stone-400 font-bold text-sm">Aucun sous-traitant enregistré.</div>
                    )}
                    {filteredSubs.map(s => (
                        <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0"><Wrench size={20} /></div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <h3 className="text-base font-black text-stone-900 truncate">{s.company_name}</h3>
                                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">{s.specialty}</p>
                                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-2 font-medium flex-wrap">
                                        {s.contact_name && <span className="flex items-center gap-1"><BadgeCheck size={12} /> {s.contact_name}</span>}
                                        {s.phone && <span className="flex items-center gap-1"><Phone size={12} /> {s.phone}</span>}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                    {filteredContracts.length === 0 ? (
                        <div className="text-center py-16 text-stone-400 font-bold text-sm">Aucun contrat enregistré. Cliquez sur "+ Nouveau Contrat".</div>
                    ) : (
                        <table className="w-full text-left font-bold text-sm">
                            <thead className="bg-stone-50/50 border-b text-[9px] font-black uppercase text-stone-400 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Sous-traitant</th>
                                    <th className="px-6 py-4">Projet</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Convenu</th>
                                    <th className="px-6 py-4">Payé</th>
                                    <th className="px-6 py-4">Reste</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filteredContracts.map(c => {
                                    const reste = (c.agreed_amount || 0) - (c.paid_amount || 0);
                                    const status = c.status || 'En cours';
                                    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG['En cours'];
                                    return (
                                        <tr key={c.id} className="hover:bg-stone-50/40 transition-colors">
                                            <td className="px-6 py-4 text-stone-900 font-black">{c.subcontractors?.company_name}</td>
                                            <td className="px-6 py-4 text-stone-400 text-xs">{c.projects?.name || '—'}</td>
                                            <td className="px-6 py-4 text-stone-500 text-xs max-w-[180px] truncate">{c.description}</td>
                                            <td className="px-6 py-4 font-black">{(c.agreed_amount || 0).toLocaleString()} <span className="text-stone-400 text-[10px]">DH</span></td>
                                            <td className="px-6 py-4 text-emerald-600 font-black">{(c.paid_amount || 0).toLocaleString()} <span className="text-emerald-300 text-[10px]">DH</span></td>
                                            <td className="px-6 py-4 text-red-600 font-black">{reste.toLocaleString()} <span className="text-red-300 text-[10px]">DH</span></td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={status}
                                                    onChange={e => handleUpdateStatus(c.id, e.target.value)}
                                                    disabled={role !== 'admin'}
                                                    className={cn("text-[9px] font-black uppercase px-2 py-1.5 rounded-lg border cursor-pointer outline-none", statusCfg.color, statusCfg.bg, statusCfg.border)}
                                                >
                                                    <option value="En cours">En cours</option>
                                                    <option value="Terminé">Terminé</option>
                                                    <option value="Annulé">Annulé</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {role === 'admin' && status !== 'Annulé' && reste > 0 && (
                                                        <button
                                                            onClick={() => { setPayContractId(c.id); setIsPayModalOpen(true); }}
                                                            className="flex items-center gap-1 text-[10px] font-black uppercase text-white bg-[#c97423] hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                                        >
                                                            <Banknote size={12} /> Payer
                                                        </button>
                                                    )}
                                                    {role === 'admin' && (
                                                        <button
                                                            onClick={() => openEditModal(c)}
                                                            className="p-2 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-all"
                                                            title="Modifier"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                    {role === 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteContract(c.id)}
                                                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modal: Nouveau Partenaire */}
            <AnimatePresence>
                {isSubModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSubModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl overflow-hidden relative">
                            <div className="bg-black p-6 text-white flex justify-between items-center uppercase">
                                <h2 className="text-sm font-black tracking-tight">Nouveau Partenaire</h2>
                                <button onClick={() => setIsSubModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddSub} className="p-6 space-y-4">
                                <input required value={subCompany} onChange={e => setSubCompany(e.target.value)} placeholder="Nom de l'entreprise" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                <input required value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} placeholder="Spécialité (ex: Carrelage, Peinture…)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input value={subContact} onChange={e => setSubContact(e.target.value)} placeholder="Nom du contact" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                    <input value={subPhone} onChange={e => setSubPhone(e.target.value)} placeholder="Téléphone" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#c97423] text-white font-black rounded-xl uppercase tracking-widest text-[13px] shadow-md">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Enregistrer'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Nouveau Contrat */}
            <AnimatePresence>
                {isContractModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsContractModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-xl overflow-hidden relative">
                            <div className="bg-stone-900 p-6 text-white flex justify-between items-center uppercase">
                                <h2 className="text-sm font-black tracking-tight">Nouveau Contrat</h2>
                                <button onClick={() => setIsContractModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleAddContract} className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Sous-traitant *</label>
                                    <select required value={contractSubId} onChange={e => setContractSubId(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                        <option value="">Sélectionner un sous-traitant…</option>
                                        {subcontractors.map(s => (
                                            <option key={s.id} value={s.id}>{s.company_name} — {s.specialty}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Projet (optionnel)</label>
                                    <select value={contractProjectId} onChange={e => { setContractProjectId(e.target.value); setContractBuildingId(''); setContractLevelId(''); }} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                        <option value="">Aucun projet associé</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {contractProjectId && contractBuildings.length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Bloc (optionnel)</label>
                                        <select value={contractBuildingId} onChange={e => { setContractBuildingId(e.target.value); setContractLevelId(''); }} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                            <option value="">Tout le projet</option>
                                            {contractBuildings.map((b: any) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {contractBuildingId && contractLevels.length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Étage (optionnel)</label>
                                        <select value={contractLevelId} onChange={e => setContractLevelId(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                            <option value="">Tout le bloc</option>
                                            {contractLevels.map((l: any) => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <input required value={contractDesc} onChange={e => setContractDesc(e.target.value)} placeholder="Description des travaux (ex: Pose carrelage RDC)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Montant convenu (DH) *</label>
                                        <input required type="number" value={contractAmount} onChange={e => setContractAmount(e.target.value)} placeholder="0" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Statut initial</label>
                                        <select value={contractStatus} onChange={e => setContractStatus(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                            <option value="En cours">En cours</option>
                                            <option value="Terminé">Terminé</option>
                                            <option value="Annulé">Annulé</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-stone-900 text-white font-black rounded-xl uppercase tracking-widest text-[13px] shadow-md">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Créer le Contrat'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Paiement */}
            <AnimatePresence>
                {isPayModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPayModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl overflow-hidden relative">
                            <div className="bg-emerald-700 p-6 text-white flex justify-between items-center uppercase">
                                <h2 className="text-sm font-black tracking-tight">Enregistrer un Versement</h2>
                                <button onClick={() => setIsPayModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handlePay} className="p-6 space-y-4">
                                {payContractId && (() => {
                                    const c = subcontracts.find(c => c.id === payContractId);
                                    const reste = (c?.agreed_amount || 0) - (c?.paid_amount || 0);
                                    return (
                                        <div className="bg-stone-50 rounded-xl p-4 space-y-1">
                                            <p className="text-xs font-black text-stone-900">{c?.subcontractors?.company_name}</p>
                                            <div className="flex justify-between text-[10px] font-bold text-stone-400 uppercase">
                                                <span>Déjà payé : <span className="text-emerald-600">{(c?.paid_amount || 0).toLocaleString()} DH</span></span>
                                                <span>Reste : <span className="text-red-600">{reste.toLocaleString()} DH</span></span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Montant du versement (DH) *</label>
                                    <input required type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" className="w-full p-4 bg-stone-50 border rounded-xl font-black text-lg text-center" />
                                </div>
                                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (optionnel)" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl uppercase text-[13px] tracking-widest shadow-md hover:bg-emerald-700 transition-all">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmer le Versement'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Modifier Contrat */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-[2rem] shadow-xl overflow-hidden relative">
                            <div className="bg-orange-500 p-6 text-white flex justify-between items-center uppercase">
                                <h2 className="text-sm font-black tracking-tight">Modifier le Contrat</h2>
                                <button onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleEditContract} className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Description des travaux</label>
                                    <input required value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Montant convenu (DH)</label>
                                        <input required type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="0" className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Statut</label>
                                        <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full p-3 bg-stone-50 border rounded-xl font-bold text-sm">
                                            <option value="En cours">En cours</option>
                                            <option value="Terminé">Terminé</option>
                                            <option value="Annulé">Annulé</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-orange-500 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-md hover:bg-orange-600 transition-all">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Enregistrer les Modifications'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

