

import React, { useState, useMemo } from 'react';
import Button from '../../components/Button';
import { XCircleIcon, TrashIcon } from '../../components/icons/OutlineIcons';
import { Barbershop, BlockedTimeSlot, OpeningHours, DayOpeningHours } from '../../types';

interface ManageScheduleModalProps {
  currentOpeningHours: Barbershop['opening_hours'];
  currentBlockedDates: string[];
  currentBlockedTimeSlots: Barbershop['blocked_time_slots'];
  onClose: () => void;
  onSave: (data: { 
    openingHours: Barbershop['opening_hours'], 
    blockedDates: string[],
    blockedTimeSlots: Barbershop['blocked_time_slots']
  }) => void;
}

const dayTranslations: { [key: string]: string } = {
    sunday: 'Domingo',
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
};

const ManageScheduleModal: React.FC<ManageScheduleModalProps> = ({ currentOpeningHours, currentBlockedDates, currentBlockedTimeSlots, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'hours' | 'blocking' | 'slots'>('hours');
  const [openingHours, setOpeningHours] = useState<OpeningHours>(JSON.parse(JSON.stringify(currentOpeningHours || {})));
  const [blockedDates, setBlockedDates] = useState([...currentBlockedDates]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<BlockedTimeSlot[]>(Array.isArray(currentBlockedTimeSlots) ? currentBlockedTimeSlots as BlockedTimeSlot[] : []);

  const [calendarDate, setCalendarDate] = useState(new Date());

  const [newBlock, setNewBlock] = useState({ date: new Date().toISOString().split('T')[0], start: '12:00', end: '13:00' });

  const handleHourChange = (day: string, type: keyof DayOpeningHours, value: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: { ...(prev[day] as DayOpeningHours), [type]: value },
    }));
  };

  const toggleDay = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: prev[day] ? null : { morning_open: '09:00', morning_close: '12:00', afternoon_open: '13:00', afternoon_close: '18:00' },
    }));
  };
  
  const handleToggleBlockedDate = (dateString: string) => {
    setBlockedDates(prev => 
        prev.includes(dateString) 
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    );
  };

  const handleAddBlockedSlot = () => {
    const [year, month, day] = newBlock.date.split('-').map(Number);
    const [startHour, startMinute] = newBlock.start.split(':').map(Number);
    const [endHour, endMinute] = newBlock.end.split(':').map(Number);
    
    // Create date objects in UTC to avoid timezone issues when converting to ISO string
    const startDate = new Date(Date.UTC(year, month - 1, day, startHour, startMinute));
    const endDate = new Date(Date.UTC(year, month - 1, day, endHour, endMinute));

    if (endDate <= startDate) {
      alert('O horário final deve ser após o horário inicial.');
      return;
    }

    setBlockedTimeSlots(prev => [...prev, { start: startDate.toISOString(), end: endDate.toISOString() }]);
  };

  const handleRemoveBlockedSlot = (index: number) => {
    setBlockedTimeSlots(prev => prev.filter((_, i) => i !== index));
  };


  const handleSubmit = () => {
    onSave({ openingHours, blockedDates, blockedTimeSlots });
  };
  
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const endOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    const days = [];
    let day = new Date(startDate);
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    return days;
  }, [calendarDate]);

  const changeMonth = (offset: number) => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const renderHoursTab = () => (
    <div className="space-y-4">
      {Object.keys(dayTranslations).map(day => {
        const dayHours = openingHours[day];
        return (
          <div key={day} className="bg-brand-secondary p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <label htmlFor={`toggle-${day}`} className="font-semibold capitalize">{dayTranslations[day]}</label>
              <input 
                id={`toggle-${day}`} 
                type="checkbox" 
                className="toggle-checkbox"
                checked={!!dayHours}
                onChange={() => toggleDay(day)}
              />
            </div>
            {dayHours && (
              <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-2 gap-y-2 mt-3 text-sm">
                <span className="text-gray-400">Manhã:</span>
                <input type="time" value={dayHours.morning_open} onChange={e => handleHourChange(day, 'morning_open', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                <span>até</span>
                <input type="time" value={dayHours.morning_close} onChange={e => handleHourChange(day, 'morning_close', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                
                <span className="text-gray-400">Tarde:</span>
                <input type="time" value={dayHours.afternoon_open} onChange={e => handleHourChange(day, 'afternoon_open', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                <span>até</span>
                <input type="time" value={dayHours.afternoon_close} onChange={e => handleHourChange(day, 'afternoon_close', e.target.value)} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
              </div>
            )}
          </div>
        )
      })}
    </div>
  );
  
  const renderBlockingTab = () => (
     <div className="bg-brand-secondary p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
        <h3 className="font-bold text-lg">{calendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(day => {
            const dateString = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const isBlocked = blockedDates.includes(dateString);
            const isCurrentMonth = day.getMonth() === calendarDate.getMonth();

            return (
                <button 
                    key={dateString}
                    onClick={() => handleToggleBlockedDate(dateString)}
                    className={`h-10 text-xs rounded-md flex items-center justify-center
                    ${isCurrentMonth ? 'text-white' : 'text-gray-600'}
                    ${isBlocked ? 'bg-red-500/50 line-through' : 'bg-gray-700'}
                    `}
                >
                    {day.getDate()}
                </button>
            )
        })}
      </div>
    </div>
  );

  const renderSlotsTab = () => (
    <div>
        <div className="bg-brand-secondary p-3 rounded-lg space-y-3">
            <h3 className="font-semibold text-center">Adicionar Bloqueio de Horário</h3>
            <div className="flex gap-2">
                <input type="date" value={newBlock.date} onChange={e => setNewBlock(p => ({...p, date: e.target.value}))} className="bg-brand-dark p-2 rounded-md w-full" />
            </div>
            <div className="flex gap-2 items-center">
                 <input type="time" value={newBlock.start} onChange={e => setNewBlock(p => ({...p, start: e.target.value}))} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
                <span>até</span>
                <input type="time" value={newBlock.end} onChange={e => setNewBlock(p => ({...p, end: e.target.value}))} className="bg-brand-dark p-2 rounded-md w-full text-center"/>
            </div>
            <Button variant="secondary" onClick={handleAddBlockedSlot}>Adicionar Bloqueio</Button>
        </div>

        <div className="mt-4 space-y-2">
            <h3 className="font-semibold text-brand-primary">Horários Bloqueados</h3>
            {blockedTimeSlots.length === 0 && <p className="text-gray-400 text-sm text-center">Nenhum horário específico bloqueado.</p>}
            {blockedTimeSlots.map((slot, index) => {
                const startDate = new Date(slot.start);
                const endDate = new Date(slot.end);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return null; // Don't render invalid slots
                }
                
                return (
                    <div key={index} className="bg-brand-secondary p-2 rounded-lg flex justify-between items-center text-sm">
                        <div>
                            <p>{startDate.toLocaleDateString()}</p>
                            <p className="text-gray-300">{startDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {endDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                        </div>
                        <button onClick={() => handleRemoveBlockedSlot(index)} className="text-red-500 hover:text-red-400 p-2">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Gerenciar Agenda</h2>

        <div className="bg-brand-secondary rounded-lg p-1 flex mb-4 text-sm">
            <button onClick={() => setActiveTab('hours')} className={`w-1/3 py-2 rounded-md font-semibold transition ${activeTab === 'hours' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
                Horários
            </button>
            <button onClick={() => setActiveTab('blocking')} className={`w-1/3 py-2 rounded-md font-semibold transition ${activeTab === 'blocking' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
                Dias
            </button>
             <button onClick={() => setActiveTab('slots')} className={`w-1/3 py-2 rounded-md font-semibold transition ${activeTab === 'slots' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}>
                Intervalos
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2">
            {activeTab === 'hours' && renderHoursTab()}
            {activeTab === 'blocking' && renderBlockingTab()}
            {activeTab === 'slots' && renderSlotsTab()}
        </div>
        
         <style>{`
          .toggle-checkbox { appearance: none; width: 3.5rem; height: 1.75rem; background-color: #374151; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
          .toggle-checkbox::before { content: ''; width: 1.5rem; height: 1.5rem; background-color: white; border-radius: 9999px; position: absolute; top: 0.125rem; left: 0.125rem; transition: transform 0.2s ease-in-out; }
          .toggle-checkbox:checked { background-color: #FBBF24; }
          .toggle-checkbox:checked::before { transform: translateX(1.75rem); }
        `}</style>
        
        <div className="mt-6">
            <Button onClick={handleSubmit}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
};

export default ManageScheduleModal;
