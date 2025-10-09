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

    const { body, query } = req;
    
    res.status(200).send('OK');

    if (body.type === 'payment' && body.data?.id) {
        const paymentId = body.data.id as string;
        const barbershopId = query.barbershop_id as string;

        if (!barbershopId) {
            console.error('Webhook Error: Missing barbershop_id in notification URL query.');
            return;
        }

        try {
            const { data: barbershop, error: fetchError } = await supabaseAdmin
                .from('barbershops')
                .select('integrations')
                .eq('id', barbershopId)
                .single();

            if (fetchError || !barbershop) {
                console.error(`Webhook Error: Cannot find barbershop with ID ${barbershopId}.`, fetchError);
                return;
            }

            const integrations = barbershop.integrations as IntegrationSettings;
            const accessToken = integrations?.mercadopagoAccessToken;

            if (!accessToken) {
                console.error(`Webhook Error: No Mercado Pago access token for barbershop ${barbershopId}.`);
                return;
            }

            const client = new MercadoPagoConfig({ accessToken });
            
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: paymentId });
            
            if (payment) {
                // FIX: Property 'preference_id' may not exist on the type 'PaymentResponse' depending on the SDK version.
                // Accessing it as a dynamic property provides a safe workaround.
                const { status, external_reference, metadata } = payment;
                const preference_id = (payment as any).preference_id;
                
                console.log(`Webhook processing: PaymentID=${paymentId}, Status=${status}, Ref=${external_reference}`);

                if (status === 'approved' && external_reference) {
                    const { data: existingAppointment, error: checkError } = await supabaseAdmin
                        .from('appointments')
                        .select('id')
                        .eq('mp_preference_id', preference_id)
                        .limit(1);

                    if (checkError) {
                        console.error(`Webhook DB Check Error: Failed to check for existing appointment with preference_id ${preference_id}.`, checkError);
                        return;
                    }

                    if (existingAppointment && existingAppointment.length > 0) {
                        console.log(`Webhook Info: Appointment for preference_id ${preference_id} already exists. Skipping creation.`);
                        return;
                    }
                    
                    const appointmentData = metadata as any;
                    if (!appointmentData || typeof appointmentData !== 'object') {
                        console.error(`Webhook Error: Metadata missing or invalid in payment ${paymentId}.`);
                        return;
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
                        mp_preference_id: preference_id,
                        cancellation_fee: null,
                        commission_amount: null,
                        review_id: null,
                    };
                    
                    const { error: insertError } = await supabaseAdmin
                        .from('appointments')
                        .insert(appointmentForDb);
                    
                    if (insertError) {
                        console.error(`Webhook DB Error: Failed to create appointment for payment ${paymentId}. Ref=${external_reference}`, insertError);
                    } else {
                        console.log(`Webhook Success: Appointment created for payment ${paymentId}. Ref=${external_reference}`);
                    }
                }
            }
        } catch (error: any) {
            console.error('Webhook Internal Error:', error.message || error);
        }
    }
}