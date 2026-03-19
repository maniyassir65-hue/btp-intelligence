import { supabase } from '@/lib/supabase';
import FinanceClient from './FinanceClient';

export const revalidate = 0;

export default async function FinancePage() {
    // Parallel fetching for all accounting data
    const [revRes, matRes, pointRes, subRes] = await Promise.all([
        supabase.from('revenues').select('amount, status, payment_date'),
        supabase.from('materials').select('quantity_used, unit_price, consumption_date'),
        supabase.from('daily_points').select('quantity, unit_price, pointing_date'),
        supabase.from('subcontracts').select('agreed_amount, paid_amount')
    ]);

    // Data Processing on Server
    const revenues = revRes.data || [];
    const materials = matRes.data || [];
    const points = pointRes.data || [];
    const subcontracts = subRes.data || [];

    let totalFacture = 0;
    let totalEncaisse = 0;
    const flowMap: Record<string, { in: number, out: number }> = {};

    revenues.forEach(rev => {
        const amt = Number(rev.amount) || 0;
        totalFacture += amt;
        if (rev.status === 'Réglée') totalEncaisse += amt;
        if (rev.payment_date && rev.status === 'Réglée') {
            const m = new Date(rev.payment_date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
            if (!flowMap[m]) flowMap[m] = { in: 0, out: 0 };
            flowMap[m].in += amt;
        }
    });

    let coutMateriaux = 0;
    materials.forEach(m => {
        const c = (m.quantity_used || 0) * (m.unit_price || 0);
        coutMateriaux += c;
        if (m.consumption_date) {
            const mon = new Date(m.consumption_date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
            if (!flowMap[mon]) flowMap[mon] = { in: 0, out: 0 };
            flowMap[mon].out += c;
        }
    });

    let coutOuvriers = 0;
    points.forEach(p => {
        const c = (p.quantity || 0) * (p.unit_price || 0);
        coutOuvriers += c;
        if (p.pointing_date) {
            const mon = new Date(p.pointing_date).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
            if (!flowMap[mon]) flowMap[mon] = { in: 0, out: 0 };
            flowMap[mon].out += c;
        }
    });

    let totalSousTraite = 0;
    let totalPayeSousTraitants = 0;
    subcontracts.forEach(s => {
        totalSousTraite += Number(s.agreed_amount) || 0;
        totalPayeSousTraitants += Number(s.paid_amount) || 0;
    });

    const totalSorties = coutMateriaux + coutOuvriers + totalPayeSousTraitants;
    const tresorerieNette = totalEncaisse - totalSorties;
    const stats = {
        totalFacture,
        totalEncaisse,
        resteAEncaisser: totalFacture - totalEncaisse,
        coutMateriaux,
        coutOuvriers,
        totalSousTraite,
        totalPayeSousTraitants,
        resteAPayerSousTraitants: totalSousTraite - totalPayeSousTraitants,
        totalSorties,
        tresorerieNette,
        margeVirtuelle: totalFacture - (coutMateriaux + coutOuvriers + totalSousTraite)
    };

    const sortedMonths = Object.keys(flowMap).sort((a, b) => {
        const [mA, yA] = a.split(' ');
        const [mB, yB] = b.split(' ');
        return new Date(`1 ${mA} ${yA}`).getTime() - new Date(`1 ${mB} ${yB}`).getTime();
    });

    const chartData = sortedMonths.map(m => ({
        Mois: m,
        Entrées: flowMap[m].in,
        Sorties: flowMap[m].out,
        Trésorerie: flowMap[m].in - flowMap[m].out
    }));

    return <FinanceClient stats={stats} chartData={chartData} />;
}
