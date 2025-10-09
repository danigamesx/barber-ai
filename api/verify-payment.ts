import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database, TablesInsert } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { preferenceId, barbershopId } = req.body;

    if (!preferenceId || !barbershopId) {
        return res.status(400).json({ error: 'Preference ID and Barbershop ID are required.' });
    }

    try {
        // 1. Get Barbershop's MP Access Token
        const { data: barbershop, error: fetchError } = await supabaseAdmin
            .from('barbershops')
            .select('integrations')
            .eq('id', barbershopId)
            .single();

        if (fetchError || !barbershop) {
            console.error(`Verify Payment Error: Cannot find barbershop with ID ${barbershopId}.`, fetchError);
            return res.status(404).json({ error: 'Barbershop not found.' });
        }

        const integrations = barbershop.integrations as IntegrationSettings;
        const accessToken = integrations?.mercadopagoAccessToken;

        if (!accessToken) {
            return res.status(400).json({ error: 'This barbershop is not configured for online payments.' });
        }

        // 2. Query Mercado Pago for the payment using the preference ID
        const client = new MercadoPagoConfig({ accessToken });
        const paymentClient = new Payment(client);

        const searchResult = await paymentClient.search({
            options: {
                preference_id: preferenceId,
                sort: 'date_created',
                criteria: 'desc'
            }
        });
        
        const approvedPayment = searchResult.results?.find(p => p.status === 'approved');

        if (!approvedPayment) {
            return res.status(200).json({ status: 'pending' });
        }
        
        // 3. (CRITICAL) Check if appointment already exists to prevent duplicates
        const { data: existingAppointment } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .eq('mp_preference_id', preferenceId)
            .limit(1);

        if (existingAppointment && existingAppointment.length > 0) {
            console.log(`Verify Payment: Appointment for preference ${preferenceId} already exists. Responding success.`);
            return res.status(200).json({ status: 'approved' });
        }
        
        // 4. Create the appointment if it doesn't exist
        const appointmentData = approvedPayment.metadata as any;
        if (!appointmentData || typeof appointmentData !== 'object') {
            console.error(`Verify Payment Error: Metadata missing or invalid in payment ${approvedPayment.id}.`);
            return res.status(500).json({ error: 'Payment metadata is missing.' });
        }
        
        const appointmentForDb: TablesInsert<'appointments'> = {
            client_id: appointmentData.client_id,
            client_name: appointmentData.client_name,
            barbershop_id: appointmentData.barbershop_id,
            barber_id: appointmentData.barber_id,
            barber_name: appointmentData.barber_name,
            service_id: appointmentData.service_id,
            service_name: appointmentData.service_name,
            price: Number(appointmentData.price),
            start_time: appointmentData.start_time,
            end_time: appointmentData.end_time,
            notes: appointmentData.notes,
            status: 'paid',
            is_reward: appointmentData.is_reward,
            mp_preference_id: preferenceId,
        };
        
        const { error: insertError } = await supabaseAdmin.from('appointments').insert(appointmentForDb);

        if (insertError) {
            console.error(`Verify Payment DB Error: Failed to create appointment for payment ${approvedPayment.id}.`, insertError);
            return res.status(500).json({ error: 'Failed to save appointment.' });
        }

        console.log(`Verify Payment Success: Appointment created for payment ${approvedPayment.id}.`);
        res.status(200).json({ status: 'approved' });

    } catch (error: any) {
        console.error('Verify Payment Internal Error:', error.message || error);
        res.status(500).json({ error: 'Internal server error while verifying payment.' });
    }
}
