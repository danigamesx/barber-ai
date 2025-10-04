import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// Defina a taxa da sua plataforma em centavos (ex: R$ 2,50 = 250)
const PLATFORM_FEE_IN_CENTS = 250; 

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { appointmentData, barbershopStripeAccountId } = req.body;

    if (!appointmentData || !barbershopStripeAccountId) {
        return res.status(400).send('Appointment data and barbershop Stripe Account ID are required.');
    }

    const amountInCents = Math.round((appointmentData.price || 0) * 100);

    if (amountInCents <= 0) {
        return res.status(400).send('Amount must be positive.');
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'brl',
            application_fee_amount: PLATFORM_FEE_IN_CENTS,
            transfer_data: {
                destination: barbershopStripeAccountId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                appointment_details: `${appointmentData.service_name} com ${appointmentData.barber_name}`,
                client_id: appointmentData.client_id,
                barbershop_id: appointmentData.barbershop_id,
            }
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret });

    } catch (error: any) {
        console.error("Error creating PaymentIntent:", error);
        res.status(500).send(error.message || 'Internal Server Error');
    }
}
