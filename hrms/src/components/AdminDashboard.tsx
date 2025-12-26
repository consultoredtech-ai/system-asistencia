'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MetricsDashboard from './MetricsDashboard';
import PayrollDashboard from './PayrollDashboard';

export default function AdminDashboard() {
    const [requests, setRequests] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Schedule State
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Documents State
    const [documents, setDocuments] = useState<any[]>([]);
    const [docFile, setDocFile] = useState({ name: '', link: '', type: 'Contract' });
    const [selectedDocEmployee, setSelectedDocEmployee] = useState<string>('');
    const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);

    // Accordion & Filter States
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(true);
    const [isRequestsOpen, setIsRequestsOpen] = useState(true);
    const [attendanceFilter, setAttendanceFilter] = useState('');
    const [requestsFilter, setRequestsFilter] = useState('');
    const [attendanceViewMode, setAttendanceViewMode] = useState<'recent' | 'monthly'>('recent');
    const [requestsViewMode, setRequestsViewMode] = useState<'recent' | 'monthly'>('recent');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            fetchSchedule(selectedEmployee);
        } else {
            setWeeklySchedule([]);
        }
    }, [selectedEmployee]);

    const formatTimeForInput = (time: string) => {
        if (!time) return '';
        const parts = time.split(':');
        if (parts.length >= 2) {
            const h = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            return `${h}:${m}`;
        }
        return time;
    };

    const fetchData = async () => {
        try {
            const [reqRes, attRes, usersRes, docsRes] = await Promise.all([
                fetch('/api/requests'),
                fetch('/api/attendance'),
                fetch('/api/users'),
                fetch('/api/documents')
            ]);

            const reqData = await reqRes.json();
            const attData = await attRes.json();
            const usersData = await usersRes.json();
            const docsData = await docsRes.json();

            setRequests(reqData.requests || []);
            setAttendance(attData.history || []);
            setUsers(usersData.users || []);
            setDocuments(docsData.documents || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedule = async (employeeId: string) => {
        const res = await fetch(`/api/schedules?employeeId=${employeeId}`);
        const data = await res.json();

        const mapped = days.map(day => {
            const existing = data.schedules?.find((s: any) => s[1] === day);
            return {
                day,
                s1Start: existing ? formatTimeForInput(existing[2]) : '',
                s1End: existing ? formatTimeForInput(existing[3]) : '',
                s2Start: existing ? formatTimeForInput(existing[4]) : '',
                s2End: existing ? formatTimeForInput(existing[5]) : ''
            };
        });
        setWeeklySchedule(mapped);
    };

    const handleStatusUpdate = async (requestId: string, status: string, employeeEmail: string) => {
        await fetch('/api/requests', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, status, employeeEmail }),
        });
        fetchData();
    };

    const handleScheduleChange = (index: number, field: string, value: string) => {
        const newSchedule = [...weeklySchedule];
        newSchedule[index][field] = value;
        setWeeklySchedule(newSchedule);
    };

    const saveSchedule = async () => {
        if (!selectedEmployee) return;
        await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: selectedEmployee, schedules: weeklySchedule }),
        });
        alert('Schedule saved!');
    };

    const calculateHours = (s1Start: string, s1End: string, s2Start: string, s2End: string) => {
        const getMinutes = (time: string) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        let total = 0;
        if (s1Start && s1End) total += Math.max(0, getMinutes(s1End) - getMinutes(s1Start));
        if (s2Start && s2End) total += Math.max(0, getMinutes(s2End) - getMinutes(s2Start));

        return (total / 60).toFixed(1);
    };

    const totalWeeklyHours = weeklySchedule.reduce((acc, day) => {
        return acc + parseFloat(calculateHours(day.s1Start, day.s1End, day.s2Start, day.s2End));
    }, 0);

    const handleSaveDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDocEmployee || !docFile.name || !docFile.link) return;

        await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeId: selectedDocEmployee,
                fileName: docFile.name,
                fileLink: docFile.link,
                type: docFile.type
            }),
        });

        setDocFile({ name: '', link: '', type: 'Contract' });
        fetchData();
        alert('Documento guardado');
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este documento?')) return;

        await fetch(`/api/documents/${id}`, { method: 'DELETE' });
        fetchData();
    };

    if (loading) return <div className="p-6 text-center">Cargando panel de administración...</div>;

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-600 text-sm font-medium">Solicitudes Pendientes</h3>
                    <p className="text-3xl font-bold text-gray-900">{requests.filter(r => r.status === 'Pending').length}</p>
                </div>
                <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                    <h3 className="text-gray-600 text-sm font-medium">Asistencia de Hoy</h3>
                    <p className="text-3xl font-bold text-gray-900">
                        {attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded shadow flex flex-col justify-center gap-3">
                    <button
                        onClick={() => router.push('/admin/users')}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2 font-semibold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Gestionar Usuarios
                    </button>
                    <button
                        onClick={() => router.push('/admin/attendance')}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-md flex items-center justify-center gap-2 font-semibold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Gestión de Asistencia
                    </button>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <MetricsDashboard />

            {/* Payroll Module */}
            <PayrollDashboard />

            {/* Attendance Table - Accordion */}
            <div className="bg-white rounded shadow">
                <button
                    onClick={() => setIsAttendanceOpen(!isAttendanceOpen)}
                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                    <h2 className="text-xl font-semibold text-gray-900">Asistencia de Empleados</h2>
                    <svg className={`w-6 h-6 transform transition-transform ${isAttendanceOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isAttendanceOpen && (
                    <div className="p-6 pt-0 border-t">
                        <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Empleado</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={attendanceFilter}
                                    onChange={(e) => setAttendanceFilter(e.target.value)}
                                >
                                    <option value="">Todos los empleados</option>
                                    {users.filter(u => u.role === 'Employee').map(u => (
                                        <option key={u.employeeId} value={u.employeeId}>{u.name} ({u.employeeId})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAttendanceViewMode('recent')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${attendanceViewMode === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Últimos 5
                                </button>
                                <button
                                    onClick={() => setAttendanceViewMode('monthly')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${attendanceViewMode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Detalle Mensual
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-96">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Empleado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attendance
                                        .filter(record => !attendanceFilter || record.employeeId === attendanceFilter)
                                        .slice(0, attendanceViewMode === 'recent' ? 5 : undefined)
                                        .map((record, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.employeeId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{record.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.checkIn}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.checkOut}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                                    <span className={parseInt(record.balance) > 0 ? 'text-green-600' : parseInt(record.balance) < 0 ? 'text-red-600' : 'text-gray-500'}>
                                                        {parseInt(record.balance) > 0 ? `+${record.balance}` : record.balance} min
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {record.status === 'Present' ? 'Presente' : record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {record.observation && (
                                                        <span className={
                                                            record.observation.includes('Atraso') || record.observation.includes('Falta') || record.observation.includes('Descuento') ? 'text-red-600' :
                                                                record.observation.includes('Extra') || record.observation.includes('favor') || record.observation.includes('Autorizado') ? 'text-green-600' :
                                                                    'text-gray-600'
                                                        }>
                                                            {record.observation}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Advanced Schedule Management */}
            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Gestión Avanzada de Horarios</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Seleccionar Empleado</label>
                    <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                        <option value="">-- Seleccionar --</option>
                        {users.filter(u => u.role === 'Employee').map(u => (
                            <option key={u.employeeId} value={u.employeeId}>{u.name} ({u.employeeId})</option>
                        ))}
                    </select>
                </div>

                {selectedEmployee && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Turno 1 Inicio</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Turno 1 Fin</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Turno 2 Inicio</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Turno 2 Fin</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Horas Diarias</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {weeklySchedule.map((day, idx) => (
                                    <tr key={day.day}>
                                        <td className="px-4 py-2 font-medium text-gray-900">{day.day}</td>
                                        <td className="px-4 py-2"><input type="time" className="border rounded p-1" value={day.s1Start} onChange={(e) => handleScheduleChange(idx, 's1Start', e.target.value)} /></td>
                                        <td className="px-4 py-2"><input type="time" className="border rounded p-1" value={day.s1End} onChange={(e) => handleScheduleChange(idx, 's1End', e.target.value)} /></td>
                                        <td className="px-4 py-2"><input type="time" className="border rounded p-1" value={day.s2Start} onChange={(e) => handleScheduleChange(idx, 's2Start', e.target.value)} /></td>
                                        <td className="px-4 py-2"><input type="time" className="border rounded p-1" value={day.s2End} onChange={(e) => handleScheduleChange(idx, 's2End', e.target.value)} /></td>
                                        <td className="px-4 py-2 font-bold text-gray-700">
                                            {calculateHours(day.s1Start, day.s1End, day.s2Start, day.s2End)} hrs
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50">
                                    <td colSpan={5} className="px-4 py-2 text-right font-bold text-gray-900">Total Semanal:</td>
                                    <td className="px-4 py-2 font-bold text-blue-600">{totalWeeklyHours.toFixed(1)} hrs</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="mt-4 text-right">
                            <button
                                onClick={saveSchedule}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md font-semibold"
                            >
                                Guardar Horario
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Leave Requests - Accordion */}
            <div className="bg-white rounded shadow">
                <button
                    onClick={() => setIsRequestsOpen(!isRequestsOpen)}
                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                    <h2 className="text-xl font-semibold text-gray-900">Gestión de Solicitudes de Permiso</h2>
                    <svg className={`w-6 h-6 transform transition-transform ${isRequestsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isRequestsOpen && (
                    <div className="p-6 pt-0 border-t">
                        <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Empleado</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={requestsFilter}
                                    onChange={(e) => setRequestsFilter(e.target.value)}
                                >
                                    <option value="">Todos los empleados</option>
                                    {users.filter(u => u.role === 'Employee').map(u => (
                                        <option key={u.employeeId} value={u.employeeId}>{u.name} ({u.employeeId})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setRequestsViewMode('recent')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${requestsViewMode === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Últimos 5
                                </button>
                                <button
                                    onClick={() => setRequestsViewMode('monthly')}
                                    className={`px-4 py-2 rounded text-sm font-medium ${requestsViewMode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Detalle Mensual
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Empleado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {requests
                                        .filter(req => !requestsFilter || req.employeeId === requestsFilter)
                                        .slice(0, requestsViewMode === 'recent' ? 5 : undefined)
                                        .map((req) => {
                                            const user = users.find(u => u.employeeId === req.employeeId);
                                            return (
                                                <tr key={req.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.employeeId}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                        {user ? user.name : 'Desconocido'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{req.type}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {req.startDate} {req.startTime ? `(${req.startTime} - ${req.endTime})` : `al ${req.endDate}`}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {req.status === 'Approved' ? 'Aprobado' : req.status === 'Rejected' ? 'Rechazado' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        {req.status === 'Pending' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleStatusUpdate(req.id, 'Approved', req.email)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Aprobar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(req.id, 'Rejected', req.email)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                >
                                                                    Rechazar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Management - Accordion */}
            <div className="bg-white rounded shadow">
                <button
                    onClick={() => setIsDocumentsOpen(!isDocumentsOpen)}
                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                    <h2 className="text-xl font-semibold text-gray-900">Gestión de Documentos</h2>
                    <svg className={`w-6 h-6 transform transition-transform ${isDocumentsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isDocumentsOpen && (
                    <div className="p-6 pt-0 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                            <div>
                                <h3 className="text-lg font-medium mb-4 text-gray-900">Subir Nuevo Documento</h3>
                                <form onSubmit={handleSaveDocument} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Empleado</label>
                                        <select
                                            className="mt-1 block w-full p-2 border rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            value={selectedDocEmployee}
                                            onChange={(e) => setSelectedDocEmployee(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {users.filter(u => u.role === 'Employee').map(u => (
                                                <option key={u.employeeId} value={u.employeeId}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nombre del Documento</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full p-2 border rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            value={docFile.name}
                                            onChange={(e) => setDocFile({ ...docFile, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                        <select
                                            className="mt-1 block w-full p-2 border rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            value={docFile.type}
                                            onChange={(e) => setDocFile({ ...docFile, type: e.target.value })}
                                        >
                                            <option value="Contract">Contrato</option>
                                            <option value="Annex">Anexo</option>
                                            <option value="Settlement">Liquidación</option>
                                            <option value="Pension">Previsión</option>
                                            <option value="Other">Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Enlace (URL)</label>
                                        <input
                                            type="url"
                                            className="mt-1 block w-full p-2 border rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            value={docFile.link}
                                            onChange={(e) => setDocFile({ ...docFile, link: e.target.value })}
                                            placeholder="https://drive.google.com/..."
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md w-full font-semibold"
                                    >
                                        Guardar Documento
                                    </button>
                                </form>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-4 text-gray-900">Documentos Existentes</h3>
                                <div className="overflow-y-auto max-h-80 border rounded border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {documents.map((doc) => {
                                                const user = users.find(u => u.employeeId === doc.employeeId);
                                                return (
                                                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                                                        <td className="px-4 py-2 text-sm text-gray-900">
                                                            {user ? user.name : doc.employeeId}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            <a href={doc.fileLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                                                {doc.fileName}
                                                            </a>
                                                            <span className="block text-xs text-gray-400">{doc.type} - {doc.uploadDate}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <button
                                                                onClick={() => handleDeleteDocument(doc.id)}
                                                                className="text-red-600 hover:text-red-900 font-medium"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
