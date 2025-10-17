
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import { IntegrationSettings, ServicePackage, SubscriptionPlan } from '../src/types';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase environment variables are missing.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Variáveis do Supabase ausentes.' });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { appointmentData, packageData } = req.body;

    if (packageData) {
        try {
            const { type, itemId, barbershopId, userId, userName, userEmail } = packageData;
            if (!type || !itemId || !barbershopId || !userId) {
                return res.status(400).json({ error: 'Dados da compra incompletos.' });
            }

            const { data: barbershop, error: fetchError } = await supabaseAdmin
                .from('barbershops')
                .select('integrations, name, packages, subscriptions, slug')
                .eq('id', barbershopId)
                .single();
            if (fetchError) throw new Error('Barbearia não encontrada.');

            const integrations = barbershop.integrations as IntegrationSettings;
            const accessToken = integrations?.mercadopagoAccessToken;
            const publicKey = integrations?.mercadopagoPublicKey;

            if (!accessToken || !publicKey) {
                return res.status(400).json({ error: 'Esta barbearia não está configurada para pagamentos online.' });
            }

            let itemDetails;
            if (type === 'package') {
                const packages = (barbershop.packages as ServicePackage[]) || [];
                itemDetails = packages.find(p => p.id === itemId);
            } else { // subscription
                const subscriptions = (barbershop.subscriptions as SubscriptionPlan[]) || [];
                itemDetails = subscriptions.find(s => s.id === itemId);
            }

            if (!itemDetails) {
                return res.status(404).json({ error: 'Pacote ou assinatura não encontrado.' });
            }
            
            const client = new MercadoPagoConfig({ accessToken });
            const preferenceClient = new Preference(client);
            
            const transactionId = randomUUID();
            const returnPath = barbershop.slug ? `/${barbershop.slug}` : `/?barbershopId=${barbershopId}`;

            const preferenceBody = {
                items: [{
                    id: itemId,
                    title: `${type === 'package' ? 'Pacote' : 'Assinatura'}: ${itemDetails.name}`,
                    description: `Compra na barbearia ${barbershop.name}`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: Number(itemDetails.price),
                }],
                payer: { name: userName, email: userEmail },
                back_urls: {
                    success: `${req.headers.origin}/#${returnPath}?payment_status=success`,
                    failure: `${req.headers.origin}/#${returnPath}?payment_status=failure`,
                    pending: `${req.headers.origin}/#${returnPath}?payment_status=pending`,
                },
                auto_return: 'approved' as 'approved',
                notification_url: `https://${req.headers.host}/api/mp-webhook?purchase_type=${type}&barbershop_id=${barbershopId}`,
                external_reference: transactionId,
                metadata: { userId, barbershopId, itemId, type },
            };

            const mpResponse = await preferenceClient.create({ body: preferenceBody });
            
            res.status(200).json({ preferenceId: mpResponse.id, publicKey });

        } catch (error: any) {
            console.error('Erro ao criar preferência para pacote/assinatura:', error.cause || error.message);
            res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
        }
    } else if (appointmentData) {
        try {
            const { data: barbershop, error: fetchError } = await supabaseAdmin
                .from('barbershops')
                .select('integrations, name, slug')
                .eq('id', appointmentData.barbershop_id)
                .single();

            if (fetchError) {
                console.error('Supabase fetch error:', fetchError);
                throw new Error('Barbearia não encontrada ou erro de banco de dados.');
            }

            const integrations = barbershop.integrations as IntegrationSettings;
            const accessToken = integrations?.mercadopagoAccessToken;

            if (!accessToken) {
                return res.status(400).json({ error: 'Esta barbearia não está configurada para receber pagamentos online.' });
            }

            const client = new MercadoPagoConfig({ accessToken });
            const preferenceClient = new Preference(client);
            
            const transactionId = randomUUID();
            const returnPath = barbershop.slug ? `/${barbershop.slug}` : `/?barbershopId=${appointmentData.barbershop_id}`;


            const preferenceBody = {
                items: [
                    {
                        id: appointmentData.service_id,
                        title: `Serviço: ${appointmentData.service_name}`,
                        description: `Agendamento na ${barbershop.name} com ${appointmentData.barber_name}`,
                        quantity: 1,
                        currency_id: 'BRL',
                        unit_price: Number(appointmentData.price),
                    },
                ],
                payer: {
                    name: appointmentData.client_name,
                    email: '',
                },
                back_urls: {
                    success: `${req.headers.origin}/#${returnPath}?payment_status=success`,
                    failure: `${req.headers.origin}/#${returnPath}?payment_status=failure`,
                    pending: `${req.headers.origin}/#${returnPath}?payment_status=pending`,
                },
                auto_return: 'approved' as 'approved',
                notification_url: `https://${req.headers.host}/api/mp-webhook?purchase_type=appointment&barbershop_id=${appointmentData.barbershop_id}`,
                external_reference: transactionId,
                metadata: appointmentData,
            };

            const mpResponse = await preferenceClient.create({ body: preferenceBody });
            
            const redirectUrl = mpResponse.init_point;
            const preferenceId = mpResponse.id;

            if (!redirectUrl || !preferenceId) {
                throw new Error('Não foi possível obter a URL de checkout e o ID da preferência do Mercado Pago.');
            }
            
            res.status(200).json({ redirectUrl, preferenceId, publicKey: integrations.mercadopagoPublicKey });

        } catch (error: any) {
            console.error('Erro ao criar preferência no Mercado Pago:', error.cause || error.message);
            res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
        }
    } else {
        return res.status(400).json({ error: 'Dados do agendamento ou do pacote/assinatura são obrigatórios.' });
    }
}