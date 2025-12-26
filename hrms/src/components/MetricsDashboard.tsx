'use client';

import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function MetricsDashboard() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        attendance: true,
        requests: false,
        employees: false
    });

    useEffect(() => {
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/metrics');
            if (!res.ok) {
                throw new Error('Failed to fetch metrics');
            }
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setMetrics(data);
        } catch (err) {
            console.error('Error fetching metrics:', err);
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-600">Cargando métricas...</div>;
    }

    if (!metrics) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Dashboard de Métricas</h3>
                <p className="text-yellow-700">
                    No se pudieron cargar las métricas. Esto es normal si aún no tienes datos de asistencia o solicitudes.
                </p>
            </div>
        );
    }

    // Attendance Trend Chart Data
    const attendanceData = {
        labels: metrics.attendanceTrend.map((d: any) => d.month),
        datasets: [
            {
                label: 'Días Presente',
                data: metrics.attendanceTrend.map((d: any) => d.count),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.3,
            },
        ],
    };

    // Request Types Chart Data
    const requestTypesData = {
        labels: metrics.requestTypes.map((d: any) => d.type),
        datasets: [
            {
                label: 'Solicitudes',
                data: metrics.requestTypes.map((d: any) => d.count),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                ],
            },
        ],
    };

    // Overtime Stats Chart Data
    const overtimeData = {
        labels: metrics.overtimeStats.map((d: any) => d.employeeId),
        datasets: [
            {
                label: 'Días Trabajados',
                data: metrics.overtimeStats.map((d: any) => d.days),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
            },
        ],
    };

    return (
        <div className="space-y-6">
            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 uppercase font-bold">Total Empleados</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.summary?.totalEmployees || 0}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 uppercase font-bold">Presentes Hoy</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.summary?.presentToday || 0}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-600 uppercase font-bold">Solicitudes Pendientes</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.summary?.pendingRequests || 0}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600 uppercase font-bold">Total Solicitudes</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.summary?.totalRequests || 0}</p>
                </div>
            </div>

            {/* Attendance Trend Accordion */}
            <div className="bg-white rounded shadow overflow-hidden">
                <button
                    onClick={() => toggleSection('attendance')}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition border-b"
                >
                    <h3 className="text-lg font-semibold text-gray-900">Tendencia de Asistencia (Últimos 6 Meses)</h3>
                    <svg className={`w-5 h-5 transform transition-transform ${openSections.attendance ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {openSections.attendance && (
                    <div className="p-4 h-64">
                        <Line
                            data={attendanceData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'top' as const } },
                                scales: { y: { beginAtZero: true } }
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Types Accordion */}
                <div className="bg-white rounded shadow overflow-hidden">
                    <button
                        onClick={() => toggleSection('requests')}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition border-b"
                    >
                        <h3 className="text-lg font-semibold text-gray-900">Distribución de Solicitudes</h3>
                        <svg className={`w-5 h-5 transform transition-transform ${openSections.requests ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {openSections.requests && (
                        <div className="p-4 h-64">
                            <Pie
                                data={requestTypesData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'right' as const } }
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Top Employees Accordion */}
                <div className="bg-white rounded shadow overflow-hidden">
                    <button
                        onClick={() => toggleSection('employees')}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition border-b"
                    >
                        <h3 className="text-lg font-semibold text-gray-900">Top 5 Empleados (Días Trabajados)</h3>
                        <svg className={`w-5 h-5 transform transition-transform ${openSections.employees ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {openSections.employees && (
                        <div className="p-4 h-64">
                            <Bar
                                data={overtimeData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { y: { beginAtZero: true } }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
