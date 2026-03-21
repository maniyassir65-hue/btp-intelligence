'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addProjectAction(formData: FormData) {
    const name = formData.get('name') as string;
    const client_name = formData.get('client_name') as string;
    const city = formData.get('city') as string;
    const global_budget = parseFloat(formData.get('global_budget') as string) || 0;

    const { data, error } = await supabase
        .from('projects')
        .insert([{
            name,
            client_name,
            city,
            global_budget,
            budget_materials: 0,
            budget_workers: 0,
            budget_subcontractors: 0
        }])
        .select('id, name, city, client_name')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/projects');
    return data;
}

export async function addWorkerAction(formData: FormData) {
    const full_name = formData.get('full_name') as string;
    const cin = formData.get('cin') as string;
    const phone = formData.get('phone') as string;
    const specialty = formData.get('specialty') as string;
    const daily_rate = parseFloat(formData.get('daily_rate') as string) || 0;

    const { data, error } = await supabase
        .from('workers')
        .insert([{
            full_name,
            cin,
            phone_number: phone,
            specialty,
            daily_rate
        }])
        .select('id, full_name, cin, specialty, phone_number, daily_rate')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/workers');
    return data;
}

export async function addBuildingAction(projectId: string, name: string) {
    const { data, error } = await supabase
        .from('buildings')
        .insert([{ name, project_id: projectId }])
        .select('id, name, project_id')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath(`/projects/${projectId}`);
    return data;
}

export async function addLevelAction(projectId: string, buildingId: string, name: string) {
    const { data, error } = await supabase
        .from('levels')
        .insert([{ name, building_id: buildingId }])
        .select('id, name, building_id')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath(`/projects/${projectId}`);
    return data;
}

export async function addDailyPointAction(projectId: string, levelId: string, workerId: string, quantity: number, unitPrice: number) {
    const { data, error } = await supabase
        .from('daily_points')
        .insert([{
            level_id: levelId,
            worker_id: workerId,
            quantity,
            unit_price: unitPrice
        }])
        .select('id, level_id, worker_id, quantity, unit_price')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath(`/levels/${levelId}`);
    revalidatePath(`/projects/${projectId}`);
    return data;
}

export async function addMaterialAction(projectId: string, levelId: string, materialName: string, unitPrice: number, quantityUsed: number, quantityWasted: number, receiptUrl: string | null) {
    const { data, error } = await supabase
        .from('materials')
        .insert([{
            material_name: materialName,
            unit_price: unitPrice,
            quantity_used: quantityUsed,
            quantity_wasted: quantityWasted,
            level_id: levelId,
            receipt_url: receiptUrl
        }])
        .select('id, material_name, unit_price, quantity_used')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath(`/levels/${levelId}`);
    revalidatePath(`/projects/${projectId}`);
    return data;
}

export async function addRevenueAction(projectId: string, designation: string, amount: number, status: string, paymentDate: string | null) {
    const { data, error } = await supabase
        .from('revenues')
        .insert([{
            project_id: projectId,
            designation,
            amount,
            status,
            payment_date: paymentDate
        }])
        .select('id, designation, amount, status, payment_date, project_id, created_at')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath(`/projects/${projectId}`);
    return data;
}

export async function updateRevenueAction(revenueId: string, projectId: string, designation: string, amount: number, status: string, paymentDate: string | null) {
    const { data, error } = await supabase
        .from('revenues')
        .update({
            designation,
            amount,
            status,
            payment_date: paymentDate
        })
        .eq('id', revenueId)
        .select('id, designation, amount, status, payment_date, project_id, created_at')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath(`/projects/${projectId}`);
    return data;
}

export async function getWorkerDetailsAction(workerId: string) {
    const [paymentsRes, pointsRes] = await Promise.all([
        supabase
            .from('worker_payments')
            .select('id, worker_id, amount, payment_date, note, status, created_at')
            .eq('worker_id', workerId)
            .order('payment_date', { ascending: false }),
        
        supabase
            .from('daily_points')
            .select(`
                id, 
                pointing_date, 
                quantity,
                unit_price,
                levels (
                    name,
                    buildings (
                        name,
                        projects (name)
                    )
                )
            `)
            .eq('worker_id', workerId)
            .order('pointing_date', { ascending: false })
    ]);

    if (paymentsRes.error) console.error("Erreur paiements:", paymentsRes.error.message);
    if (pointsRes.error) console.error("Erreur points:", pointsRes.error.message);

    return {
        payments: paymentsRes.data || [],
        points: pointsRes.data || []
    };
}

export async function addWorkerPaymentAction(workerId: string, amount: number, note: string) {
    const { data, error } = await supabase
        .from('worker_payments')
        .insert([{
            worker_id: workerId,
            amount,
            note,
            payment_date: new Date().toISOString()
        }])
        .select('id, worker_id, amount, payment_date, note, status, created_at')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/workers');
    return data;
}

export async function updateWorkerPaymentAction(paymentId: string, amount: number, note: string) {
    const { data, error } = await supabase
        .from('worker_payments')
        .update({
            amount,
            note
        })
        .eq('id', paymentId)
        .select('id, worker_id, amount, payment_date, note, status, created_at')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/workers');
    return data;
}

export async function addSubcontractorAction(companyName: string, specialty: string, contactName: string, phone: string) {
    const { data, error } = await supabase
        .from('subcontractors')
        .insert([{ company_name: companyName, specialty, contact_name: contactName, phone }])
        .select('id, company_name, specialty, contact_name, phone, created_at')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/subcontractors');
    return data;
}

export async function addSubcontractAction(subcontractorId: string, projectId: string | null, description: string, agreedAmount: number, buildingId?: string | null, levelId?: string | null) {
    const { data, error } = await supabase
        .from('subcontracts')
        .insert([{
            subcontractor_id: subcontractorId,
            project_id: projectId || null,
            building_id: buildingId || null,
            level_id: levelId || null,
            description,
            agreed_amount: agreedAmount,
            paid_amount: 0,
        }])
        .select('*, subcontractors(company_name, specialty), projects(name)')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/subcontractors');
    return data;
}

export async function addSubcontractPaymentAction(contractId: string, currentPaid: number, amount: number) {
    const newPaid = currentPaid + amount;
    const { data, error } = await supabase
        .from('subcontracts')
        .update({ paid_amount: newPaid })
        .eq('id', contractId)
        .select('id, paid_amount')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/subcontractors');
    return data;
}

export async function updateSubcontractStatusAction(contractId: string, status: string) {
    const { error } = await supabase
        .from('subcontracts')
        .update({ status })
        .eq('id', contractId);

    if (error) throw new Error(error.message);
    
    revalidatePath('/subcontractors');
    return { success: true };
}

export async function updateSubcontractAction(contractId: string, description: string, agreedAmount: number, status: string) {
    const { data, error } = await supabase
        .from('subcontracts')
        .update({ description, agreed_amount: agreedAmount, status })
        .eq('id', contractId)
        .select('*, subcontractors(company_name, specialty), projects(name)')
        .single();

    if (error) throw new Error(error.message);
    
    revalidatePath('/subcontractors');
    return data;
}

export async function deleteSubcontractAction(contractId: string) {
    const { error } = await supabase
        .from('subcontracts')
        .delete()
        .eq('id', contractId);

    if (error) throw new Error(error.message);
    
    revalidatePath('/subcontractors');
    return { success: true };
}

// User Management Actions
export async function getProfilesAction() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

export async function updateProfileRoleAction(userId: string, role: string) {
    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

    if (error) throw new Error(error.message);
    
    revalidatePath('/users');
    revalidatePath('/'); // Refresh dashboard if roles change
    return { success: true };
}



