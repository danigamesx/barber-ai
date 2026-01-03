import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin;
    const clientId = process.env.STRIPE_CLIENT_ID;

    if (!clientId) {
        return res.status(500).json({ error: 'STRIPE_CLIENT_ID não configurado.' });
    }

    if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }

    const { barbershopId } = req.body;
    if (!barbershopId) {
        return res.status(400).json({ error: 'Barbershop ID required.' });
    }

    // URL para onde o usuário será redirecionado após o onboarding no Stripe
    const redirectUri = `${frontendUrl}/api/stripe-callback`;

    // Gerar link OAuth do Stripe Express/Standard
    // state: usamos para passar o ID da barbearia de volta com segurança
    const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${barbershopId}`;

    res.status(200).json({ url });
}