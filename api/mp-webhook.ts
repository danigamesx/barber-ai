import type { VercelRequest, VercelResponse } from '@vercel/node';
import mercadopago from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings } from '../src/types';

// IMPORTANT: Use environment variables for Supabase credentials on the server-side.
const supabaseAdmin = createClient<Database>(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { body, query } = req;
    
    // Respond to Mercado Pago immediately to prevent timeouts and retries.
    res.status(200).send('OK');

    // Process the notification asynchronously after responding.
    if (body.type === 'payment' && body.data?.id) {
        const paymentId = body.data.id as string;
        const barbershopId = query.barbershop_id as string;

        if (!barbershopId) {
            console.error('Webhook Error: Missing barbershop_id in notification URL query.');
            return; // Exit after sending OK
        }

        try {
            // 1. Fetch the barbershop's access token using the admin client
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

            // 2. Configure Mercado Pago instance with the correct token
            mercadopago.configure({ access_token: accessToken });
            
            // 3. Get payment details from Mercado Pago
            const payment = await mercadopago.payment.get(paymentId);
            
            if (payment?.body) {
                const { status, external_reference } = payment.body;
                
                console.log(`Webhook processing: PaymentID=${paymentId}, Status=${status}, Ref=${external_reference}`);

                // 4. If payment is approved, update the appointment in our DB
                if (status === 'approved' && external_reference) {
                    const appointmentId = external_reference;

                    // 5. Update appointment status to 'paid'
                    const { error: updateError } = await supabaseAdmin
                        .from('appointments')
                        .update({ status: 'paid' })
                        .eq('id', appointmentId);
                    
                    if (updateError) {
                        console.error(`Webhook DB Error: Failed to update appointment ${appointmentId} to 'paid'.`, updateError);
                    } else {
                        console.log(`Webhook Success: Appointment ${appointmentId} updated to 'paid'.`);
                    }
                }
            }
        } catch (error: any) {
            console.error('Webhook Internal Error:', error.message || error);
        }
    }
}
