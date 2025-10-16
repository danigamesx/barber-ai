import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import Button from '../../components/Button';
import { Service, ServicePackage, SubscriptionPlan, UserActiveSubscription, UserPurchasedPackage } from '../../types';

const ClientProfileScreen: React.FC = () => {
    const { user, barbershops, appointments, logout } = useContext(AppContext);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        barbershopId: 'all',
        type: 'all' // 'all', 'service', 'fee'
    });

    if (!user) {
        return null;
    }

    const getBarbershopName = (id: string) => {
        return barbershops.find(b => b.id === id)?.name || 'Barbearia';
    };

    const expenseHistory = useMemo(() => {
        const history: {
            id: string;
            date: Date;
            description: string | null;
            barbershopId: string;
            amount: number | null;
            type: string;
        }[] = [];
        appointments.forEach(app => {
            if (app.client_id !== user.id) return;
            
            if (app.status === 'completed' || app.status === 'paid') {
                 if (app.price !== null && app.price > 0) {
                    history.push({
                        id: `exp-${app.id}`,
                        date: app.start_time,
                        description: app.service_name,
                        barbershopId: app.barbershop_id,
                        amount: app.price,
                        type: 'service'
                    });
                }
            } else if (app.status === 'cancelled' && app.cancellation_fee && app.cancellation_fee > 0) {
                 history.push({
                    id: `fee-${app.id}`,
                    date: app.start_time,
                    description: 'Taxa de Cancelamento',
                    barbershopId: app.barbershop_id,
                    amount: app.cancellation_fee,
                    type: 'fee'
                });
            }
        });
        return history.sort((a,b) => b.date.getTime() - a.date.getTime());
    }, [appointments, user.id]);

    const filteredExpenses = useMemo(() => {
        let expenses = expenseHistory;

        if (filters.barbershopId !== 'all') {
            expenses = expenses.filter(e => e.barbershopId === filters.barbershopId);
        }
        if (filters.type !== 'all') {
            expenses = expenses.filter(e => e.type === filters.type);
        }
        if (filters.startDate) {
            const startDate = new Date(filters.startDate + 'T00:00:00');
            expenses = expenses.filter(e => e.date >= startDate);
        }
        if (filters.endDate) {
            const endDate = new Date(filters.endDate + 'T23:59:59');
            expenses = expenses.filter(e => e.date <= endDate);
        }

        return expenses;
    }, [expenseHistory, filters]);

    const totalSpent = useMemo(() => {
        return filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    }, [filteredExpenses]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const activeSubscriptions = Array.isArray(user.active_subscriptions) ? user.active_subscriptions as UserActiveSubscription[] : [];
    const purchasedPackages = Array.isArray(user.purchased_packages) ? user.purchased_packages as UserPurchasedPackage[] : [];


    return (
        <div className="p-4 space-y-8 pb-24">
            <header>
                <h1 className="text-2xl font-bold text-brand-light">{user.name}</h1>
                <p className="text-gray-400">{user.email}</p>
            </header>
            
            <section>
                <h2 className="text-lg font-semibold mb-4 text-brand-primary">Saldos</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-secondary p-4 rounded-lg">
                        <h3 className="text-sm text-green-400 font-semibold">Créditos</h3>
                        <p className="text-2xl font-bold">R$ {Object.values((user.store_credits as Record<string, number>) || {}).reduce((sum, value) => sum + value, 0).toFixed(2)}</p>
                    </div>
                     <div className="bg-brand-secondary p-4 rounded-lg">
                        <h3 className="text-sm text-red-400 font-semibold">Débitos</h3>
                        <p className="text-2xl font-bold">R$ {Object.values((user.outstanding_debts as Record<string, number>) || {}).reduce((sum, value) => sum + value, 0).toFixed(2)}</p>
                    </div>
                </div>
            </section>
            
            <section>
                <h2 className="text-lg font-semibold mb-4 text-brand-primary">Minhas Assinaturas e Pacotes</h2>
                <div className="space-y-3">
                    {activeSubscriptions.map(sub => {
                        const shop = barbershops.find(b => b.id === sub.barbershopId);
                        const allServices = Array.isArray(shop?.services) ? shop.services as Service[] : [];
                        const subscriptions = Array.isArray(shop?.subscriptions) ? shop.subscriptions as SubscriptionPlan[] : [];
                        const subDetails = subscriptions.find(s => s.id === sub.subscriptionId);
                        if (!subDetails) return null;
                        return (
                            <div key={sub.id} className="bg-brand-secondary p-4 rounded-lg">
                                <p className="font-bold">{subDetails.name}</p>
                                <p className="text-xs text-gray-400 mb-2">{getBarbershopName(sub.barbershopId)}</p>
                                <ul className="text-sm list-disc list-inside space-y-1 text-gray-300">
                                    {subDetails.serviceIds.map(serviceId => {
                                        const service = allServices.find(s => s.id === serviceId);
                                        return <li key={serviceId}>{service ? service.name : 'Serviço desconhecido'}</li>;
                                    })}
                                    <li>{subDetails.usesPerMonth} uso(s) por mês</li>
                                </ul>
                                <p className="text-xs text-green-400 mt-2">Ativa desde: {new Date(sub.startDate).toLocaleDateString()}</p>
                            </div>
                        )
                    })}
                     {purchasedPackages.map(pkg => {
                        const shop = barbershops.find(b => b.id === pkg.barbershopId);
                        const packages = Array.isArray(shop?.packages) ? shop.packages as ServicePackage[] : [];
                        const pkgDetails = packages.find(p => p.id === pkg.packageId);
                        if (!pkgDetails) return null;
                        return (
                            <div key={pkg.id} className="bg-brand-secondary p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{pkgDetails.name}</p>
                                        <p className="text-xs text-gray-400">{getBarbershopName(pkg.barbershopId)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-brand-primary">{pkg.remainingUses}</p>
                                        <p className="text-xs">usos restantes</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {(!user.active_subscriptions || activeSubscriptions.length === 0) && (!user.purchased_packages || purchasedPackages.length === 0) && (
                        <p className="text-gray-400 text-center text-sm py-4">Você não possui assinaturas ou pacotes ativos.</p>
                    )}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-4 text-brand-primary">Histórico de Despesas</h2>
                <div className="bg-brand-secondary p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                         <select name="barbershopId" value={filters.barbershopId} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600">
                            <option value="all">Todas as Barbearias</option>
                            {[...new Set(expenseHistory.map(e => e.barbershopId))].map(id => (
                                <option key={id as string} value={id as string}>{getBarbershopName(id as string)}</option>
                            ))}
                        </select>
                        <select name="type" value={filters.type} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600">
                            <option value="all">Todos os Tipos</option>
                            <option value="service">Serviços</option>
                            <option value="fee">Taxas</option>
                        </select>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600 col-span-2 sm:col-span-1" />
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600 col-span-2 sm:col-span-1" />
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                         <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold">Total Filtrado:</h3>
                            <p className="font-bold text-xl text-brand-primary">R$ {totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                             {filteredExpenses.map(item => (
                                <div key={item.id} className="bg-brand-dark p-3 rounded-md flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-semibold">{item.description}</p>
                                        <p className="text-xs text-gray-400">{getBarbershopName(item.barbershopId)} - {item.date.toLocaleDateString()}</p>
                                    </div>
                                    <p className={`font-bold ${item.type === 'fee' ? 'text-red-400' : ''}`}>R$ {(item.amount || 0).toFixed(2)}</p>
                                </div>
                            ))}
                            {filteredExpenses.length === 0 && (
                                 <p className="text-gray-400 text-center text-sm py-4">Nenhuma despesa encontrada para os filtros selecionados.</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="pt-4">
                 <Button variant="secondary" onClick={logout}>Sair da Conta</Button>
            </div>
        </div>
    );
};

export default ClientProfileScreen;