import React, { useState } from 'react';
import { ChevronDownIcon } from './icons/OutlineIcons';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  initialOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className="bg-brand-secondary rounded-lg overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left font-semibold text-lg text-brand-primary hover:bg-gray-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title.replace(/\s+/g, '-')}`}
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={`accordion-content-${title.replace(/\s+/g, '-')}`}
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 border-t border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;
