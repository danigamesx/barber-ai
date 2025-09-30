import React from 'react';

const MockStripeElement: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="bg-brand-secondary p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Pagar com</h3>
        <div className="flex gap-2 mb-4">
          <button className="w-full text-center font-semibold py-2 px-3 rounded-md bg-brand-primary text-brand-dark text-sm">Cartão</button>
          <button className="w-full text-center font-semibold py-2 px-3 rounded-md bg-gray-600 text-gray-300 text-sm">Pix</button>
          <button className="w-full text-center font-semibold py-2 px-3 rounded-md bg-gray-600 text-gray-300 text-sm">Outro</button>
        </div>

        {/* Fake Card Number */}
        <div>
          <label className="text-xs text-gray-400">Número do Cartão</label>
          <div className="w-full p-3 bg-gray-700 rounded-md cursor-not-allowed flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
             </svg>
             <span className="text-gray-500">**** **** **** 1234</span>
          </div>
        </div>
        
        <div className="flex gap-4 mt-3">
          <div className="w-1/2">
            <label className="text-xs text-gray-400">Validade</label>
            <div className="w-full p-3 bg-gray-700 rounded-md cursor-not-allowed">
                <span className="text-gray-500">12 / 28</span>
            </div>
          </div>
          <div className="w-1/2">
            <label className="text-xs text-gray-400">CVC</label>
            <div className="w-full p-3 bg-gray-700 rounded-md cursor-not-allowed">
                 <span className="text-gray-500">***</span>
            </div>
          </div>
        </div>
      </div>
       <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
           </svg>
            Pagamento seguro processado pela Stripe.
       </p>
    </div>
  );
};

export default MockStripeElement;