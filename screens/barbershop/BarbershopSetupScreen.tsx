import React, { useState, useContext } from 'react';
import { AppContext } from '../../App';
import { Barbershop, Service, Barber, Json, OpeningHours, CancellationPolicy, Address, DayOpeningHours } from '../../types';
import Button from '../../components/Button';
import ManageServiceModal from './ManageServiceModal';
import ManageBarberModal from './ManageBarberModal';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/icons/OutlineIcons';
import { states, cities } from '../../data/brazil-locations';
import { formatCEP } from '../../utils/formatters';
import SearchableSelect from '../../components/SearchableSelect';

const dayTranslations: { [key: string]: string } = {
    sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
    thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado',
};

const ProgressBar: React.FC<{ step: number, totalSteps: number }> = ({ step, totalSteps }) => (
    <div className="flex justify-between items-center mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
            <React.Fragment key={i}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > i ? 'bg-brand-primary text-brand-dark' : 'bg-brand-secondary text-brand-light'}`}>
                    {i + 1}
                </div>
                {i < totalSteps - 1 && <div className={`flex-grow h-1 mx-2 ${step > i + 1 ? 'bg-brand-primary' : 'bg-brand-secondary'}`}></div>}
            </React.Fragment>
        ))}
    </div>
);

const BarbershopSetupScreen: React.FC = () => {
    const { barbershopData, updateBarbershopData } = useContext(AppContext);
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 5;
    
    const [setupData, setSetupData] = useState<Partial<Barbershop>>({
        address: barbershopData?.address || { street: '', number: '', neighborhood: '', city: '', state: '', zip: '', country: 'Brasil' },
        services: barbershopData?.services || [],
        barbers: barbershopData?.barbers || [],
        opening_hours: barbershopData?.opening_hours || {
            sunday: null,
            monday: { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' },
            tuesday: { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' },
            wednesday: { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' },
            thursday: { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' },
            friday: { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' },
            saturday: { morning_open: '08:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '17:00' }
        },
        cancellation_policy: barbershopData?.cancellation_policy || { enabled: true, feePercentage: 50, timeLimitHours: 2 },
    });
    
    const [modal, setModal] = useState<'service' | 'barber' | null>(null);
    const [editingItem, setEditingItem] = useState<Service | Barber | null>(null);

    const updateField = (field: keyof Barbershop, value: any) => {
        setSetupData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS + 1));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleFinalSave = () => {
        if (barbershopData) {
            updateBarbershopData(barbershopData.id, { ...setupData, has_completed_setup: true });
        }
    };
    
    // --- Render Steps ---
    const renderWelcomeStep = () => (
        <div>
            <h2 className="text-2xl font-bold text-center mb-2">Bem-vindo(a) ao BarberAI!</h2>
            <p className="text-gray-400 text-center">Vamos configurar sua barbearia em poucos passos para que você possa começar a receber agendamentos.</p>
        </div>
    );

    const renderAddressStep = () => {
        const address = setupData.address! as Address;
        const handleAddressChange = (field: keyof Address, value: string) => {
            setSetupData(prev => {
                const newAddress = { ...(prev.address as object), [field]: value };
                if (field === 'state') {
                    (newAddress as Address).city = '';
                }
                return { ...prev, address: newAddress as Json };
            });
        };
        return (
            <div>
                <h3 className="text-xl font-semibold mb-4 text-center">Qual o endereço da sua barbearia?</h3>
                <div className="space-y-3">
                    <input type="text" name="street" value={address.street} onChange={(e) => handleAddressChange('street', e.target.value)} placeholder="Rua / Avenida" className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"/>
                    <div className="flex gap-3">
                        <input type="text" name="number" value={address.number} onChange={(e) => handleAddressChange('number', e.target.value)} placeholder="Nº" className="w-1/3 px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"/>
                        <input type="text" name="neighborhood" value={address.neighborhood} onChange={(e) => handleAddressChange('neighborhood', e.target.value)} placeholder="Bairro" className="w-2/3 px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"/>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-1/2">
                            <select 
                                name="state"
                                value={address.state}
                                onChange={(e) => handleAddressChange('state', e.target.value)}
                                className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg h-[42px]"
                            >
                                <option value="">Estado</option>
                                {states.map(s => <option key={s.uf} value={s.uf}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="w-1/2">
                            <SearchableSelect 
                                options={cities[address.state || ''] || []}
                                value={address.city}
                                onChange={(value) => handleAddressChange('city', value)}
                                placeholder="Cidade"
                            />
                        </div>
                    </div>
                    <input 
                        type="text" 
                        name="zip" 
                        value={address.zip} 
                        onChange={(e) => handleAddressChange('zip', formatCEP(e.target.value))}
                        maxLength={9}
                        placeholder="CEP" 
                        className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"/>
                </div>
            </div>
        )
    };
    
    const renderServicesStep = () => {
        const services = Array.isArray(setupData.services) ? (setupData.services as Service[]) : [];
        
        const handleSave = (serviceData: Omit<Service, 'id'> & { id?: string }) => {
            let updated: Service[];
            if (serviceData.id) {
                updated = services.map(s => s.id === serviceData.id ? serviceData as Service : s);
            } else {
                updated = [...services, { ...serviceData, id: `s_${Date.now()}` }];
            }
            updateField('services', updated);
            setModal(null); setEditingItem(null);
        };
        const handleDelete = (serviceId: string) => {
            updateField('services', services.filter(s => s.id !== serviceId));
        };
        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Quais serviços você oferece?</h3>
                    <button onClick={() => { setEditingItem(null); setModal('service'); }} className="text-brand-primary"><PlusCircleIcon className="w-8 h-8"/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {services.map(s => (
                         <div key={s.id} className="flex justify-between items-center bg-brand-secondary p-3 rounded-md">
                            <div><p>{s.name} (R${s.price})</p><p className="text-xs text-gray-400">{s.duration} min</p></div>
                            <div className="flex gap-3">
                                <button onClick={() => { setEditingItem(s); setModal('service'); }} className="text-gray-400 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                    {services.length === 0 && <p className="text-center text-gray-400 py-4">Adicione seu primeiro serviço.</p>}
                </div>
                {modal === 'service' && <ManageServiceModal serviceToEdit={editingItem as Service | null} onClose={() => { setModal(null); setEditingItem(null); }} onSave={handleSave} />}
            </div>
        );
    };

    const renderBarbersStep = () => {
        const barbers = Array.isArray(setupData.barbers) ? (setupData.barbers as Barber[]) : [];

        const handleSave = (barberData: Omit<Barber, 'id'> & { id?: string }) => {
            let updated: Barber[];
            if (barberData.id) {
                updated = barbers.map(b => b.id === barberData.id ? barberData as Barber : b);
            } else {
                updated = [...barbers, { ...barberData, avatarUrl: barberData.avatarUrl || `https://picsum.photos/seed/${barberData.name.replace(/\s+/g, '')}/200/200`, id: `b_${Date.now()}` }];
            }
            updateField('barbers', updated);
            setModal(null); setEditingItem(null);
        };
         const handleDelete = (barberId: string) => {
            updateField('barbers', barbers.filter(b => b.id !== barberId));
        };
        return (
             <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Quem são os profissionais?</h3>
                    <button onClick={() => { setEditingItem(null); setModal('barber'); }} className="text-brand-primary"><PlusCircleIcon className="w-8 h-8"/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {barbers.map(b => (
                         <div key={b.id} className="flex justify-between items-center bg-brand-secondary p-2 rounded-md">
                            <div className="flex items-center gap-3"><img src={b.avatarUrl} className="w-10 h-10 rounded-full" /> <p>{b.name}</p></div>
                            <div className="flex gap-3">
                                <button onClick={() => { setEditingItem(b); setModal('barber'); }} className="text-gray-400 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(b.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                    {barbers.length === 0 && <p className="text-center text-gray-400 py-4">Adicione seu primeiro profissional.</p>}
                </div>
                {modal === 'barber' && <ManageBarberModal barberToEdit={editingItem as Barber | null} onClose={() => { setModal(null); setEditingItem(null); }} onSave={handleSave} />}
            </div>
        );
    };

    const renderScheduleStep = () => {
        const hours = setupData.opening_hours! as OpeningHours;
        const handleHourChange = (day: string, type: keyof DayOpeningHours, value: string) => {
            updateField('opening_hours', { ...hours, [day]: { ...(hours as any)[day], [type]: value } });
        };
        const toggleDay = (day: string) => {
            const current = (hours as any)[day];
            updateField('opening_hours', { ...hours, [day]: current ? null : { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' } });
        };
        return (
            <div>
                 <h3 className="text-xl font-semibold mb-4 text-center">Qual seu horário de funcionamento?</h3>
                 <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                     {Object.keys(dayTranslations).map(day => {
                         const dayHours = (hours as any)[day] as DayOpeningHours | null;
                         return (
                         <div key={day} className="bg-brand-secondary p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                                <label className="font-semibold capitalize">{dayTranslations[day]}</label>
                                <input type="checkbox" checked={!!dayHours} onChange={() => toggleDay(day)} className="accent-brand-primary w-5 h-5"/>
                            </div>
                            {dayHours && (
                                <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-2 gap-y-2 mt-3 text-sm">
                                    <span className="text-gray-400">Manhã:</span>
                                    <input type="time" value={dayHours.morning_open} onChange={e => handleHourChange(day, 'morning_open', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                                    <span>-</span>
                                    <input type="time" value={dayHours.morning_close} onChange={e => handleHourChange(day, 'morning_close', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>

                                    <span className="text-gray-400">Tarde:</span>
                                    <input type="time" value={dayHours.afternoon_open} onChange={e => handleHourChange(day, 'afternoon_open', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                                    <span>-</span>
                                    <input type="time" value={dayHours.afternoon_close} onChange={e => handleHourChange(day, 'afternoon_close', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                                </div>
                            )}
                         </div>
                        )
                     })}
                 </div>
            </div>
        );
    };

    const renderFinishStep = () => (
        <div>
            <h2 className="text-2xl font-bold text-center mb-2">Tudo pronto!</h2>
            <p className="text-gray-400 text-center">Sua barbearia está configurada. Clique abaixo para finalizar e acessar seu painel de controle.</p>
        </div>
    );
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-dark">
            <div className="w-full max-w-2xl mx-auto bg-brand-dark rounded-lg shadow-2xl p-8">
                <ProgressBar step={step} totalSteps={TOTAL_STEPS} />
                
                <div className="my-8 min-h-[300px] flex items-center justify-center">
                    {step === 1 && renderWelcomeStep()}
                    {step === 2 && renderAddressStep()}
                    {step === 3 && renderServicesStep()}
                    {step === 4 && renderBarbersStep()}
                    {step === 5 && renderScheduleStep()}
                    {step === 6 && renderFinishStep()}
                </div>

                <div className="flex gap-4">
                    {step > 1 && <Button variant="secondary" onClick={prevStep}>Voltar</Button>}
                    {step <= TOTAL_STEPS && <Button onClick={nextStep}>Próximo</Button>}
                    {step > TOTAL_STEPS && <Button onClick={handleFinalSave}>Concluir e ir para o Painel</Button>}
                </div>
            </div>
        </div>
    );
};

export default BarbershopSetupScreen;