import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { Barber, Appointment, FinancialRecord } from '../../types';
import { XCircleIcon, TrashIcon, PencilIcon, CheckCircleIcon } from '../../components/icons/OutlineIcons';
import Button from '../../components/Button';

interface ProfessionalDetailsModalProps {
    professional: Barber;
    onClose: () => void;
}

const FinancialRecordForm: React.FC<{
    onAdd: (record: { amount: number, description: string }) => void;
    recordType: string;
}> = ({ onAdd, recordType }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (parseFloat(amount) > 0 && description) {
            onAdd({ amount: parseFloat(amount), description });
            setAmount('');
            setDescription('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-brand-secondary p-3 rounded-lg space-y-2 mt-4">
            <h4 className="font-semibold text-center">Adicionar Novo {recordType}</h4>
            <div className="flex gap-2">
                <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Valor (R$)"
                    className="w-1/3 px-2 py-1 bg-brand-dark border border-gray-600 rounded-md text-sm"
                    required
                />
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descrição"
                    className="w-2/3 px-2 py-1 bg-brand-dark border border-gray-600 rounded-md text-sm"
                    required
                />
            </div>
            <Button type="submit" variant="secondary" className="w-full py-1 text-sm">Adicionar</Button>
        </form>
    );
}

const ProfessionalDetailsModal: React.FC<ProfessionalDetailsModalProps> = ({ professional, onClose }) => {
    const { barbershopData, allAppointments, addFinancialRecord, deleteFinancialRecord, updateBarberData } = useContext(AppContext);
    
    const [activeTab, setActiveTab] = useState<'report' | 'advances' | 'consumptions'>('report');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isEditingCommission, setIsEditingCommission] = useState(false);
    const [newCommission, setNewCommission] = useState(professional.commissionPercentage?.toString() || '0');


    const handleAddRecord = (type: 'advances' | 'consumptions') => (recordData: { amount: number, description: string }) => {
        if (barbershopData) {
            addFinancialRecord(barbershopData.id, professional.id, type, recordData);
        }
    };

    const handleDeleteRecord = (type: 'advances' | 'consumptions', recordId: string) => {
        if (barbershopData && window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            deleteFinancialRecord(barbershopData.id, professional.id, type, recordId);
        }
    };
    
    const handleSaveCommission = () => {
        if (barbershopData) {
            updateBarberData(barbershopData.id, professional.id, { commissionPercentage: parseFloat(newCommission) });
            setIsEditingCommission(false);
        }
    };

    const filteredData = useMemo(() => {
        const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
        const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;

        const appointments = allAppointments.filter(app => {
            const appDate = new Date(app.start_time);
            return app.barber_id === professional.id &&
                   app.status === 'completed' &&
                   (!startDate || appDate >= startDate) &&
                   (!endDate || appDate <= endDate);
        });

        const advances = (Array.isArray(professional.advances) ? professional.advances : []).filter((adv: FinancialRecord) => {
            if (!adv || !adv.date) return false;
            const advDate = new Date(adv.date);
            if (isNaN(advDate.getTime())) return false;
            return (!startDate || advDate >= startDate) && (!endDate || advDate <= endDate);
        });

        const consumptions = (Array.isArray(professional.consumptions) ? professional.consumptions : []).filter((con: FinancialRecord) => {
            if (!con || !con.date) return false;
            const conDate = new Date(con.date);
            if (isNaN(conDate.getTime())) return false;
            return (!startDate || conDate >= startDate) && (!endDate || conDate <= endDate);
        });

        return { appointments, advances, consumptions };
    }, [allAppointments, professional, dateRange]);

    const reportTotals = useMemo(() => {
        const totalCommission = filteredData.appointments.reduce((sum, app) => sum + (app.commission_amount || 0), 0);
        const totalAdvances = filteredData.advances.reduce((sum, adv) => sum + adv.amount, 0);
        const totalConsumptions = filteredData.consumptions.reduce((sum, con) => sum + con.amount, 0);
        const amountToPay = totalCommission - totalAdvances - totalConsumptions;

        return { totalCommission, totalAdvances, totalConsumptions, amountToPay };
    }, [filteredData]);

    const renderReport = () => (
        <div className="space-y-4">
            <div className="bg-brand-secondary p-3 rounded-lg space-y-2">
                 <h4 className="font-semibold text-center mb-2">Filtrar por Período</h4>
                 <div className="flex gap-2">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="bg-brand-dark p-2 rounded-md w-full text-sm"/>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="bg-brand-dark p-2 rounded-md w-full text-sm"/>
                 </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
                 <div className="bg-green-500/20 p-2 rounded-lg">
                    <p className="text-xs text-green-400">Comissão</p>
                    <p className="font-bold text-lg text-green-300">R$ {reportTotals.totalCommission.toFixed(2)}</p>
                 </div>
                  <div className="bg-red-500/20 p-2 rounded-lg">
                    <p className="text-xs text-red-400">Vales</p>
                    <p className="font-bold text-lg text-red-300">R$ {reportTotals.totalAdvances.toFixed(2)}</p>
                 </div>
                 <div className="bg-amber-500/20 p-2 rounded-lg">
                    <p className="text-xs text-amber-400">Consumo</p>
                    <p className="font-bold text-lg text-amber-300">R$ {reportTotals.totalConsumptions.toFixed(2)}</p>
                 </div>
                  <div className="bg-brand-primary/20 p-2 rounded-lg">
                    <p className="text-xs text-brand-primary">Total a Pagar</p>
                    <p className="font-bold text-lg text-amber-300">R$ {reportTotals.amountToPay.toFixed(2)}</p>
                 </div>
            </div>
             <div>
                <h4 className="font-semibold mb-2">Detalhes da Comissão</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {filteredData.appointments.map(app => (
                        <div key={app.id} className="bg-brand-secondary p-2 rounded-md text-xs flex justify-between">
                           <div>
                             <p>{app.service_name} - {app.client_name}</p>
                             <p className="text-gray-400">{app.start_time.toLocaleDateString()}</p>
                           </div>
                           <p className="font-semibold text-green-400">+ R$ {(app.commission_amount || 0).toFixed(2)}</p>
                        </div>
                    ))}
                    {filteredData.appointments.length === 0 && <p className="text-xs text-center text-gray-400">Nenhum serviço concluído no período.</p>}
                </div>
            </div>
        </div>
    );

    const renderFinancialList = (title: string, records: FinancialRecord[], type: 'advances' | 'consumptions') => (
        <div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {records.map(rec => (
                     <div key={rec.id} className="bg-brand-secondary p-2 rounded-md text-sm flex justify-between items-center">
                        <div>
                            <p className="font-semibold">R$ {rec.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{rec.description} - {new Date(rec.date).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => handleDeleteRecord(type, rec.id)} className="text-gray-400 hover:text-red-500 p-1"><TrashIcon className="w-4 h-4"/></button>
                     </div>
                ))}
                {records.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum lançamento.</p>}
            </div>
            <FinancialRecordForm onAdd={handleAddRecord(type)} recordType={title} />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <div className="text-center">
                    <img src={professional.avatarUrl} alt={professional.name} className="w-20 h-20 rounded-full mx-auto ring-2 ring-brand-primary mb-2" />
                    <h2 className="text-xl font-bold text-brand-primary">{professional.name}</h2>
                    {isEditingCommission ? (
                        <div className="flex gap-2 items-center justify-center my-2">
                           <input
                                type="number"
                                value={newCommission}
                                onChange={e => setNewCommission(e.target.value)}
                                className="w-20 px-2 py-1 bg-brand-dark border border-gray-600 rounded-md text-center"
                                autoFocus
                            />
                            <span className="text-lg">%</span>
                            <button onClick={handleSaveCommission} className="text-green-500"><CheckCircleIcon className="w-6 h-6"/></button>
                        </div>
                    ) : (
                         <div className="flex items-center justify-center gap-2 text-sm text-gray-300 my-1">
                            <span>Comissão: {professional.commissionPercentage || 0}%</span>
                            <button onClick={() => setIsEditingCommission(true)} className="text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>
                
                <div className="bg-brand-secondary rounded-lg p-1 flex my-4 text-sm">
                    <button onClick={() => setActiveTab('report')} className={`w-1/3 py-1.5 rounded-md font-semibold transition ${activeTab === 'report' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>Relatório</button>
                    <button onClick={() => setActiveTab('advances')} className={`w-1/3 py-1.5 rounded-md font-semibold transition ${activeTab === 'advances' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>Vales</button>
                    <button onClick={() => setActiveTab('consumptions')} className={`w-1/3 py-1.5 rounded-md font-semibold transition ${activeTab === 'consumptions' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>Consumo</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {activeTab === 'report' && renderReport()}
                    {activeTab === 'advances' && renderFinancialList('Vale', professional.advances || [], 'advances')}
                    {activeTab === 'consumptions' && renderFinancialList('Consumo', professional.consumptions || [], 'consumptions')}
                </div>
            </div>
        </div>
    );
};

export default ProfessionalDetailsModal;