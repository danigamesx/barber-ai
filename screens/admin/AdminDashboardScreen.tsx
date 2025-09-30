import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../App';
import { Barbershop, IntegrationSettings } from '../../types';
import ManagePlanModal from './ManagePlanModal';

const AdminDashboardScreen: React.FC = () => {
    const { barbershops, users, logout } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);

    const filteredBarbershops = barbershops.filter(shop => 
        shop.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const getOwnerName = (ownerId: string) => {
        return users.find(u => u.id === ownerId)?.name || 'Desconhecido';
    }

    const getShopStatus = (shop: Barbershop) => {
        const now = new Date();
        const integrations = shop.integrations as IntegrationSettings;

        // 1. Check for active trial
        if (shop.trial_ends_at) {
            const trialEndDate = new Date(shop.trial_ends_at);
            if (trialEndDate > now) {
                const remainingDays = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { text: `Em teste (${remainingDays}d restantes)`, color: 'text-amber-400' };
            }
        }
        
        // 2. Check for active paid plan
        if (integrations?.plan_expires_at) {
            const planEndDate = new Date(integrations.plan_expires_at);
             if (planEndDate > now) {
                return { text: `Ativo até ${planEndDate.toLocaleDateString('pt-BR')}`, color: 'text-green-400' };
            } else {
                 return { text: 'Plano Expirado', color: 'text-red-400' };
            }
        }

        // 3. Fallback for expired trial without a paid plan
        if (shop.trial_ends_at) {
            const trialEndDate = new Date(shop.trial_ends_at);
            if (trialEndDate <= now) {
                return { text: 'Teste Expirado', color: 'text-red-400' };
            }
        }

        // 4. Default for Basic plan without an expiry (should not happen with new logic, but safe)
        if (!integrations?.plan_expires_at && (integrations?.plan === 'BASIC' || !integrations?.plan)) {
            return { text: 'Básico / Gratuito', color: 'text-gray-400' };
        }

        return { text: 'Inativo', color: 'text-gray-500' };
    };

    const stats = useMemo(() => {
        const now = new Date();
        
        const activeTrials = barbershops.filter(s => s.trial_ends_at && new Date(s.trial_ends_at) > now).length;
        
        const activePaid = barbershops.filter(s => {
            const integrations = s.integrations as IntegrationSettings;
            return integrations?.plan_expires_at && new Date(integrations.plan_expires_at) > now;
        }).length;
        
        const totalActive = activeTrials + activePaid;

        const inactiveOrExpired = barbershops.length - totalActive;

        return { totalActive, activeTrials, inactiveOrExpired };
    }, [barbershops]);

    return (
        <>
            <div className="p-4 md:p-8 min-h-screen bg-brand-dark">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-primary">Painel do Administrador</h1>
                    <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                        Sair
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium">Contas Ativas (Pagas + Teste)</h3>
                        <p className="text-3xl font-bold text-white">{stats.totalActive}</p>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium">Em Período de Teste</h3>
                        <p className="text-3xl font-bold text-white">{stats.activeTrials}</p>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium">Expirados / Inativos</h3>
                        <p className="text-3xl font-bold text-white">{stats.inactiveOrExpired}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Buscar barbearia por nome..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>

                <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Barbearia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Proprietário</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plano Atual</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredBarbershops.map(shop => {
                                    const shopStatus = getShopStatus(shop);
                                    const plan = (shop.integrations as IntegrationSettings)?.plan || 'BASIC';
                                    return (
                                    <tr key={shop.id} className="hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{shop.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getOwnerName(shop.owner_id)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan === 'PREMIUM' ? 'bg-purple-900 text-purple-300' : 'bg-green-900 text-green-300'}`}>
                                                {plan}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${shopStatus.color}`}>{shopStatus.text}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setSelectedBarbershop(shop)} className="text-brand-accent hover:text-blue-400">Gerenciar</button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {selectedBarbershop && (
                <ManagePlanModal
                    barbershop={selectedBarbershop}
                    onClose={() => setSelectedBarbershop(null)}
                />
            )}
        </>
    );
};

export default AdminDashboardScreen;