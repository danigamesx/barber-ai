import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../App';
import { WaitingListEntry } from '../../types';

const WaitingListScreen: React.FC = () => {
    const { barbershopData, removeFromWaitingList } = useContext(AppContext);

    const waitingList = useMemo(() => {
        const list = (barbershopData?.waiting_list as { [date: string]: WaitingListEntry[] }) || {};
        return Object.entries(list)
            .filter(([, entries]) => entries && entries.length > 0)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }, [barbershopData]);

    const handleRemove = (date: string, clientId: string) => {
        if (barbershopData && window.confirm("Tem certeza que deseja remover este cliente da lista de espera?")) {
           removeFromWaitingList(barbershopData.id, date, clientId);
        }
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6 text-brand-light">Lista de Espera</h1>

            {waitingList.length > 0 ? (
                <div className="space-y-6">
                    {waitingList.map(([date, entries]) => (
                        <div key={date}>
                            <h2 className="text-lg font-semibold text-brand-primary mb-2">
                                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h2>
                            <div className="space-y-3">
                                {entries.map((entry, index) => (
                                    <div key={entry.clientId} className="bg-brand-secondary p-4 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-lg">{index + 1}</span>
                                            <div>
                                                <p className="font-semibold">{entry.clientName}</p>
                                                <p className="text-xs text-gray-400">Solicitado em: {new Date(entry.requestedAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                         <button 
                                            onClick={() => handleRemove(date, entry.clientId)} 
                                            className="text-red-500 hover:text-red-400 text-sm font-semibold"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-400">Nenhum cliente na lista de espera no momento.</p>
                </div>
            )}
        </div>
    );
};

export default WaitingListScreen;