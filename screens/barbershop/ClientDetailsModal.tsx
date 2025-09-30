import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../../App';
import { User, Appointment, ClientRecord } from '../../types';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import Button from '../../components/Button';

interface ClientDetailsModalProps {
    client: User;
    onClose: () => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, onClose }) => {
    const { barbershopData, allAppointments, updateClientNotes, user: owner } = useContext(AppContext);

    const isWalkIn = useMemo(() => client.id.startsWith('walk-in|'), [client.id]);

    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (barbershopData && client) {
            const clientRecords = barbershopData.client_records as { [clientId: string]: ClientRecord } | undefined;
            // The key is always client.id, which works for both real and pseudo IDs
            setNotes(clientRecords?.[client.id]?.notes || '');
        }
    }, [barbershopData, client]);

    const clientHistory = useMemo(() => {
        if (!barbershopData || !owner) return [];
        
        let history;
        if (isWalkIn) {
             history = allAppointments
                .filter(app => app.client_id === owner.id && app.client_name === client.name && app.barbershop_id === barbershopData.id);
        } else {
             history = allAppointments
                .filter(app => app.client_id === client.id && app.barbershop_id === barbershopData.id);
        }
        return history.sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
    }, [allAppointments, client, barbershopData, isWalkIn, owner]);


    const handleSaveNotes = () => {
        if (barbershopData) {
            // The key is always client.id, works for both
            updateClientNotes(barbershopData.id, client.id, notes);
            alert('Anotações salvas!');
        }
    };

    const statusTranslations: { [key in Appointment['status']]: string } = {
      pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído',
      cancelled: 'Cancelado', declined: 'Recusado', paid: 'Pago',
    };

    // Extracting debt/credit for the specific barbershop
    const clientDebt = !isWalkIn ? ((client.outstanding_debts as Record<string, number>)?.[barbershopData?.id || ''] || 0) : 0;
    const clientCredit = !isWalkIn ? ((client.store_credits as Record<string, number>)?.[barbershopData?.id || ''] || 0) : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-brand-primary">{client.name}</h2>
                    <p className="text-gray-400">{client.phone || 'Telefone não informado'}</p>
                    <p className="text-gray-400 text-sm">{client.email || (isWalkIn ? 'Cliente sem cadastro' : 'E-mail não informado')}</p>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {/* Add Debts and Credits section, only for registered users */}
                    {!isWalkIn && (
                         <div>
                            <h3 className="font-semibold text-lg mb-2">Saldos na Barbearia</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-brand-secondary p-3 rounded-lg text-center">
                                    <h4 className="text-sm text-green-400 font-semibold">Créditos</h4>
                                    <p className="text-xl font-bold">R$ {clientCredit.toFixed(2)}</p>
                                </div>
                                <div className="bg-brand-secondary p-3 rounded-lg text-center">
                                    <h4 className="text-sm text-red-400 font-semibold">Débitos</h4>
                                    <p className="text-xl font-bold">R$ {clientDebt.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold text-lg mb-2">Anotações</h3>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Adicione anotações sobre o cliente..."
                            className="w-full p-2 bg-brand-secondary border border-gray-600 rounded-lg text-sm"
                        />
                        <Button onClick={handleSaveNotes} variant="secondary" className="w-full py-2 text-sm mt-2">Salvar Anotações</Button>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Histórico de Agendamentos</h3>
                        <div className="space-y-2">
                            {clientHistory.length > 0 ? clientHistory.map(app => (
                                <div key={app.id} className="bg-brand-secondary p-3 rounded-lg text-sm">
                                    <div className="flex justify-between">
                                        <p className="font-semibold">{app.service_name}</p>
                                        <p className="font-semibold">R$ {(app.price || 0).toFixed(2)}</p>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {app.start_time.toLocaleDateString()} às {app.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                     <p className="text-xs text-gray-400">com {app.barber_name}</p>
                                     <p className="text-xs font-medium mt-1">Status: {statusTranslations[app.status]}</p>
                                </div>
                            )) : <p className="text-gray-400 text-center text-sm">Nenhum histórico encontrado.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetailsModal;
