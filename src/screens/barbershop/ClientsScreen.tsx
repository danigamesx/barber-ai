
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../../App';
import { User } from '../../types';
import ClientDetailsModal from './ClientDetailsModal';

const ClientsScreen: React.FC = () => {
    const { barbershopData, allAppointments, users, user: owner } = useContext(AppContext);
    const [selectedClient, setSelectedClient] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const clients = useMemo(() => {
        if (!barbershopData || !owner) return [];

        const shopAppointments = allAppointments.filter(app => app.barbershop_id === barbershopData.id);
        const clientMap = new Map<string, User>();

        shopAppointments.forEach(app => {
            // Handle registered clients
            if (app.client_id !== owner.id) {
                if (!clientMap.has(app.client_id)) {
                    const fullProfile = users.find(u => u.id === app.client_id);
                    clientMap.set(app.client_id, fullProfile || {
                        id: app.client_id,
                        name: app.client_name || 'Cliente Desconhecido',
                        email: null, phone: null, user_type: 'CLIENT', birth_date: null, favorite_barbershop_ids: null, loyalty_stamps: null, notifications: null, outstanding_debts: null, rewards: null, store_credits: null,
                        purchased_packages: null, active_subscriptions: null,
                        // FIX: Add missing 'push_subscriptions' property to align with the User type.
                        push_subscriptions: null,
                    });
                }
            } 
            // Handle walk-in clients
            else if (app.client_name) { 
                const walkInId = `walk-in|${app.client_name}`;
                if (!clientMap.has(walkInId)) {
                    clientMap.set(walkInId, {
                        id: walkInId,
                        name: app.client_name,
                        email: 'Cliente de balcão',
                        phone: null,
                        user_type: 'CLIENT',
                         birth_date: null, favorite_barbershop_ids: null, loyalty_stamps: null, notifications: null, outstanding_debts: null, rewards: null, store_credits: null,
                         purchased_packages: null, active_subscriptions: null,
                         // FIX: Added missing 'push_subscriptions' property to match the User type.
                         push_subscriptions: null,
                    });
                }
            }
        });
        
        return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    }, [barbershopData, allAppointments, users, owner]);

    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.name.toLowerCase().includes(lowerSearchTerm) ||
            (client.phone && client.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))) ||
            (client.email && client.email.toLowerCase().includes(lowerSearchTerm))
        );
    }, [clients, searchTerm]);
    
    const renderContent = () => {
        if (!barbershopData) {
             return <p className="text-gray-400 text-center py-8">Carregando dados da barbearia...</p>;
        }
        
        if (filteredClients.length > 0) {
            return filteredClients.map(client => (
                <div 
                    key={client.id} 
                    className="bg-brand-secondary p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700"
                    onClick={() => setSelectedClient(client)}
                >
                    <div>
                        <p className="font-semibold text-lg">{client.name}</p>
                        <p className="text-sm text-gray-400">{client.phone || 'Telefone não informado'}</p>
                        <p className="text-sm text-gray-400">{client.email || 'E-mail não informado'}</p>
                    </div>
                </div>
            ));
        }
        
        if (searchTerm && filteredClients.length === 0) {
            return <p className="text-gray-400 text-center py-8">Nenhum cliente encontrado para "{searchTerm}".</p>
        }
        
        return <p className="text-gray-400 text-center py-8">Nenhum cliente encontrado. Os clientes aparecerão aqui após o primeiro agendamento.</p>;
    }


    return (
        <>
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4 text-brand-light">Clientes</h1>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>

                <div className="space-y-3">
                    {renderContent()}
                </div>
            </div>

            {selectedClient && (
                <ClientDetailsModal
                    client={selectedClient}
                    onClose={() => setSelectedClient(null)}
                />
            )}
        </>
    );
};

export default ClientsScreen;
