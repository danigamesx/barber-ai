import React, { useState } from 'react';
import { Barbershop, LoyaltyProgram } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface ManageLoyaltyModalProps {
  currentSettings: Barbershop['loyalty_program'];
  onClose: () => void;
  onSave: (settings: Barbershop['loyalty_program']) => void;
}

const ManageLoyaltyModal: React.FC<ManageLoyaltyModalProps> = ({ currentSettings, onClose, onSave }) => {
  const [settings, setSettings] = useState<LoyaltyProgram>({
    enabled: true,
    stampsNeeded: (currentSettings as LoyaltyProgram)?.stampsNeeded || 10,
    reward: (currentSettings as LoyaltyProgram)?.reward || '1 Corte Grátis',
  });

  const handleSave = () => {
    onSave(settings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center">Gerenciar Programa de Fidelidade</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="stampsNeeded" className="block text-sm font-medium text-gray-400 mb-1">Selos para Recompensa</label>
            <input
              id="stampsNeeded"
              type="number"
              value={settings.stampsNeeded}
              onChange={(e) => setSettings(s => ({ ...s, stampsNeeded: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"
              placeholder="Ex: 10"
            />
          </div>
          <div>
            <label htmlFor="reward" className="block text-sm font-medium text-gray-400 mb-1">Descrição da Recompensa</label>
            <input
              id="reward"
              type="text"
              value={settings.reward}
              onChange={(e) => setSettings(s => ({ ...s, reward: e.target.value }))}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"
              placeholder="Ex: 1 Corte Grátis"
            />
          </div>
        </div>
        <div className="mt-8">
          <Button onClick={handleSave}>Salvar Fidelidade</Button>
        </div>
      </div>
    </div>
  );
};

export default ManageLoyaltyModal;
