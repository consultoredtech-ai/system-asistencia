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
    const [viewSlip, setViewSlip] = useState<any | null>(null);
    const [settings, setSettings] = useState<any>({});

    const isAdmin = (session?.user as any)?.role === 'Admin';

    useEffect(() => {
        fetchPayroll();
        if (isAdmin) {
            fetchUsers();
        }
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSettings(data.settings || {});
    };

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
            alert('Error al generar nómina.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        if (!confirm(`¿Estás seguro de cambiar el estado a ${status}?`)) return;
        try {
            const res = await fetch('/api/payroll', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            });
            if (res.ok) {
                alert('Estado actualizado');
                fetchPayroll();
                setViewSlip(null);
            } else {
                const data = await res.json();
                alert(`Error al actualizar estado: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta nómina?')) return;
        try {
            const res = await fetch('/api/payroll', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                alert('Nómina eliminada');
                fetchPayroll();
            } else {
                const data = await res.json();
                alert(`Error al eliminar nómina: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-slip');
        if (!printContent) return;

        const originalContents = document.body.innerHTML;
        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // Reload to restore state/events
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
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Líquido</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payroll.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 6 : 5} className="px-3 py-3 text-center text-gray-500 text-sm">
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
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                        ${p.baseSalary.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-blue-600">
                                                        ${p.netSalary.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            p.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {p.status === 'Approved' ? 'Aprobado' :
                                                                p.status === 'Rejected' ? 'Rechazado' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs flex gap-2">
                                                        <button
                                                            onClick={() => setViewSlip(p)}
                                                            className="text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            Ver Liquidación
                                                        </button>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                className="text-red-600 hover:text-red-800 underline ml-2"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        )}
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

            {/* Modal Liquidación */}
            {viewSlip && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex justify-between items-center no-print">
                            <h3 className="text-lg font-bold">Vista Previa</h3>
                            <div className="flex gap-2">
                                {isAdmin && (viewSlip.status === 'Pending' || viewSlip.status === 'Generated') && (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate(viewSlip.id, 'Approved')}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                        >
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(viewSlip.id, 'Rejected')}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                        >
                                            Rechazar
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handlePrint}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                >
                                    Imprimir
                                </button>
                                <button onClick={() => setViewSlip(null)} className="text-gray-500 hover:text-gray-700">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="printable-slip" className="p-8 bg-white text-sm font-sans">
                            <div className="text-center mb-4 underline font-bold text-lg">
                                LIQUIDACION DE REMUNERACIONES
                            </div>

                            {/* Header Company Info */}
                            <div className="mb-6 text-xs">
                                <p className="font-bold">{settings.CompanyName || 'NOMBRE EMPRESA'}</p>
                                <p>RUT: {settings.CompanyRUT || 'XX.XXX.XXX-X'}</p>
                                <p>{settings.CompanyAddress || 'Dirección Empresa'}</p>
                            </div>

                            {/* Employee Info Box */}
                            <div className="border border-black mb-4">
                                <div className="border-b border-black p-1 bg-gray-100 font-bold text-xs">
                                    DATOS DEL TRABAJADOR
                                </div>
                                <div className="p-2 grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p><strong>NOMBRE:</strong> {users.find(u => u.employeeId === viewSlip.employeeId)?.name || viewSlip.employeeId}</p>
                                        <p><strong>RUT:</strong> {viewSlip.employeeId}</p>
                                    </div>
                                    <div>
                                        <p><strong>Fecha ingreso:</strong> {users.find(u => u.employeeId === viewSlip.employeeId)?.joinDate || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Period Info Box */}
                            <div className="border border-black mb-4 text-xs">
                                <div className="grid grid-cols-2 divide-x divide-black">
                                    <div className="p-1">
                                        <strong>Período de Remuneración:</strong> {new Date(2000, parseInt(viewSlip.month) - 1).toLocaleString('es-ES', { month: 'long' }).toUpperCase()} {viewSlip.year}
                                    </div>
                                    <div className="p-1">
                                        <strong>Días trabajados:</strong> 30 días
                                    </div>
                                </div>
                            </div>

                            <div className="mb-1 font-bold text-xs underline">DETALLE DE REMUNERACIÓN</div>

                            {/* Detail Table */}
                            <div className="border border-black text-xs">
                                {/* Header */}
                                <div className="grid grid-cols-[1fr_100px_100px] bg-cyan-500 text-white font-bold border-b border-black text-center">
                                    <div className="p-1 text-left pl-2">Haberes del Trabajador</div>
                                    <div className="p-1"></div>
                                    <div className="p-1">Valor</div>
                                </div>

                                {/* Body */}
                                <div className="divide-y divide-transparent">
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1">
                                        <div>Sueldo Base</div>
                                        <div className="text-right">{viewSlip.baseSalary.toLocaleString()} $</div>
                                        <div className="text-right">{viewSlip.baseSalary.toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1">
                                        <div>Gratificacion con tope</div>
                                        <div className="text-right">25% $</div>
                                        <div className="text-right">{viewSlip.gratification.toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1 font-bold">
                                        <div>Total Remuneración Imponible</div>
                                        <div></div>
                                        <div className="text-right">{viewSlip.taxableIncome.toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1 mt-2">
                                        <div>Colacion</div>
                                        <div className="text-right">$</div>
                                        <div className="text-right">{(viewSlip.nonTaxableIncome / 2).toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1">
                                        <div>Movilizacion</div>
                                        <div className="text-right">$</div>
                                        <div className="text-right">{(viewSlip.nonTaxableIncome / 2).toLocaleString()}</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1 font-bold">
                                        <div>Total Remuneración no Imponible</div>
                                        <div></div>
                                        <div className="text-right">{viewSlip.nonTaxableIncome.toLocaleString()}</div>
                                    </div>

                                    <div className="grid grid-cols-[1fr_100px_100px] bg-blue-200 border-y border-black font-bold p-1">
                                        <div className="text-right pr-4">Total de Haberes</div>
                                        <div className="text-right">$</div>
                                        <div className="text-right">{(viewSlip.taxableIncome + viewSlip.nonTaxableIncome).toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Discounts Header */}
                                <div className="grid grid-cols-[1fr_100px_100px] bg-cyan-500 text-white font-bold border-b border-black text-center mt-0">
                                    <div className="p-1 text-left pl-2">Descuentos</div>
                                    <div className="p-1"></div>
                                    <div className="p-1">Valor</div>
                                </div>

                                {/* Discounts Body */}
                                <div className="divide-y divide-transparent">
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1">
                                        <div className="flex justify-between pr-4"><span>Cotización Previsional</span> <span>{users.find(u => u.employeeId === viewSlip.employeeId)?.AFP || 'AFP'}</span></div>
                                        <div className="text-right">11,16% $ (</div>
                                        <div className="text-right">{viewSlip.afpAmount.toLocaleString()} )</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1">
                                        <div className="flex justify-between pr-4"><span>Cotización Salud</span> <span>{users.find(u => u.employeeId === viewSlip.employeeId)?.HealthSystem || 'FONASA'}</span></div>
                                        <div className="text-right">7% $ (</div>
                                        <div className="text-right">{viewSlip.healthAmount.toLocaleString()} )</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] p-1">
                                        <div>Seguro cesantia</div>
                                        <div className="text-right">0,6% $ (</div>
                                        <div className="text-right">{viewSlip.uiAmount.toLocaleString()} )</div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_100px_100px] bg-blue-200 border-t border-black font-bold p-1">
                                        <div className="text-right pr-4">Total Descuentos</div>
                                        <div className="text-right">$ (</div>
                                        <div className="text-right">{viewSlip.deductions.toLocaleString()} )</div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Pay */}
                            <div className="mt-4 flex flex-col items-end">
                                <div className="w-1/2">
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <span>ALCANCE LIQUIDO $</span>
                                        <span>{viewSlip.netSalary.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <span>Anticipos o Préstamos $ (</span>
                                        <span> )</span>
                                    </div>
                                    <div className="border-2 border-black p-1 flex justify-between font-bold bg-blue-200">
                                        <span>SALDO LIQUIDO A PAGAR</span>
                                        <span>$ {viewSlip.netSalary.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Text */}
                            <div className="mt-8 text-xs text-justify">
                                Certifico que he recibido de mi Empleador <strong>{settings.CompanyName || 'ASESORIAS Y CAPACITACIONES KTALAN SPA'}</strong>, pago a mi total y entera satisfacción el saldo líquido indicado en la presente liquidación, sin tener cargo ni cobro posterior alguno que hacer, por los conceptos de esta liquidación.
                            </div>

                            <div className="mt-4 text-xs font-bold">
                                Fecha: 30/{viewSlip.month}/{viewSlip.year}
                            </div>

                            {/* Signatures */}
                            <div className="mt-16 flex justify-between text-center text-xs font-bold">
                                <div className="w-1/3 border-t-2 border-black pt-2">Firma empleador</div>
                                <div className="w-1/3 border-t-2 border-black pt-2">Firma del Trabajador</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
