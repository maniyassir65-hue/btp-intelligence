'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Wallet,
    TrendingDown,
    Banknote,
    TrendingUp,
    FileText,
    FileSpreadsheet,
    Receipt,
    Scale,
    Wrench,
    Users2,
    Hammer,
    AlertCircle
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function FinanceClient({ stats, chartData }: any) {
    const handleExport = (format: 'pdf' | 'excel') => {
        const columns = ['Catégorie', 'Montant Engagé', 'Flux Réel (Payé/Encaissé)', 'Reste'];
        const rows = [
            ['Chiffre d\'Affaires Global', stats.totalFacture + ' DH', stats.totalEncaisse + ' DH', stats.resteAEncaisser + ' DH'],
            ['Sous-Traitants', stats.totalSousTraite + ' DH', stats.totalPayeSousTraitants + ' DH', stats.resteAPayerSousTraitants + ' DH'],
            ['Matériaux (Payé)', stats.coutMateriaux + ' DH', stats.coutMateriaux + ' DH', '0 DH'],
            ['Main d\'Oeuvre (Payé)', stats.coutOuvriers + ' DH', stats.coutOuvriers + ' DH', '0 DH'],
        ];

        if (format === 'excel') exportToExcel(rows.map(r => ({ Catégorie: r[0], Engagé: r[1], Flux: r[2], Reste: r[3] })), 'Bilan_Comptable');
        else exportToPDF('Bilan Comptable & Trésorerie', columns, rows, 'Bilan_Global', [{ label: 'Trésorerie Nette', value: stats.tresorerieNette.toLocaleString() + ' DH' }]);
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900 uppercase">Comptabilité</h1>
                    <p className="text-stone-500 mt-0.5 font-bold text-xs">Trésorerie réelle, créances clients et dettes fournisseurs.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex bg-white p-1 rounded-xl border border-stone-200 gap-1 h-fit shadow-sm">
                        <button onClick={() => handleExport('pdf')} className="px-3 py-1.5 text-[10px] font-black uppercase text-red-600 bg-red-50 rounded-lg transition-colors border border-red-50 flex items-center gap-1.5"><FileText size={12} /> Bilan</button>
                        <button onClick={() => handleExport('excel')} className="px-3 py-1.5 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 rounded-lg transition-colors border border-emerald-100 flex items-center gap-1.5"><FileSpreadsheet size={12} /> Excel</button>
                    </div>
                    <div className={cn("flex items-center gap-4 px-6 py-3 rounded-2xl border shadow-sm", stats.tresorerieNette >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100")}>
                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Banque Actuelle</span>
                            <span className="text-xl font-black mt-1">{stats.tresorerieNette.toLocaleString()} <span className="text-xs font-bold opacity-60">DH</span></span>
                        </div>
                        {stats.tresorerieNette >= 0 ? <TrendingUp size={24} className="text-emerald-500" /> : <TrendingDown size={24} className="text-red-500" />}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm border-t-4 border-t-emerald-500">
                    <h2 className="text-[10px] font-black text-stone-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-8"><TrendingUp size={16} className="text-emerald-500" /> Revenus Clients</h2>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-stone-50 pb-6">
                            <div><p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Chiffre d'Affaires Global</p><p className="text-3xl font-black text-stone-900 mt-1">{stats.totalFacture.toLocaleString()} <span className="text-base">DH</span></p></div>
                            <Receipt size={40} className="text-stone-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Encaissé</p>
                                <p className="text-xl font-black text-emerald-700 leading-tight mt-2">+{stats.totalEncaisse.toLocaleString()} DH</p>
                            </div>
                            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">A Encaisser</p>
                                <p className="text-xl font-black text-amber-700 leading-tight mt-2">{stats.resteAEncaisser.toLocaleString()} DH</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm border-t-4 border-t-red-500">
                    <h2 className="text-[10px] font-black text-stone-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-8"><TrendingDown size={16} className="text-red-500" /> Dépenses & Coûts</h2>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-stone-50 pb-6">
                            <div><p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest leading-none">Total Décaissements</p><p className="text-3xl font-black text-stone-900 mt-1">{stats.totalSorties.toLocaleString()} <span className="text-base">DH</span></p></div>
                            <Wallet size={40} className="text-stone-100" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><Hammer size={12} className="text-stone-300"/><p className="text-[10px] font-black text-stone-500 uppercase mt-2">Matériaux</p><p className="text-md font-black text-stone-900">{stats.coutMateriaux.toLocaleString()} DH</p></div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><Users2 size={12} className="text-stone-300"/><p className="text-[10px] font-black text-stone-500 uppercase mt-2">Ouvriers</p><p className="text-md font-black text-stone-900">{stats.coutOuvriers.toLocaleString()} DH</p></div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100"><Wrench size={12} className="text-stone-300"/><p className="text-[10px] font-black text-stone-500 uppercase mt-2">S/Traitance</p><p className="text-md font-black text-stone-900">{stats.totalPayeSousTraitants.toLocaleString()} DH</p></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-bold">
                <div className="bg-white p-6 rounded-3xl border border-stone-100 flex items-center gap-5 shadow-sm">
                    <div className="p-4 bg-red-50 text-red-500 rounded-2xl"><AlertCircle size={24} /></div>
                    <div><p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Dettes Fournisseurs</p><h3 className="text-2xl font-black text-stone-900 leading-none mt-1">{stats.resteAPayerSousTraitants.toLocaleString()} DH</h3><p className="text-[9px] text-stone-400 uppercase tracking-tight mt-1">Reste à payer aux contrats de sous-traitance</p></div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-stone-100 flex items-center gap-5 shadow-sm">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Scale size={24} /></div>
                    <div><p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Profit Théorique</p><h3 className="text-2xl font-black text-[#c97423] leading-none mt-1">{stats.margeVirtuelle.toLocaleString()} DH</h3><p className="text-[9px] text-stone-400 uppercase tracking-tight mt-1">Si tout est encaissé et payé selon engagements</p></div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm h-[25rem] flex flex-col">
                <h2 className="text-[10px] font-black text-stone-900 uppercase tracking-[0.2em] mb-8">Evolution Mensuelle</h2>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorEn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                            <XAxis dataKey="Mois" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 800 }} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }} />
                            <Area type="monotone" name="Entrées" dataKey="Entrées" stroke="#10b981" strokeWidth={4} fill="url(#colorEn)" />
                            <Area type="monotone" name="Sorties" dataKey="Sorties" stroke="#ef4444" strokeWidth={4} fill="url(#colorOut)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
