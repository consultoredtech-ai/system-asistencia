'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AttendanceRecord {
    employeeId: string;
    name: string;
    date: string;
    checkIn: string;
    checkOut: string;
    status: string;
    observation: string;
    balance: string;
}

interface User {
    employeeId: string;
    name: string;
}

export default function AdminAttendancePage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        employeeId: 'all',
        startDate: '',
        endDate: ''
    });
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [newObservation, setNewObservation] = useState('');
    const [newBalance, setNewBalance] = useState('0');

    const router = useRouter();

    const observationOptions = [
        "Descuento",
        "Atraso recuperado",
        "Atraso sin recuperar",
        "Autorizado por jefatura",
        "Feriado (Trabajado)",
        "Tiempo a favor",
        "Falta cumplir horario"
    ];

    useEffect(() => {
        fetchUsers();
        fetchAttendance();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await fetch(`/api/attendance?${query}`);
            const data = await res.json();
            setAttendance(data.history || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateObservation = async () => {
        if (!editingRecord) return;

        try {
            const res = await fetch('/api/attendance', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: editingRecord.employeeId,
                    date: editingRecord.date,
                    observation: newObservation,
                    balance: newBalance
                })
            });

            if (res.ok) {
                setEditingRecord(null);
                fetchAttendance();
                alert('Registro actualizado correctamente');
            } else {
                alert('Error al actualizar');
            }
        } catch (error) {
            console.error('Error updating record:', error);
        }
    };

    const formatBalance = (minutes: string | number) => {
        const mins = parseInt(String(minutes)) || 0;
        if (mins === 0) return '0 min';

        const absMins = Math.abs(mins);
        const h = Math.floor(absMins / 60);
        const m = absMins % 60;

        const sign = mins > 0 ? '+' : '-';
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m} min`;
        return `${sign}${timeStr}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestión de Asistencia</h1>
                        <p className="text-gray-600">Revisa y ajusta los registros de asistencia de los empleados.</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm"
                    >
                        Volver al Panel
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                            <select
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters.employeeId}
                                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                            >
                                <option value="all">Todos los empleados</option>
                                {users.map(u => (
                                    <option key={u.employeeId} value={u.employeeId}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                            <input
                                type="date"
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={fetchAttendance}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md font-semibold"
                        >
                            Filtrar
                        </button>
                    </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Cargando registros...</td>
                                    </tr>
                                ) : attendance.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No se encontraron registros.</td>
                                    </tr>
                                ) : (
                                    attendance.map((record, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{record.name}</div>
                                                <div className="text-xs text-gray-500">ID: {record.employeeId}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.checkIn || '--:--'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.checkOut || '--:--'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${parseInt(record.balance) > 0 ? 'text-green-600' : parseInt(record.balance) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {formatBalance(record.balance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {record.status === 'Present' ? 'Presente' : record.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className={record.observation?.includes('Atraso') || record.observation?.includes('Descuento') ? 'text-red-600 font-medium' : ''}>
                                                    {record.observation || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => {
                                                        setEditingRecord(record);
                                                        setNewObservation(record.observation || '');
                                                        setNewBalance(record.balance || '0');
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Observation Modal */}
            {editingRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Ajustar Registro</h2>
                            <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Empleado: <span className="font-semibold text-gray-900">{editingRecord.name}</span></p>
                                <p className="text-sm text-gray-500">Fecha: <span className="font-semibold text-gray-900">{editingRecord.date}</span></p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Balance de Tiempo (minutos)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newBalance}
                                        onChange={(e) => setNewBalance(e.target.value)}
                                        placeholder="Minutos (+ favor, - debe)"
                                    />
                                    <span className={`text-sm font-bold whitespace-nowrap ${parseInt(newBalance) > 0 ? 'text-green-600' : parseInt(newBalance) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                        {formatBalance(newBalance)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Usa valores positivos para tiempo a favor y negativos para tiempo adeudado.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Observación</label>
                                <div className="space-y-2">
                                    {observationOptions.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setNewObservation(opt)}
                                            className={`w-full text-left px-4 py-2 rounded-lg border transition ${newObservation === opt
                                                ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                    <div className="pt-2">
                                        <label className="block text-xs text-gray-500 mb-1">U otra observación personalizada:</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newObservation}
                                            onChange={(e) => setNewObservation(e.target.value)}
                                            placeholder="Escribe aquí..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setEditingRecord(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateObservation}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md font-semibold"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
