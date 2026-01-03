import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings, ServicePackage, SubscriptionPlan } from '../src/types';
import { stripe } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { appointmentData, packageData } = req.body;

    // Helper para gerar URLs de redirecionamento
    const buildSuccessUrl = (path: string) => {
        const baseUrl = `${frontendUrl}/#${path}`;
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}payment_status=success`;
    };
    
    const buildCancelUrl = (path: string) => {
        const baseUrl = `${frontendUrl}/#${path}`;
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}payment_status=failure`;
    };

    try {
        let session;
        let connectedAccountId;

        if (packageData) {
            // Lógica para Pacotes e Assinaturas (Barbearia vendendo para cliente)
            const { type, itemId, barbershopId, userId, userEmail } = packageData;
            
            const { data: barbershop, error } = await supabaseAdmin
                .from('barbershops')
                .select('integrations, name, packages, subscriptions, slug')
                .eq('id', barbershopId)
                .single();

            if (error || !barbershop) throw new Error('Barbearia não encontrada.');

            const integrations = barbershop.integrations as IntegrationSettings;
            connectedAccountId = integrations?.stripeAccountId;

            if (!connectedAccountId || !integrations.stripeAccountOnboarded) {
                return res.status(400).json({ error: 'Barbearia não conectada ao Stripe.' });
            }

            let itemDetails;
            if (type === 'package') {
                const packages = (barbershop.packages as ServicePackage[]) || [];
                itemDetails = packages.find(p => p.id === itemId);
            } else {
                const subscriptions = (barbershop.subscriptions as SubscriptionPlan[]) || [];
                itemDetails = subscriptions.find(s => s.id === itemId);
            }

            if (!itemDetails) {
                return res.status(404).json({ error: 'Item não encontrado.' });
            }

            const returnPath = barbershop.slug ? `/${barbershop.slug}` : `/?barbershopId=${barbershopId}`;

            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `${type === 'package' ? 'Pacote' : 'Assinatura'}: ${itemDetails.name}`,
                            description: `Compra na ${barbershop.name}`,
                        },
                        unit_amount: Math.round(itemDetails.price * 100), // Stripe usa centavos
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: buildSuccessUrl(returnPath),
                cancel_url: buildCancelUrl(returnPath),
                customer_email: userEmail,
                payment_intent_data: {
                    application_fee_amount: Math.round(itemDetails.price * 100 * 0.05), // Ex: 5% de taxa da plataforma
                    transfer_data: {
                        destination: connectedAccountId,
                    },
                },
                metadata: {
                    purchase_type: type,
                    user_id: userId,
                    barbershop_id: barbershopId,
                    item_id: itemId
                },
            });

        } else if (appointmentData) {
            // Lógica para Agendamentos (Barbearia vendendo serviço)
            const { barbershop_id, service_name, price, client_name, barber_name, service_id, client_id, start_time, end_time } = appointmentData;

            const { data: barbershop, error } = await supabaseAdmin
                .from('barbershops')
                .select('integrations, name, slug')
                .eq('id', barbershop_id)
                .single();

            if (error || !barbershop) throw new Error('Barbearia não encontrada.');

            const integrations = barbershop.integrations as IntegrationSettings;
            connectedAccountId = integrations?.stripeAccountId;

            if (!connectedAccountId || !integrations.stripeAccountOnboarded) {
                return res.status(400).json({ error: 'Barbearia não conectada ao Stripe.' });
            }

            const returnPath = barbershop.slug ? `/${barbershop.slug}` : `/?barbershopId=${barbershop_id}`;

            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `Agendamento: ${service_name}`,
                            description: `${barber_name} - ${new Date(start_time).toLocaleString('pt-BR')}`,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: buildSuccessUrl(returnPath),
                cancel_url: buildCancelUrl(returnPath),
                payment_intent_data: {
                    application_fee_amount: Math.round(price * 100 * 0.02), // Ex: 2% de taxa da plataforma em agendamentos
                    transfer_data: {
                        destination: connectedAccountId,
                    },
                },
                metadata: {
                    purchase_type: 'appointment',
                    barbershop_id,
                    client_id,
                    service_id,
                    barber_name,
                    client_name,
                    start_time,
                    end_time,
                    price: price.toString(),
                    service_name
                },
            });
        }

        if (!session) throw new Error('Falha ao criar sessão de checkout.');

        res.status(200).json({ url: session.url });

    } catch (error: any) {
        console.error('Erro Stripe Checkout:', error);
        res.status(500).json({ error: error.message });
    }
}