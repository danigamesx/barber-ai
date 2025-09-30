import React, { useState, useEffect } from 'react';
import { Service } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface ManageServiceModalProps {
  serviceToEdit: Service | null;
  onClose: () => void;
  onSave: (service: Omit<Service, 'id'> & { id?: string }) => void;
}

const ManageServiceModal: React.FC<ManageServiceModalProps> = ({ serviceToEdit, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setPrice(serviceToEdit.price.toString());
      setDuration(serviceToEdit.duration.toString());
    } else {
      setName('');
      setPrice('');
      setDuration('');
    }
  }, [serviceToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !duration) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    setError('');
    onSave({
      id: serviceToEdit?.id,
      name,
      price: parseFloat(price),
      duration: parseInt(duration, 10),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center">{serviceToEdit ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-400 mb-1">Nome do Serviço</label>
            <input
              id="serviceName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: Corte Clássico"
            />
          </div>
          <div>
            <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
            <input
              id="servicePrice"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: 30"
              min="0"
            />
          </div>
          <div>
            <label htmlFor="serviceDuration" className="block text-sm font-medium text-gray-400 mb-1">Duração (minutos)</label>
            <input
              id="serviceDuration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Ex: 30"
              min="5"
              step="5"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="pt-4">
            <Button type="submit">Salvar Serviço</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageServiceModal;