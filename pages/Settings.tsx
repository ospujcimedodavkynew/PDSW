
import React, { useState, useEffect, FormEvent } from 'react';
import { getCompanySettings, updateCompanySettings } from '../services/api';
import type { CompanySettings } from '../types';
import { Save, Loader } from 'lucide-react';

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<CompanySettings>({
        companyName: '',
        companyAddress: '',
        companyIco: '',
        bankAccount: '',
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const data = await getCompanySettings();
                setSettings(data);
            } catch (err) {
                setError('Nepodařilo se načíst nastavení.');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await updateCompanySettings(settings);
            setSuccessMessage('Nastavení bylo úspěšně uloženo!');
            setTimeout(() => setSuccessMessage(null), 3000); // Hide message after 3 seconds
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uložení se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin text-primary"/></div>;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nastavení Firmy</h1>
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <p className="text-gray-600 mb-6">
                    Zde zadané údaje se budou automaticky propisovat do sekce "Dodavatel" na všech vašich fakturách.
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Název firmy / Jméno</label>
                        <input
                            id="companyName" type="text"
                            value={settings.companyName}
                            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Milan Gula"
                        />
                    </div>
                    <div>
                        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Adresa</label>
                        <input
                            id="companyAddress" type="text"
                            value={settings.companyAddress}
                            onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Ghegova 17, Nové Sady, Brno"
                        />
                    </div>
                     <div>
                        <label htmlFor="companyIco" className="block text-sm font-medium text-gray-700">IČO</label>
                        <input
                            id="companyIco" type="text"
                            value={settings.companyIco}
                            onChange={(e) => setSettings({ ...settings, companyIco: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Vaše IČO"
                        />
                    </div>
                    <div>
                        <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">Číslo bankovního účtu</label>
                        <input
                            id="bankAccount" type="text"
                            value={settings.bankAccount}
                            onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Pro platby na fakturu"
                        />
                    </div>

                    {error && <p className="text-red-500">{error}</p>}
                    {successMessage && <p className="text-green-600">{successMessage}</p>}

                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={isSaving} className="py-2 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:bg-gray-400 flex items-center">
                            {isSaving ? (
                                <><Loader className="w-5 h-5 mr-2 animate-spin"/> Ukládám...</>
                            ) : (
                                <><Save className="w-5 h-5 mr-2"/> Uložit změny</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
