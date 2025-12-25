'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function PayrollDashboard() {
    const { data: session } = useSession();
    const [payroll, setPayroll] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isOpen, setIsOpen] = useState(false);

    const isAdmin = (session?.user as any)?.role === 'Admin';

    useEffect(() => {
        fetchPayroll();
        if (isAdmin) {
            fetchUsers();
        }
    }, []);

    const fetchUsers = async () => {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data.users || []);
    };

    const fetchPayroll = async () => {
        try {
            const res = await fetch(`/api/payroll?month=${month}&year=${year}`);
            if (!res.ok) {
                console.error('Failed to fetch payroll');
                setPayroll([]);
                return;
            }
            const data = await res.json();
            setPayroll(data.payroll || []);
        } catch (err) {
            console.error('Error fetching payroll:', err);
            setPayroll([]);
        }
    };

    const handleGeneratePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setLoading(true);
        try {
            const res = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee,
                    month: month.toString(),
                    year: year.toString()
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                alert(`Error: ${data.error || 'No se pudo generar la nómina'}`);
                return;
            }

            alert('Nómina generada exitosamente');
            fetchPayroll();
        } catch (err) {
            console.error('Error generating payroll:', err);
            alert('Error al generar nómina. Verifica que la hoja "Payroll" exista en Google Sheets.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded shadow">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
            >
                <h2 className="text-xl font-semibold">Módulo de Nómina</h2>
                <svg
                    className={`w-6 h-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="p-6 pt-0 border-t space-y-6">
                    {isAdmin && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-sm font-semibold mb-3">Generar Nómina</h3>
                            <form onSubmit={handleGeneratePayroll} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Empleado</label>
                                    <select
                                        className="w-full p-2 border rounded text-sm"
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {users.filter(u => u.role === 'Employee').map(u => (
                                            <option key={u.employeeId} value={u.employeeId}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Mes</label>
                                    <select
                                        className="w-full p-2 border rounded text-sm"
                                        value={month}
                                        onChange={(e) => setMonth(parseInt(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(2000, i).toLocaleString('es-ES', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Año</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded text-sm"
                                        value={year}
                                        onChange={(e) => setYear(parseInt(e.target.value))}
                                        min="2020"
                                        max="2030"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                                    >
                                        {loading ? 'Generando...' : 'Generar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-semibold mb-3">
                            {isAdmin ? 'Nóminas Generadas' : 'Mi Historial de Nómina'}
                        </h3>
                        <div className="overflow-x-auto border rounded">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {isAdmin && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>}
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">H. Extra</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pago Extra</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deduc.</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Neto</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payroll.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 7 : 6} className="px-3 py-3 text-center text-gray-500 text-sm">
                                                No hay nóminas generadas
                                            </td>
                                        </tr>
                                    ) : (
                                        payroll.map((p) => {
                                            const user = users.find(u => u.employeeId === p.employeeId);
                                            return (
                                                <tr key={p.id}>
                                                    {isAdmin && (
                                                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                            {user ? user.name : p.employeeId}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                        {new Date(2000, parseInt(p.month) - 1).toLocaleString('es-ES', { month: 'short' })} {p.year}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                                                        ${p.baseSalary.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                        {p.overtimeHours.toFixed(1)}h
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-green-600">
                                                        +${p.overtimePay.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-red-600">
                                                        -${p.deductions.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-blue-600">
                                                        ${p.netSalary.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
