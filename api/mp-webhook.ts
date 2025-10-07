
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
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
                const { status, external_reference } = payment;
                
                console.log(`Webhook processing: PaymentID=${paymentId}, Status=${status}, Ref=${external_reference}`);

                if (status === 'approved' && external_reference) {
                    const appointmentId = external_reference;

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
