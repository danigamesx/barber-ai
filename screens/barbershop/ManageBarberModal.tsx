import React, { useState, useEffect } from 'react';
import { Barber } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface ManageBarberModalProps {
  barberToEdit: Barber | null;
  onClose: () => void;
  onSave: (barber: Omit<Barber, 'id'> & { id?: string }) => void;
}

const ManageBarberModal: React.FC<ManageBarberModalProps> = ({ barberToEdit, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (barberToEdit) {
      setName(barberToEdit.name);
      setAvatarUrl(barberToEdit.avatarUrl);
      setCommissionPercentage(barberToEdit.commissionPercentage?.toString() || '');
    } else {
      setName('');
      setAvatarUrl('');
      setCommissionPercentage('');
    }
  }, [barberToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('O nome do barbeiro é obrigatório.');
      return;
    }
    setError('');
    const finalAvatarUrl = avatarUrl || `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/200/200`;
    onSave({
      id: barberToEdit?.id,
      name,
      avatarUrl: finalAvatarUrl,
      commissionPercentage: parseInt(commissionPercentage, 10) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center">{barberToEdit ? 'Editar Barbeiro' : 'Adicionar Novo Barbeiro'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="barberName" className="block text-sm font-medium text-gray-400 mb-1">Nome do Barbeiro</label>
            <input
              id="barberName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: Carlos"
            />
          </div>
          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-400 mb-1">URL da Foto (Opcional)</label>
            <input
              id="avatarUrl"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Deixe em branco para usar uma imagem padrão"
            />
          </div>
          <div>
            <label htmlFor="barberCommission" className="block text-sm font-medium text-gray-400 mb-1">Comissão (%)</label>
            <input
              id="barberCommission"
              type="number"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: 40"
              min="0"
              max="100"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="pt-4">
            <Button type="submit">Salvar Barbeiro</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageBarberModal;