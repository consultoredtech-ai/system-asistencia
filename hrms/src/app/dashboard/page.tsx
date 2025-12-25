'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import NotificationBadge from '@/components/NotificationBadge';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') return <p className="p-8">Loading...</p>;

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">HRMS Dashboard</h1>
                <div className="flex items-center gap-4">
                    <NotificationBadge />
                    <span>Welcome, {session.user?.name} ({session.user?.role})</span>
                    <button
                        onClick={() => router.push('/api/auth/signout')}
                        className="text-red-500 hover:underline"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>
            <main className="p-8">
                {(session.user as any).role === 'Admin' ? (
                    <AdminDashboard />
                ) : (
                    <EmployeeDashboard />
                )}
            </main>
        </div>
    );
}
