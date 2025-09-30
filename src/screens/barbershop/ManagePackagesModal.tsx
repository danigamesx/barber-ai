import React, { useState } from 'react';
import { ServicePackage, Service } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/icons/OutlineIcons';

interface ManagePackagesModalProps {
  currentPackages: ServicePackage[];
  availableServices: Service[];
  onClose: () => void;
  onSave: (packages: ServicePackage[]) => void;
}

const emptyPackage: Omit<ServicePackage, 'id'> = {
  name: '',
  serviceIds: [],
  price: 0,
  totalUses: 0,
};

const ManagePackagesModal: React.FC<ManagePackagesModalProps> = ({ currentPackages, availableServices, onClose, onSave }) => {
  const [packages, setPackages] = useState<ServicePackage[]>(currentPackages);
  const [editingPackage, setEditingPackage] = useState<(Omit<ServicePackage, 'id'> & { id?: string }) | null>(null);

  const handleSavePackage = () => {
    if (!editingPackage) return;
    let updatedPackages;
    if (editingPackage.id) {
      updatedPackages = packages.map(p => p.id === editingPackage.id ? (editingPackage as ServicePackage) : p);
    } else {
      updatedPackages = [...packages, { ...editingPackage, id: `pkg_${Date.now()}` }];
    }
    setPackages(updatedPackages);
    setEditingPackage(null);
  };

  const handleDeletePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const handleToggleServiceInPackage = (serviceId: string) => {
    if (!editingPackage) return;
    const currentIds = editingPackage.serviceIds;
    const newIds = currentIds.includes(serviceId)
      ? currentIds.filter(id => id !== serviceId)
      : [...currentIds, serviceId];
    setEditingPackage({ ...editingPackage, serviceIds: newIds });
  };
  
  const renderPackageForm = () => {
      if (!editingPackage) return null;
      return (
          <div className="bg-brand-secondary p-4 rounded-lg mt-4 space-y-4">
              <h3 className="font-semibold text-lg">{editingPackage.id ? 'Editar Pacote' : 'Novo Pacote'}</h3>
              <input type="text" placeholder="Nome do Pacote" value={editingPackage.name} onChange={e => setEditingPackage({...editingPackage, name: e.target.value})} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
              <div className="flex gap-4">
                <input type="number" placeholder="Preço (R$)" value={editingPackage.price} onChange={e => setEditingPackage({...editingPackage, price: parseFloat(e.target.value) || 0})} className="w-1/2 px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
                <input type="number" placeholder="Nº de Usos" value={editingPackage.totalUses} onChange={e => setEditingPackage({...editingPackage, totalUses: parseInt(e.target.value) || 0})} className="w-1/2 px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
              </div>
              <div>
                  <h4 className="font-semibold mb-2">Serviços Inclusos</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availableServices.map(service => (
                          <label key={service.id} className="flex items-center gap-2 bg-brand-dark p-2 rounded-md">
                              <input type="checkbox" checked={editingPackage.serviceIds.includes(service.id)} onChange={() => handleToggleServiceInPackage(service.id)} className="accent-brand-primary w-5 h-5"/>
                              <span>{service.name}</span>
                          </label>
                      ))}
                  </div>
              </div>
              <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => setEditingPackage(null)}>Cancelar</Button>
                  <Button onClick={handleSavePackage}>Salvar Pacote</Button>
              </div>
          </div>
      )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Gerenciar Pacotes</h2>
            <button onClick={() => setEditingPackage(emptyPackage)} className="text-brand-primary"><PlusCircleIcon className="w-8 h-8"/></button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
            {packages.map(pkg => (
                <div key={pkg.id} className="bg-brand-secondary p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{pkg.name}</p>
                        <p className="text-xs text-gray-400">{pkg.totalUses} usos por R${pkg.price}</p>
                    </div>
                     <div className="flex gap-3">
                        <button onClick={() => setEditingPackage(pkg)} className="text-gray-400 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            ))}
            {packages.length === 0 && !editingPackage && <p className="text-gray-400 text-center py-4">Nenhum pacote criado.</p>}
            {renderPackageForm()}
        </div>

        <div className="mt-8">
          <Button onClick={() => onSave(packages)}>Salvar Alterações e Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default ManagePackagesModal;
