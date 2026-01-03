import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe, PLANS } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin;

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { planId, billingCycle, barbershopId } = req.body;
    const plan = PLANS.find(p => p.id === planId);

    if (!plan || !billingCycle || !barbershopId) {
        return res.status(400).json({ error: 'Dados incompletos.' });
    }

    try {
        const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
        const productName = `Plano ${plan.name} (${billingCycle === 'annual' ? 'Anual' : 'Mensal'})`;

        // Para simplificar, estamos criando um pagamento único recorrente.
        // Em um cenário real de SaaS, você criaria Products e Prices no Stripe e usaria seus IDs.
        // Aqui usaremos price_data ad-hoc para criar a assinatura/pagamento.
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: productName,
                        description: 'Assinatura BarberAI',
                    },
                    unit_amount: Math.round(price * 100),
                    // Se quiser assinatura real recorrente, descomente:
                    // recurring: { interval: billingCycle === 'annual' ? 'year' : 'month' }, 
                },
                quantity: 1,
            }],
            mode: 'payment', // Use 'subscription' se ativar recurring acima
            success_url: `${frontendUrl}/#settings?payment_status=success`,
            cancel_url: `${frontendUrl}/#settings?payment_status=failure`,
            metadata: {
                purchase_type: 'plan_subscription',
                plan_id: planId,
                billing_cycle: billingCycle,
                barbershop_id: barbershopId
            },
        });

        res.status(200).json({ url: session.url });

    } catch (error: any) {
        console.error('Erro Stripe Plan Checkout:', error);
        res.status(500).json({ error: error.message });
    }
}