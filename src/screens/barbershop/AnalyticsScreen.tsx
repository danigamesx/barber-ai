import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { Appointment, Barber, Service } from '../../types';
import Button from '../../components/Button';

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-brand-secondary p-4 rounded-lg text-center">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl lg:text-3xl font-bold text-brand-primary">{value}</p>
    </div>
);

const WeeklyRevenueChart: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
    const weeklyData = useMemo(() => {
        const data: { [week: string]: { services: number, fees: number } } = {};
        const today = new Date();
        
        for (let i = 0; i < 4; i++) {
            const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (i * 7));
            const weekKey = `${weekStart.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;
            data[weekKey] = { services: 0, fees: 0 };
        }

        const completedAppointments = appointments.filter(a => a.status === 'completed');
        const cancelledWithFee = appointments.filter(a => a.status === 'cancelled' && a.cancellation_fee && a.cancellation_fee > 0);

        const allRevenueEvents = [
            ...completedAppointments.map(a => ({ date: a.start_time, amount: a.price || 0, type: 'service' })),
            ...cancelledWithFee.map(a => ({ date: a.start_time, amount: a.cancellation_fee || 0, type: 'fee' }))
        ];
        
        allRevenueEvents.forEach(event => {
            for (let i = 0; i < 4; i++) {
                 const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (i * 7));
                 weekStart.setHours(0,0,0,0);
                 const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                 const weekKey = `${weekStart.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;
                 
                 if(event.date.getTime() >= weekStart.getTime() && event.date.getTime() < weekEnd.getTime()) {
                     if (event.type === 'service') {
                        data[weekKey].services += event.amount;
                     } else {
                        data[weekKey].fees += event.amount;
                     }
                 }
            }
        });

        return Object.entries(data).map(([week, revenues]) => ({
            week,
            total: revenues.services + revenues.fees
        })).reverse();
    }, [appointments]);

    const maxRevenue = Math.max(...weeklyData.map(({ total }) => total), 1);

    return (
        <div className="bg-brand-secondary p-4 rounded-lg">
            <h3 className="font-semibold mb-4 text-brand-primary">Faturamento Semanal (Últimas 4 semanas)</h3>
            <div className="flex justify-between items-end h-40 gap-2">
                {weeklyData.map(({ week, total }) => (
                    <div key={week} className="flex flex-col items-center w-full h-full justify-end">
                        <div 
                            className="w-full bg-brand-primary rounded-t-md"
                            style={{ height: `${(total / maxRevenue) * 100}%` }}
                            title={`R$${total.toFixed(2)}`}
                        ></div>
                        <p className="text-xs text-gray-400 mt-1">{week}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AnalyticsScreen: React.FC = () => {
    const { appointments, barbershopData } = useContext(AppContext);
    const [filters, setFilters] = useState({
        revenueType: 'total', // 'total', 'services', 'fees'
        serviceId: 'all',
        barberId: 'all',
        startDate: '',
        endDate: '',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters({
            revenueType: 'total',
            serviceId: 'all',
            barberId: 'all',
            startDate: '',
            endDate: '',
        });
    };

    const filteredAppointments = useMemo(() => {
        return appointments.filter(app => {
            if (app.barbershop_id !== barbershopData?.id) return false;
            if (filters.serviceId !== 'all' && app.service_id !== filters.serviceId) return false;
            if (filters.barberId !== 'all' && app.barber_id !== filters.barberId) return false;
            
            const appDate = new Date(app.start_time);
            appDate.setHours(0,0,0,0);

            if (filters.startDate) {
                const startDate = new Date(filters.startDate + 'T00:00:00');
                if (appDate < startDate) return false;
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate + 'T23:59:59');
                if (appDate > endDate) return false;
            }
            return true;
        });
    }, [appointments, filters, barbershopData]);

    const analyticsData = useMemo(() => {
        const completed = filteredAppointments.filter(a => a.status === 'completed');
        const cancelledWithFee = filteredAppointments.filter(a => a.status === 'cancelled' && a.cancellation_fee && a.cancellation_fee > 0);
        
        const revenueFromServices = completed.reduce<number>((sum, app) => sum + (app.price || 0), 0);
        const revenueFromFees = cancelledWithFee.reduce<number>((sum, app) => sum + (app.cancellation_fee || 0), 0);
        const totalCommissions = completed.reduce<number>((sum, app) => sum + (app.commission_amount || 0), 0);
        
        const totalRevenue = revenueFromServices + revenueFromFees;
        const netRevenue = (revenueFromServices - totalCommissions) + revenueFromFees;
        
        const serviceCounts = completed.reduce<{[key: string]: number}>((counts, app) => {
            if (app.service_name) {
                counts[app.service_name] = (counts[app.service_name] || 0) + 1;
            }
            return counts;
        }, {});
        
        // FIX: Explicitly cast array values to Number before subtraction to satisfy TypeScript's strict arithmetic operation rules, which may fail with inferred types from Object.entries.
        const mostPopularService = Object.entries(serviceCounts).sort((a,b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'N/A';

        return {
            totalRevenue,
            netRevenue,
            totalCommissions,
            revenueFromFees,
            totalCompletedAppointments: completed.length,
            mostPopularService
        };
    }, [filteredAppointments]);

    const services = Array.isArray(barbershopData?.services) ? barbershopData.services as Service[] : [];
    const barbers = Array.isArray(barbershopData?.barbers) ? barbershopData.barbers as Barber[] : [];

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-2xl font-bold text-brand-light">Análises de Desempenho</h1>
            
             <div className="bg-brand-secondary p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-brand-primary">Filtros</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <select name="serviceId" value={filters.serviceId} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600">
                        <option value="all">Todos os Serviços</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                     <select name="barberId" value={filters.barberId} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600">
                        <option value="all">Todos os Barbeiros</option>
                        {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                     <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600 col-span-2 sm:col-span-1" />
                     <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="bg-brand-dark p-2 rounded-md border border-gray-600 col-span-2 sm:col-span-1" />
                </div>
                <Button variant='secondary' onClick={clearFilters}>Limpar Filtros</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatCard title="Faturamento Total" value={`R$${analyticsData.totalRevenue.toFixed(2)}`} />
                <StatCard title="Receita Líquida (Loja)" value={`R$${analyticsData.netRevenue.toFixed(2)}`} />
                <StatCard title="Total Comissões" value={`R$${analyticsData.totalCommissions.toFixed(2)}`} />
                <StatCard title="Receita de Taxas" value={`R$${analyticsData.revenueFromFees.toFixed(2)}`} />
                <StatCard title="Agend. Concluídos" value={analyticsData.totalCompletedAppointments} />
                <div className="bg-brand-secondary p-4 rounded-lg text-center flex flex-col justify-center">
                    <p className="text-gray-400 text-sm">Serviço Mais Popular</p>
                    <p className="text-xl lg:text-2xl font-bold text-brand-primary truncate">{analyticsData.mostPopularService}</p>
                </div>
            </div>
            
            <WeeklyRevenueChart appointments={filteredAppointments} />
        </div>
    );
};

export default AnalyticsScreen;