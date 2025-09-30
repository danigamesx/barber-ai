
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons/OutlineIcons';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Selecione...", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  
  const filteredOptions = options.filter(option =>
    option.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  const selectOption = (option: string) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
        setIsOpen(!isOpen);
    }
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={handleToggle}
        className={`w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg flex justify-between items-center ${disabled ? 'cursor-not-allowed bg-gray-700' : 'cursor-pointer'}`}
      >
        <span className={value ? '' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-brand-secondary border border-gray-600 rounded-lg z-10 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-brand-dark border-b border-gray-600 focus:outline-none"
            autoFocus
          />
          <ul role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <li
                key={option}
                onClick={() => selectOption(option)}
                className="px-4 py-2 hover:bg-brand-primary/20 cursor-pointer"
                role="option"
                aria-selected={value === option}
              >
                {option}
              </li>
            )) : <li className="px-4 py-2 text-gray-400">Nenhuma opção encontrada.</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
