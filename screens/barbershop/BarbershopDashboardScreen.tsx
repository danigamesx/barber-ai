import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { Appointment, OpeningHours, User, Barbershop, DayOpeningHours } from '../../types';
import Button from '../../components/Button';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  UsersIcon,
  ChartBarIcon,
  XCircleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '../../components/icons/OutlineIcons';

// StatCard Component
const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ElementType;
  onClick: () => void;
}> = ({ title, value, icon: Icon, onClick }) => (
  <div
    onClick={onClick}
    className="bg-brand-secondary p-4 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-gray-700 transition"
    role="button"
    aria-label={`View details for ${title}`}
  >
    <div className="bg-brand-primary/20 p-3 rounded-lg">
      <Icon className="w-6 h-6 text-brand-primary" />
    </div>
    <div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

// DashboardDetailsModal Component
interface DashboardDetailsModalProps {
  modalType: 'revenue' | 'appointments' | 'clients' | 'occupancy';
  onClose: () => void;
  data: any;
  onUpdateStatus: (appointment: Appointment, status: 'completed' | 'cancelled') => void;
}


const DashboardDetailsModal: React.FC<DashboardDetailsModalProps> = ({ modalType, onClose, data, onUpdateStatus }) => {
  const renderContent = () => {
    switch (modalType) {
      case 'revenue':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Receita Detalhada do Dia</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
              {data.revenueBreakdown.map((item: any) => (
                <div key={item.id} className="bg-brand-secondary p-2 rounded-md flex justify-between text-sm">
                  <span>{item.description} ({item.client})</span>
                  <span className={`font-semibold ${item.type === 'fee' ? 'text-amber-400' : 'text-green-400'}`}>
                    R$ {item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {data.revenueBreakdown.length === 0 && <p className="text-gray-400 text-center">Nenhuma receita registrada hoje.</p>}
            </div>
            <div className="border-t border-gray-700 mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between font-bold">
                    <span>Receita Bruta de Serviços:</span>
                    <span>R$ {data.revenueFromServices.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-red-400">(-) Comissões:</span>
                    <span className="text-red-400">- R$ {data.commissions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-amber-400">(+) Taxas de Cancelamento:</span>
                    <span className="text-amber-400">+ R$ {data.revenueFromFees.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-600 mt-2 pt-2 flex justify-between font-bold text-lg">
                    <span>Receita Líquida (Loja):</span>
                    <span>R$ {data.netRevenue.toFixed(2)}</span>
                </div>
            </div>
          </div>
        );
      case 'appointments':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Agendamentos do Dia</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {data.todaysAppointments.map((app: Appointment) => {
                  const isActionable = ['pending', 'confirmed', 'paid'].includes(app.status);
                  const isCompleted = app.status === 'completed';
                  const isCancelled = app.status === 'cancelled' || app.status === 'declined';

                  return (
                      <div key={app.id} className={`bg-brand-secondary p-2 rounded-md text-sm flex justify-between items-center ${isCancelled ? 'opacity-50' : ''}`}>
                          <div>
                              <p className={`font-semibold ${isCancelled ? 'line-through' : ''}`}>
                                  {app.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {app.client_name}
                              </p>
                              <p className={`text-xs text-gray-400 ${isCancelled ? 'line-through' : ''}`}>{app.service_name} com {app.barber_name}</p>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                              {isActionable && (
                                  <div className="flex gap-2">
                                      <button onClick={() => onUpdateStatus(app, 'completed')} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded">Concluir</button>
                                      <button onClick={() => onUpdateStatus(app, 'cancelled')} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded">Cancelar</button>
                                  </div>
                              )}
                              {isCompleted && (
                                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400">Concluído</span>
                              )}
                              {isCancelled && (
                                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500/20 text-red-400">Cancelado</span>
                              )}
                          </div>
                      </div>
                  );
              })}
              {data.todaysAppointments.length === 0 && <p className="text-gray-400 text-center">Nenhum agendamento para hoje.</p>}
            </div>
          </div>
        );
      case 'clients':
         return (
          <div>
            <h3 className="text-lg font-bold mb-4">Clientes do Dia</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {data.clients.map((client: User) => (
                <div key={client.id} className="bg-brand-secondary p-2 rounded-md text-sm">
                  <p className="font-semibold">{client.name}</p>
                  <p className="text-xs text-gray-400">{client.phone}</p>
                </div>
              ))}
               {data.clients.length === 0 && <p className="text-gray-400 text-center">Nenhum cliente agendado para hoje.</p>}
            </div>
          </div>
        );
      case 'occupancy':
        return (
          <div>
            <h3 className="text-lg font-bold mb-4">Detalhes da Taxa de Ocupação</h3>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-brand-secondary rounded-md"><span>Total de Horas Disponíveis:</span> <span className="font-semibold">{(data.totalAvailableTime / 60).toFixed(2)}h</span></div>
                <div className="flex justify-between p-2 bg-brand-secondary rounded-md"><span>Total de Horas Agendadas:</span> <span className="font-semibold">{(data.totalBookedTime / 60).toFixed(2)}h</span></div>
                <div className="flex justify-between p-2 bg-brand-secondary rounded-md"><span>Cálculo:</span> <span className="font-semibold">{`( ${data.totalBookedTime.toFixed(0)} min / ${data.totalAvailableTime.toFixed(0)} min ) * 100`}</span></div>
             </div>
             <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between font-bold text-lg">
                <span>Taxa de Ocupação:</span>
                <span>{data.occupancyRate.toFixed(2)}%</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-brand-dark w-full max-w-lg rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white" aria-label="Fechar">
          <XCircleIcon className="w-8 h-8" />
        </button>
        {renderContent()}
      </div>
    </div>
  );
};


// Main Component
const BarbershopDashboardScreen: React.FC = () => {
    const { barbershopData, appointments, users, updateAppointmentStatus } = useContext(AppContext);
    const [modalType, setModalType] = useState<'revenue' | 'appointments' | 'clients' | 'occupancy' | null>(null);
    const [copySuccess, setCopySuccess] = useState('');
    const today = new Date();
    
    const dashboardData = useMemo(() => {
        if (!barbershopData) return null;
        
        const todaysAppointments = appointments.filter(app => 
            app.barbershop_id === barbershopData.id &&
            new Date(app.start_time).toDateString() === today.toDateString()
        );
        
        const todaysRevenueBreakdown = [
            ...todaysAppointments
                .filter(app => app.status === 'completed' || app.status === 'paid')
                .map(app => ({ id: app.id, description: app.service_name, client: app.client_name, amount: app.price || 0, type: 'service' })),
            ...todaysAppointments
                .filter(app => app.status === 'cancelled' && app.cancellation_fee && app.cancellation_fee > 0)
                .map(app => ({ id: app.id, description: 'Taxa de Cancelamento', client: app.client_name, amount: app.cancellation_fee || 0, type: 'fee' }))
        ];
        const todaysGrossRevenue = todaysRevenueBreakdown.reduce((sum, item) => sum + item.amount, 0);

        const todaysBookingsCount = todaysAppointments.filter(app => app.status !== 'cancelled' && app.status !== 'declined').length;
        
        const todaysCompletedOrPaid = todaysAppointments.filter(app => app.status === 'completed' || app.status === 'paid');
        const todaysCommissions = todaysCompletedOrPaid.reduce((sum, app) => sum + (app.commission_amount || 0), 0);
        const todaysRevenueFromServices = todaysCompletedOrPaid.reduce((sum, app) => sum + (app.price || 0), 0);
        const todaysRevenueFromFees = todaysRevenueBreakdown.filter(i => i.type === 'fee').reduce((sum, i) => sum + i.amount, 0);
        const todaysNetRevenue = (todaysRevenueFromServices - todaysCommissions) + todaysRevenueFromFees;

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthAppointments = appointments.filter(app => {
            if (app.barbershop_id !== barbershopData.id) return false;
            const appDate = new Date(app.start_time);
            return appDate >= startOfMonth && appDate <= today && (app.status === 'completed' || app.status === 'paid');
        });

        const monthRevenue = monthAppointments.reduce((sum, app) => sum + (app.price || 0), 0);
        const monthClientsCount = [...new Set(monthAppointments.map(app => app.client_id))].length;

        const recentActivities = appointments
            .filter(app => app.barbershop_id === barbershopData.id)
            .sort((a, b) => (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0))
            .slice(0, 5);
            
        const statusOrder: { [key: string]: number } = { 'pending': 1, 'confirmed': 2, 'paid': 3, 'completed': 4, 'cancelled': 5, 'declined': 6 };

        return {
            todaysGrossRevenue,
            todaysRevenueBreakdown,
            todaysCommissions,
            todaysNetRevenue,
            todaysRevenueFromServices,
            todaysRevenueFromFees,
            todaysBookingsCount,
            todaysAppointments: todaysAppointments.sort((a, b) => {
                const statusA = statusOrder[a.status] || 99;
                const statusB = statusOrder[b.status] || 99;
                if (statusA !== statusB) return statusA - statusB;
                return a.start_time.getTime() - b.start_time.getTime();
            }),
            monthRevenue,
            monthClientsCount,
            recentActivities
        };

    }, [barbershopData, appointments, users, today]);

    if (!dashboardData || !barbershopData) {
        return <div className="p-4 text-center">Carregando dados do painel...</div>;
    }
    
    const shareableLink = barbershopData.slug
      ? `${window.location.origin}/#/${barbershopData.slug}`
      : `${window.location.origin}/#/?barbershopId=${barbershopData.id}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            setCopySuccess('Copiado!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Falha ao copiar!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const modalData = {
        revenue: { 
            revenueBreakdown: dashboardData.todaysRevenueBreakdown,
            revenueFromServices: dashboardData.todaysRevenueFromServices,
            revenueFromFees: dashboardData.todaysRevenueFromFees,
            commissions: dashboardData.todaysCommissions,
            netRevenue: dashboardData.todaysNetRevenue,
        },
        appointments: { todaysAppointments: dashboardData.todaysAppointments },
        clients: { clients: [] }, // This data is not calculated in this component anymore, but keeping for structure
        occupancy: {} // Same
    };
    
    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <h1 className="text-2xl font-bold text-brand-light">Painel</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Receita Bruta (Dia)" value={`R$ ${dashboardData.todaysGrossRevenue.toFixed(2)}`} icon={CurrencyDollarIcon} onClick={() => setModalType('revenue')} />
                    <StatCard title="Comissões (Dia)" value={`R$ ${dashboardData.todaysCommissions.toFixed(2)}`} icon={UsersIcon} onClick={() => setModalType('revenue')} />
                    <StatCard title="Receita Líquida (Dia)" value={`R$ ${dashboardData.todaysNetRevenue.toFixed(2)}`} icon={ChartBarIcon} onClick={() => setModalType('revenue')} />
                    <StatCard title="Agendamentos Hoje" value={dashboardData.todaysBookingsCount.toString()} icon={CalendarIcon} onClick={() => setModalType('appointments')} />
                </div>
                
                <div className="bg-brand-secondary p-4 rounded-lg">
                  <h2 className="font-semibold text-lg text-brand-primary mb-3">Compartilhe sua Barbearia</h2>
                  <p className="text-sm text-gray-400 mb-2">Use este link para que seus clientes agendem diretamente com você:</p>
                  <div className="flex gap-2 bg-brand-dark p-2 rounded-md">
                    <input type="text" readOnly value={shareableLink} className="bg-transparent w-full text-gray-300 outline-none" />
                    <Button onClick={copyToClipboard} variant="primary" className="py-1 px-4 text-sm w-auto flex-shrink-0">
                        {copySuccess || 'Copiar'}
                    </Button>
                  </div>
                   {!barbershopData.slug && (
                    <p className="text-xs text-amber-400 mt-2">
                      Dica: Personalize este link na tela de <span className="font-bold">Ajustes</span> para torná-lo mais profissional!
                    </p>
                  )}
                </div>
                
                <div className="bg-brand-secondary p-4 rounded-lg">
                    <h2 className="font-semibold text-lg text-brand-primary mb-3">Resumo do Mês (até hoje)</h2>
                    <div className="flex justify-around text-center">
                        <div>
                            <p className="text-sm text-gray-400">Receita Total</p>
                            <p className="text-2xl font-bold text-white">R$ {dashboardData.monthRevenue.toFixed(2)}</p>
                        </div>
                         <div>
                            <p className="text-sm text-gray-400">Clientes Atendidos</p>
                            <p className="text-2xl font-bold text-white">{dashboardData.monthClientsCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-brand-secondary p-4 rounded-lg">
                    <h2 className="font-semibold text-lg text-brand-primary mb-3">Atividades Recentes</h2>
                    <div className="space-y-3">
                        {dashboardData.recentActivities.map(app => {
                            const getStatusIcon = () => {
                                switch(app.status) {
                                    case 'completed':
                                    case 'paid':
                                        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
                                    case 'pending':
                                    case 'confirmed':
                                        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
                                    case 'cancelled':
                                    case 'declined':
                                        return <XCircleIcon className="w-5 h-5 text-red-400" />;
                                    default:
                                        return <ClockIcon className="w-5 h-5 text-gray-400" />;
                                }
                            };
                            return (
                                <div key={app.id} className="flex items-center gap-3 text-sm">
                                    <div className="p-2 bg-brand-dark rounded-full">
                                        {getStatusIcon()}
                                    </div>
                                    <div>
                                        <p className="text-white">
                                            <span className="font-bold">{app.client_name}</span> agendou <span className="font-semibold">{app.service_name}</span>.
                                            {(app.status === 'paid' || app.status === 'completed') && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Pago</span>}
                                            {(app.status === 'confirmed' || app.status === 'pending') && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">A Pagar</span>}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {app.created_at ? new Date(app.created_at).toLocaleString('pt-BR') : 'Data indisponível'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                         {dashboardData.recentActivities.length === 0 && <p className="text-gray-400 text-center text-sm">Nenhuma atividade recente.</p>}
                    </div>
                </div>

            </div>
            {modalType && <DashboardDetailsModal modalType={modalType} onClose={() => setModalType(null)} data={modalData[modalType as keyof typeof modalData]} onUpdateStatus={updateAppointmentStatus}/>}
        </>
    );
};

export default BarbershopDashboardScreen;