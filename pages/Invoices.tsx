import React from 'react';

const Invoices: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Fakturace</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600">
                    Tato sekce je ve vývoji. Zde bude možné spravovat a generovat faktury pro jednotlivé rezervace.
                </p>
            </div>
        </div>
    );
};

export default Invoices;
