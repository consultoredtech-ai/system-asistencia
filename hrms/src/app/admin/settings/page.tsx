'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState({
        CompanyName: '',
        CompanyRUT: '',
        CompanyAddress: '',
        CompanyLogoUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
            setSettings({
                CompanyName: data.settings.CompanyName || '',
                CompanyRUT: data.settings.CompanyRUT || '',
                CompanyAddress: data.settings.CompanyAddress || '',
                CompanyLogoUrl: data.settings.CompanyLogoUrl || ''
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage('Configuración guardada exitosamente');
            } else {
                setMessage('Error al guardar configuración');
            }
        } catch (error) {
            console.error(error);
            setMessage('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if ((session?.user as any)?.role !== 'Admin') {
        return <div className="p-6">Acceso denegado</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Configuración de Empresa</h1>

            <div className="bg-white rounded shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre de la Empresa</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            value={settings.CompanyName}
                            onChange={e => setSettings({ ...settings, CompanyName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">RUT de la Empresa</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            value={settings.CompanyRUT}
                            onChange={e => setSettings({ ...settings, CompanyRUT: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Dirección</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            value={settings.CompanyAddress}
                            onChange={e => setSettings({ ...settings, CompanyAddress: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">URL del Logo</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            value={settings.CompanyLogoUrl}
                            onChange={e => setSettings({ ...settings, CompanyLogoUrl: e.target.value })}
                            placeholder="https://ejemplo.com/logo.png"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                    {message && (
                        <p className={`mt-2 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
