'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { validateDateRange, validateTimeRange, calculateDaysBetween } from '@/lib/validation';

export default function EmployeeDashboard() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [requests, setRequests] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [vacation, setVacation] = useState({ total: 15, used: 0, pending: 0, available: 15 });
    const [durationType, setDurationType] = useState<'Full Day' | 'Hourly'>('Full Day');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

    useEffect(() => {
        fetchRequests();
        fetchVacation();
        fetchAttendanceHistory();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/requests');
            const data = await res.json();
            setRequests(data.requests || []);

            const docRes = await fetch('/api/documents');
            const docData = await docRes.json();
            setDocuments(docData.documents || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
        }
    };

    const fetchAttendanceHistory = async () => {
        try {
            const res = await fetch('/api/attendance');
            const data = await res.json();
            // Filter for last 7 days
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const filtered = (data.history || []).filter((h: any) => new Date(h.date) >= lastWeek);
            setAttendanceHistory(filtered);
        } catch (err) {
            console.error('Error fetching attendance history:', err);
        }
    };

    const fetchVacation = async () => {
        try {
            const res = await fetch('/api/vacation');
            if (!res.ok) {
                console.error('Failed to fetch vacation data');
                return;
            }
            const data = await res.json();
            setVacation(data);
        } catch (err) {
            console.error('Error fetching vacation data:', err);
        }
    };

    const handleAttendance = async (action: 'check-in' | 'check-out') => {
        setLoading(true);
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            setMessage(data.message || data.error);
            if (res.ok) fetchAttendanceHistory();
        } catch (err) {
            setMessage('Error submitting attendance');
        }
        setLoading(false);
    };

    const generatePDF = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/report-data');
            const data = await res.json();

            if (data.error) {
                setMessage(data.error);
                return;
            }

            const doc = new jsPDF();

            // Title
            doc.setFontSize(20);
            doc.text('Reporte Mensual del Empleado', 14, 22);

            // Profile Info
            doc.setFontSize(12);
            doc.text(`Nombre: ${data.user.name}`, 14, 40);
            doc.text(`Correo: ${data.user.email}`, 14, 48);
            doc.text(`ID Empleado: ${data.user.employeeId}`, 14, 56);
            doc.text(`Salario Mensual: ${data.user.salary}`, 14, 64);

            // Stats
            doc.text(`Días Presente: ${data.stats.totalPresent}`, 14, 80);
            doc.text(`Llegadas Tarde: ${data.stats.lateArrivals}`, 14, 88);
            doc.text(`Días de Vacaciones: ${data.stats.approvedVacationDays}`, 14, 96);

            // Attendance Table
            doc.text('Historial de Asistencia', 14, 110);
            autoTable(doc, {
                startY: 115,
                head: [['Fecha', 'Entrada', 'Salida', 'Estado']],
                body: data.attendanceHistory.map((row: any) => [
                    row.date, row.checkIn, row.checkOut, row.status === 'Present' ? 'Presente' : row.status
                ]),
            });

            // Requests Table
            const finalY = (doc as any).lastAutoTable.finalY || 150;
            doc.text('Solicitudes de Permiso', 14, finalY + 10);
            autoTable(doc, {
                startY: finalY + 15,
                head: [['Tipo', 'Fecha Inicio', 'Fecha Fin', 'Estado']],
                body: data.requests.map((row: any) => [
                    row.type, row.startDate, row.endDate, row.status
                ]),
            });

            doc.save('monthly-report.pdf');
            setMessage('Report downloaded successfully');
        } catch (err) {
            setMessage('Error generating PDF');
            console.error(err);
        }
        setLoading(false);
    };

    const validateForm = (formData: FormData): boolean => {
        const errors: Record<string, string> = {};
        const data: any = Object.fromEntries(formData);

        if (durationType === 'Full Day') {
            const validation = validateDateRange(data.startDate, data.endDate);
            if (!validation.valid) {
                errors.dateRange = validation.error!;
            }

            // Check vacation balance for vacation requests
            if (data.type === 'Vacation') {
                const days = calculateDaysBetween(data.startDate, data.endDate);
                if (days > vacation.available) {
                    errors.vacation = `Solo tienes ${vacation.available} días disponibles`;
                }
            }
        } else {
            const validation = validateTimeRange(data.startTime, data.endTime);
            if (!validation.valid) {
                errors.timeRange = validation.error!;
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    return (
        <div className="space-y-8">
            {message && (
                <div className="bg-blue-100 p-4 rounded text-blue-800">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Attendance Card */}
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Asistencia</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleAttendance('check-in')}
                            disabled={loading}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                        >
                            Marcar Entrada
                        </button>
                        <button
                            onClick={() => handleAttendance('check-out')}
                            disabled={loading}
                            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                        >
                            Marcar Salida
                        </button>
                    </div>
                </div>

                {/* Vacation Balance Card */}
                <div className="bg-white p-6 rounded shadow border-t-4 border-green-500">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Vacaciones
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">Total:</span>
                            <span className="font-bold bg-gray-100 px-2 py-1 rounded text-gray-900">{vacation.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">Usados:</span>
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">{vacation.used}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">Pendientes:</span>
                            <span className="text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded">{vacation.pending}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-3">
                            <span className="text-gray-900 font-medium">Disponibles:</span>
                            <span className="text-green-600 font-bold text-xl">{vacation.available}</span>
                        </div>
                    </div>
                </div>

                {/* Report Card */}
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Reportes</h2>
                    <button
                        onClick={generatePDF}
                        disabled={loading}
                        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 w-full"
                    >
                        Descargar Reporte Mensual (PDF)
                    </button>
                </div>
            </div>

            {/* My Attendance - Accordion */}
            <div className="bg-white rounded shadow">
                <button
                    onClick={() => setIsAttendanceOpen(!isAttendanceOpen)}
                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                    <h2 className="text-xl font-semibold text-gray-900">Mi Asistencia (Última Semana)</h2>
                    <svg
                        className={`w-6 h-6 transform transition-transform ${isAttendanceOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isAttendanceOpen && (
                    <div className="p-6 pt-0 border-t">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observación</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attendanceHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay registros esta semana</td>
                                        </tr>
                                    ) : (
                                        attendanceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((row: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.checkIn || '--:--'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.checkOut || '--:--'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {row.status === 'Present' ? 'Presente' : row.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                                    {row.observation}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* My Documents - Accordion */}
            <div className="bg-white rounded shadow">
                <button
                    onClick={() => setIsDocumentsOpen(!isDocumentsOpen)}
                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                    <h2 className="text-xl font-semibold text-gray-900">Mis Documentos</h2>
                    <svg
                        className={`w-6 h-6 transform transition-transform ${isDocumentsOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isDocumentsOpen && (
                    <div className="p-6 pt-0 border-t">
                        {documents.length === 0 ? (
                            <p className="text-gray-500">No tienes documentos disponibles.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {documents.map((doc) => (
                                    <div key={doc.id} className="border p-4 rounded hover:shadow-md transition">
                                        <h3 className="font-medium text-gray-900 truncate" title={doc.fileName}>{doc.fileName}</h3>
                                        <p className="text-sm text-gray-500 mb-2">{doc.type} • {doc.uploadDate}</p>
                                        <a
                                            href={doc.fileLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                        >
                                            <span>Abrir Documento</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Request Form */}
            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Solicitar Permiso</h2>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const formData = new FormData(form);

                    if (!validateForm(formData)) {
                        return;
                    }

                    setLoading(true);

                    const data: any = Object.fromEntries(formData);
                    // If full day, clear time fields just in case
                    if (durationType === 'Full Day') {
                        delete data.startTime;
                        delete data.endTime;
                    }

                    await fetch('/api/requests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    setMessage('Solicitud enviada');
                    setLoading(false);
                    form.reset();
                    setFormErrors({});
                    fetchRequests();
                    fetchVacation();
                }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Tipo</label>
                            <select name="type" className="w-full p-2 border rounded">
                                <option value="Vacation">Vacaciones</option>
                                <option value="Sick Leave">Licencia Médica</option>
                                <option value="Personal">Personal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Motivo</label>
                            <input name="reason" type="text" className="w-full p-2 border rounded" required />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1 text-gray-700">Duración</label>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        className="form-radio"
                                        name="durationType"
                                        value="Full Day"
                                        checked={durationType === 'Full Day'}
                                        onChange={() => setDurationType('Full Day')}
                                    />
                                    <span className="ml-2">Día Completo</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        className="form-radio"
                                        name="durationType"
                                        value="Hourly"
                                        checked={durationType === 'Hourly'}
                                        onChange={() => setDurationType('Hourly')}
                                    />
                                    <span className="ml-2">Por Horas</span>
                                </label>
                            </div>
                        </div>

                        {durationType === 'Full Day' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Fecha Inicio</label>
                                    <input name="startDate" type="date" className="w-full p-2 border rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Fecha Fin</label>
                                    <input name="endDate" type="date" className="w-full p-2 border rounded" required />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Fecha</label>
                                    <input name="startDate" type="date" className="w-full p-2 border rounded" required />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Hora Inicio</label>
                                        <input name="startTime" type="time" className="w-full p-2 border rounded" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Hora Fin</label>
                                        <input name="endTime" type="time" className="w-full p-2 border rounded" required />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Error Messages */}
                    {Object.keys(formErrors).length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                            {Object.values(formErrors).map((error, idx) => (
                                <p key={idx} className="text-red-600 text-sm">{error}</p>
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        Enviar Solicitud
                    </button>
                </form>
            </div>

            {/* Request History - Accordion */}
            <div className="bg-white rounded shadow">
                <button
                    onClick={() => setIsRequestsOpen(!isRequestsOpen)}
                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                    <h2 className="text-xl font-semibold text-gray-900">Historial de Solicitudes</h2>
                    <svg
                        className={`w-6 h-6 transform transition-transform ${isRequestsOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isRequestsOpen && (
                    <div className="p-6 pt-0 border-t">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {requests.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay solicitudes</td>
                                        </tr>
                                    ) : (
                                        requests.map((req: any) => (
                                            <tr key={req.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{req.type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {req.startDate} {req.startTime ? `(${req.startTime} - ${req.endTime})` : `al ${req.endDate}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">{req.reason}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                        req.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {req.status === 'Approved' ? 'Aprobado' : req.status === 'Rejected' ? 'Rechazado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
