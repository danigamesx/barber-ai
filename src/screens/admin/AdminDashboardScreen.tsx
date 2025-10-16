import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../../App';
import { Barbershop, IntegrationSettings } from '../../types';
import ManagePlanModal from './ManagePlanModal';
import * as api from '../../api';
import Button from '../../components/Button';

const AdminDashboardScreen: React.FC = () => {
    const { barbershops, users, logout } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
    const [platformMpStatus, setPlatformMpStatus] = useState({ loading: true, connected: false });
    const [isConnecting, setIsConnecting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const connectStatus = params.get('mp_connect_status');
        let intervalId: number | undefined;

        const fetchInitialStatus = () => {
            api.getPlatformMpStatus()
                .then(status => setPlatformMpStatus({ loading: false, connected: status.connected }))
                .catch(error => {
                    console.error("Failed to fetch platform MP status", error);
                    setPlatformMpStatus({ loading: false, connected: false });
                });
        };

        if (connectStatus === 'success') {
            setIsVerifying(true);
            let attempts = 0;
            const maxAttempts = 10;

            const checkStatus = () => {
                attempts++;
                api.getPlatformMpStatus().then(status => {
                    if (status.connected) {
                        clearInterval(intervalId);
                        setIsVerifying(false);
                        setPlatformMpStatus({ loading: false, connected: true });
                        const newUrl = window.location.pathname + window.location.hash.split('?')[0];
                        window.history.replaceState({}, '', newUrl);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                        setIsVerifying(false);
                        setPlatformMpStatus({ loading: false, connected: false });
                        alert("A verificação da conexão falhou. Por favor, atualize a página para ver o status correto.");
                        const newUrl = window.location.pathname + window.location.hash.split('?')[0];
                        window.history.replaceState({}, '', newUrl);
                    }
                }).catch((error) => {
                     console.error(`Polling attempt ${attempts} failed:`, error);
                    if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                        setIsVerifying(false);
                        setPlatformMpStatus({ loading: false, connected: false });
                        alert("Erro ao verificar a conexão. Por favor, atualize a página.");
                        const newUrl = window.location.pathname + window.location.hash.split('?')[0];
                        window.history.replaceState({}, '', newUrl);
                    }
                });
            };
            
            checkStatus(); // Initial check
            intervalId = window.setInterval(checkStatus, 2000); // Poll every 2 seconds
        } else {
            fetchInitialStatus();
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []);

    const handleConnectPlatformMercadoPago = () => {
        setIsConnecting(true);
        const appId = import.meta.env.VITE_MERCADO_PAGO_APP_ID;
        if (!appId) {
            alert("Erro: O ID da aplicação do Mercado Pago não está configurado no ambiente.");
            setIsConnecting(false);
            return;
        }
        const redirectUri = `${window.location.origin}/api/mp-platform-oauth-callback`;
        const state = 'platform_connect';
        const oauthUrl = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`;
        window.location.href = oauthUrl;
    };

    const handleDisconnectPlatformMercadoPago = async () => {
        if (window.confirm("Tem certeza que deseja desconectar a conta de pagamento da plataforma? Os barbeiros não poderão mais comprar planos.")) {
            try {
                await api.disconnectPlatformMercadoPago();
                setPlatformMpStatus({ loading: false, connected: false });
                alert("Conta desconectada com sucesso.");
            } catch (error: any) {
                alert(`Falha ao desconectar: ${error.message}`);
            }
        }
    };

    const filteredBarbershops = barbershops.filter(shop => 
        shop.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const getOwnerName = (ownerId: string) => {
        return users.find(u => u.id === ownerId)?.name || 'Desconhecido';
    }

    const getShopStatus = (shop: Barbershop) => {
        const now = new Date();
        const integrations = shop.integrations as IntegrationSettings;

        if (shop.trial_ends_at) {
            const trialEndDate = new Date(shop.trial_ends_at);
            if (trialEndDate > now) {
                const remainingDays = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { text: `Em teste (${remainingDays}d restantes)`, color: 'text-amber-400' };
            }
        }
        
        if (integrations?.plan_expires_at) {
            const planEndDate = new Date(integrations.plan_expires_at);
             if (planEndDate > now) {
                return { text: `Ativo até ${planEndDate.toLocaleDateString('pt-BR')}`, color: 'text-green-400' };
            } else {
                 return { text: 'Plano Expirado', color: 'text-red-400' };
            }
        }

        if (shop.trial_ends_at) {
            const trialEndDate = new Date(shop.trial_ends_at);
            if (trialEndDate <= now) {
                return { text: 'Teste Expirado', color: 'text-red-400' };
            }
        }

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

    const renderPlatformPaymentStatus = () => {
        if (isVerifying) {
            return <p className="text-sm text-amber-400">Verificando conexão com o Mercado Pago...</p>;
        }
        if (platformMpStatus.loading) {
            return <p className="text-sm text-gray-400">Verificando...</p>;
        }
        if (platformMpStatus.connected) {
            return (
                <div className="space-y-2">
                    <p className="text-lg font-bold text-green-400">Conectado</p>
                    <Button onClick={handleDisconnectPlatformMercadoPago} variant="danger" className="py-1 px-3 text-xs w-auto">Desconectar</Button>
                </div>
            );
        }
        return (
            <div className="space-y-2">
                <p className="text-lg font-bold text-red-400">Desconectado</p>
                <Button onClick={handleConnectPlatformMercadoPago} variant="secondary" className="py-1 px-3 text-xs w-auto" disabled={isConnecting}>
                    {isConnecting ? 'Redirecionando...' : 'Conectar MP'}
                </Button>
            </div>
        );
    };

    return (
        <>
            <div className="p-4 md:p-8 min-h-screen bg-brand-dark">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-primary">Painel do Administrador</h1>
                    <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                        Sair
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium">Contas Ativas</h3>
                        <p className="text-3xl font-bold text-white">{stats.totalActive}</p>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium">Em Teste</h3>
                        <p className="text-3xl font-bold text-white">{stats.activeTrials}</p>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium">Expirados / Inativos</h3>
                        <p className="text-3xl font-bold text-white">{stats.inactiveOrExpired}</p>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-lg">
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Pagamento dos Planos</h3>
                        {renderPlatformPaymentStatus()}
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