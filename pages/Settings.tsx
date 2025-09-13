import React from 'react';

const Settings: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Nastavení</h1>
             <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600">
                    Tato sekce je ve vývoji. Zde bude možné upravovat nastavení aplikace, jako jsou kontaktní údaje firmy, smluvní podmínky, atd.
                </p>
            </div>
        </div>
    );
};

export default Settings;
