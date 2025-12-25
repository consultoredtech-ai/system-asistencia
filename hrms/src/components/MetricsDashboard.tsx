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
    const [isOpen, setIsOpen] = useState(false);

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

    if (loading) {
        return <div className="p-6 text-center">Cargando métricas...</div>;
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
        <div className="bg-white rounded shadow">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition"
            >
                <h2 className="text-xl font-semibold">Dashboard de Métricas</h2>
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
                <div className="p-6 pt-0 border-t">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Attendance Trend */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-sm font-semibold mb-3">Tendencia de Asistencia (Últimos 6 Meses)</h3>
                            <div className="h-48">
                                <Line
                                    data={attendanceData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'top' as const,
                                                labels: {
                                                    font: { size: 10 }
                                                }
                                            },
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: { font: { size: 10 } }
                                            },
                                            x: {
                                                ticks: { font: { size: 10 } }
                                            }
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {/* Request Types */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-sm font-semibold mb-3">Distribución de Tipos de Solicitudes</h3>
                            <div className="h-48">
                                <Pie
                                    data={requestTypesData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'right' as const,
                                                labels: {
                                                    font: { size: 10 }
                                                }
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {/* Top Employees */}
                        <div className="bg-gray-50 p-4 rounded-lg border lg:col-span-2">
                            <h3 className="text-sm font-semibold mb-3">Top 5 Empleados por Días Trabajados</h3>
                            <div className="h-48">
                                <Bar
                                    data={overtimeData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                display: false,
                                            },
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: { font: { size: 10 } }
                                            },
                                            x: {
                                                ticks: { font: { size: 10 } }
                                            }
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
