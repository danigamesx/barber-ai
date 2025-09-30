import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { Barber } from '../../types';
import ProfessionalDetailsModal from './ProfessionalDetailsModal';

const ProfessionalsScreen: React.FC = () => {
    const { barbershopData } = useContext(AppContext);
    const [selectedProfessional, setSelectedProfessional] = useState<Barber | null>(null);

    const professionals = Array.isArray(barbershopData?.barbers) 
        ? barbershopData.barbers as unknown as Barber[] 
        : [];

    return (
        <>
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-6 text-brand-light">Profissionais</h1>

                <div className="space-y-3">
                    {professionals.length > 0 ? (
                        professionals.map(prof => (
                            <div
                                key={prof.id}
                                className="bg-brand-secondary p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700"
                                onClick={() => setSelectedProfessional(prof)}
                            >
                                <div className="flex items-center gap-4">
                                    <img src={prof.avatarUrl} alt={prof.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-lg">{prof.name}</p>
                                        <p className="text-sm text-gray-400">Comissão: {prof.commissionPercentage || 0}%</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                         <p className="text-gray-400 text-center py-8">Nenhum profissional cadastrado.</p>
                    )}
                </div>
            </div>

            {selectedProfessional && (
                <ProfessionalDetailsModal
                    professional={selectedProfessional}
                    onClose={() => setSelectedProfessional(null)}
                />
            )}
        </>
    );
};

export default ProfessionalsScreen;