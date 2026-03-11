'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
    Wallet,
    TrendingDown,
    Banknote,
    Loader2,
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

export default function FinancePage() {
    const [loading, setLoading] = useState(true);

    // Données financières
    const [totalFacture, setTotalFacture] = useState(0);
    const [totalEncaisse, setTotalEncaisse] = useState(0);
    const [resteAEncaisser, setResteAEncaisser] = useState(0);

    const [coutMateriaux, setCoutMateriaux] = useState(0);
    const [coutOuvriers, setCoutOuvriers] = useState(0);
    
    const [totalSousTraite, setTotalSousTraite] = useState(0);
    const [totalPayeSousTraitants, setTotalPayeSousTraitants] = useState(0);
    const [resteAPayerSousTraitants, setResteAPayerSousTraitants] = useState(0);

    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        fetchAccountingData();
    }, []);

    async function fetchAccountingData() {
        try {
            setLoading(true);

            // 1. Revenus (Entrées d'argent)
            const { data: revenues } = await supabase.from('revenues').select('amount, status, payment_date');
            let facture = 0;
            let encaisse = 0;
            const flowMap: Record<string, { in: number, out: number }> = {};

            if (revenues) {
                revenues.forEach(rev => {
                    const amt = Number(rev.amount) || 0;
                    facture += amt;
                    if (rev.status === 'Réglée' || rev.status === 'Payée partiellement') {
                        // Simplification: si réglé, on compte tout. Si partiel, on ne sait pas exactement combien ici sans la table paiements, mais on va assumer que l'amount de la facture réglée est encaissé.
                        // Pour une vraie V2, il faudrait sommer la table 'payments'
                        if (rev.status === 'Réglée') encaisse += amt;
                    }

                    // Pour le graphique
                    if (rev.payment_date && rev.status === 'Réglée') {
                        const month = new Date(rev.payment_date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
                        if (!flowMap[month]) flowMap[month] = { in: 0, out: 0 };
                        flowMap[month].in += amt;
                    }
                });
            }
            setTotalFacture(facture);
            setTotalEncaisse(encaisse);
            setResteAEncaisser(facture - encaisse);

            // 2. Coûts internes (Matériaux & Ouvriers)
            const { data: materials } = await supabase.from('materials').select('quantity_used, unit_price, consumption_date');
            let cMats = 0;
            if (materials) {
                materials.forEach(m => {
                    const cost = (m.quantity_used || 0) * (m.unit_price || 0);
                    cMats += cost;

                    if (m.consumption_date) {
                        const month = new Date(m.consumption_date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
                        if (!flowMap[month]) flowMap[month] = { in: 0, out: 0 };
                        flowMap[month].out += cost;
                    }
                });
            }
            setCoutMateriaux(cMats);

            const { data: points } = await supabase.from('daily_points').select('quantity, unit_price, pointing_date');
            let cOuv = 0;
            if (points) {
                points.forEach(p => {
                    const cost = (p.quantity || 0) * (p.unit_price || 0);
                    cOuv += cost;

                    if (p.pointing_date) {
                        const month = new Date(p.pointing_date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
                        if (!flowMap[month]) flowMap[month] = { in: 0, out: 0 };
                        flowMap[month].out += cost;
                    }
                });
            }
            setCoutOuvriers(cOuv);

            // 3. Sous-traitance
            const { data: subcontracts } = await supabase.from('subcontracts').select('agreed_amount, paid_amount');
            let cSousTraiteConvenu = 0;
            let cSousTraitePaye = 0;
            if (subcontracts) {
                subcontracts.forEach(s => {
                    cSousTraiteConvenu += Number(s.agreed_amount) || 0;
                    const paid = Number(s.paid_amount) || 0;
                    cSousTraitePaye += paid;
                    // Note: Ideally payments to subcontractor also go to flowMap to see exact cash out dates.
                });
            }
            setTotalSousTraite(cSousTraiteConvenu);
            setTotalPayeSousTraitants(cSousTraitePaye);
            setResteAPayerSousTraitants(cSousTraiteConvenu - cSousTraitePaye);

            // Trier et formater les données du graphique
            const sortedMonths = Object.keys(flowMap).sort((a, b) => {
                const [monthA, yearA] = a.split(' ');
                const [monthB, yearB] = b.split(' ');
                const dateA = new Date(`1 ${monthA} ${yearA}`);
                const dateB = new Date(`1 ${monthB} ${yearB}`);
                return dateA.getTime() - dateB.getTime();
            });

            const finalChartData = sortedMonths.map(month => ({
                Mois: month,
                Entrées: flowMap[month].in,
                Sorties: flowMap[month].out,
                Trésorerie: flowMap[month].in - flowMap[month].out
            }));
            
            setChartData(finalChartData);

        } catch (error: any) {
            console.error('Erreur finance:', error.message);
        } finally {
            setLoading(false);
        }
    }

    // Calculs finaux
    const totalSorties = coutMateriaux + coutOuvriers + totalPayeSousTraitants;
    const tresorerieNette = totalEncaisse - totalSorties;
    const margeVirtuelle = totalFacture - (coutMateriaux + coutOuvriers + totalSousTraite);

    const handleExport = (format: 'pdf' | 'excel') => {
        // Logique simplifiée pour l'export du bilan
        const rows = [
            ['Chiffre d\'Affaires Global', totalFacture + ' DH', totalEncaisse + ' DH', resteAEncaisser + ' DH'],
            ['Sous-Traitants', totalSousTraite + ' DH', totalPayeSousTraitants + ' DH', resteAPayerSousTraitants + ' DH'],
            ['Matériaux (Payé)', coutMateriaux + ' DH', coutMateriaux + ' DH', '0 DH'],
            ['Main d\'Oeuvre (Payé)', coutOuvriers + ' DH', coutOuvriers + ' DH', '0 DH'],
        ];

        const columns = ['Catégorie', 'Montant Engagé', 'Flux Réel (Payé/Encaissé)', 'Reste (Dette/Créance)'];

        if (format === 'excel') {
            const data = [
                { Catégorie: 'CA Client', Engagé: totalFacture, Flux: totalEncaisse, Reste: resteAEncaisser },
                { Catégorie: 'Sous-traitants', Engagé: totalSousTraite, Flux: totalPayeSousTraitants, Reste: resteAPayerSousTraitants },
                { Catégorie: 'Matériaux', Engagé: coutMateriaux, Flux: coutMateriaux, Reste: 0 },
                { Catégorie: 'Ouvriers', Engagé: coutOuvriers, Flux: coutOuvriers, Reste: 0 },
            ];
            exportToExcel(data, 'Bilan_Comptable');
        } else {
            const summary = [
                { label: 'Trésorerie Nette Active', value: tresorerieNette.toLocaleString() + ' DH' },
                { label: 'Marge Nette (Théorique)', value: margeVirtuelle.toLocaleString() + ' DH' }
            ];
            exportToPDF('Bilan Comptable & Trésorerie', columns, rows, 'Bilan_Comptable', summary);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-stone-900">Bilan Financier</h1>
                    <p className="text-stone-500 mt-0.5 font-medium text-sm">Trésorerie réelle, créances clients et dettes fournisseurs.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex bg-white p-1 rounded-xl border border-stone-200 gap-1 h-fit shadow-sm">
                        <button onClick={() => handleExport('pdf')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-50 flex items-center gap-1.5">
                            <FileText size={12} /> PDF Bilan
                        </button>
                        <button onClick={() => handleExport('excel')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100 flex items-center gap-1.5">
                            <FileSpreadsheet size={12} /> EXCEL
                        </button>
                    </div>
                    <div className={cn("flex items-center gap-4 px-5 py-3 rounded-2xl border shadow-sm", tresorerieNette >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100")}>
                        <div className={cn("p-2 rounded-xl", tresorerieNette >= 0 ? "bg-emerald-100" : "bg-red-100")}>
                            {tresorerieNette >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Trésorerie Nette (Banque)</span>
                            <span className="text-xl font-black mt-1">{tresorerieNette.toLocaleString()} <span className="text-xs font-bold opacity-60">DH</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vue d'ensemble (Balance) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* BLOC ENTREES */}
                <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm border-t-4 border-t-emerald-500">
                    <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <TrendingUp size={16} className="text-emerald-500" /> Flux Entrants (Clients)
                    </h2>
                    
                    <div className="space-y-5">
                        <div className="flex justify-between items-end border-b border-stone-50 pb-4">
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">Chiffre d'Affaires Global</p>
                                <p className="text-2xl font-black text-stone-900 mt-1">{totalFacture.toLocaleString()} <span className="text-sm">DH</span></p>
                            </div>
                            <Receipt size={32} className="text-stone-200" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Encaissé</p>
                                <p className="text-lg font-black text-emerald-700 leading-tight mt-1">+{totalEncaisse.toLocaleString()} DH</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Reste à Encaisser</p>
                                <p className="text-lg font-black text-amber-700 leading-tight mt-1">{resteAEncaisser.toLocaleString()} DH</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOC SORTIES */}
                <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm border-t-4 border-t-red-500">
                    <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <TrendingDown size={16} className="text-red-500" /> Flux Sortants (Dépenses)
                    </h2>
                    
                    <div className="space-y-5">
                        <div className="flex justify-between items-end border-b border-stone-50 pb-4">
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">Total Décaissements</p>
                                <p className="text-2xl font-black text-stone-900 mt-1">{totalSorties.toLocaleString()} <span className="text-sm">DH</span></p>
                            </div>
                            <Wallet size={32} className="text-stone-200" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex flex-col justify-end">
                                <div className="mb-2 text-stone-400"><Hammer size={14}/></div>
                                <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Matériaux</p>
                                <p className="text-sm font-black text-stone-900">{coutMateriaux.toLocaleString()} <span className="text-[9px] font-bold opacity-60">DH</span></p>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex flex-col justify-end">
                                <div className="mb-2 text-stone-400"><Users2 size={14}/></div>
                                <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Ouvriers</p>
                                <p className="text-sm font-black text-stone-900">{coutOuvriers.toLocaleString()} <span className="text-[9px] font-bold opacity-60">DH</span></p>
                            </div>
                            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex flex-col justify-end">
                                <div className="mb-2 text-stone-400"><Wrench size={14}/></div>
                                <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">S/Traitants</p>
                                <p className="text-sm font-black text-stone-900">{totalPayeSousTraitants.toLocaleString()} <span className="text-[9px] font-bold opacity-60">DH</span></p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Dettes Sous-traitants & Marge Globale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-6">
                    <div className="p-4 bg-red-50 text-red-500 rounded-2xl shrink-0">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Balance Fournisseurs (Dettes)</p>
                        <h3 className="text-2xl font-black text-stone-900">{resteAPayerSousTraitants.toLocaleString()} <span className="text-sm">DH</span></h3>
                        <p className="text-xs text-stone-500 font-bold mt-1">Reste à payer aux sous-traitants d'après les contrats.</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-6">
                    <div className="p-4 bg-[#c97423]/10 text-[#c97423] rounded-2xl shrink-0">
                        <Scale size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Marge Globale Estimée</p>
                        <h3 className="text-2xl font-black text-stone-900">{margeVirtuelle.toLocaleString()} <span className="text-sm">DH</span></h3>
                        <p className="text-xs text-stone-500 font-bold mt-1">Si tout le CA est encaissé et toutes les charges réglées.</p>
                    </div>
                </div>
            </div>

            {/* Graphique de Cashflow */}
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm h-[22rem] flex flex-col">
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Banknote size={16} className="text-[#c97423]" /> Évolution des Flux de Trésorerie
                </h2>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                            <XAxis dataKey="Mois" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 700 }} dy={10} />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #f5f5f4', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }} />
                            <Area type="monotone" name="Entrées" dataKey="Entrées" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEn)" />
                            <Area type="monotone" name="Sorties" dataKey="Sorties" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-400 gap-2">
                        <Banknote size={32} className="opacity-40" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Aucune donnée temporelle</span>
                    </div>
                )}
            </div>

        </div>
    );
}
