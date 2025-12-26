import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        // Fetch attendance and requests data
        const attendance = await getSheetData('Attendance!A2:E');
        const requests = await getSheetData('Requests!A2:I');

        // 1. Attendance trend (last 6 months)
        const attendanceTrend = calculateAttendanceTrend(attendance);

        // 2. Request types distribution
        const requestTypes = calculateRequestTypes(requests);

        // 3. Top employees by overtime (mock data for now)
        const overtimeStats = calculateOvertimeStats(attendance);

        // 4. Summary data
        const totalEmployees = (await getSheetData('Users!A2:A')).length;
        const totalRequests = requests.length;
        const pendingRequests = requests.filter(r => r[6] === 'Pending').length;

        const today = new Date().toISOString().split('T')[0];
        const presentToday = attendance.filter(row => row[1] === today && row[4] === 'Present').length;

        return NextResponse.json({
            attendanceTrend,
            requestTypes,
            overtimeStats,
            summary: {
                totalEmployees,
                totalRequests,
                pendingRequests,
                presentToday
            }
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}

function calculateAttendanceTrend(attendance: any[]) {
    const last6Months = getLast6Months();
    const trend = last6Months.map(month => {
        const count = attendance.filter(row => {
            const date = new Date(row[1]); // Date column
            return date.getMonth() === month.monthIndex &&
                date.getFullYear() === month.year &&
                row[4] === 'Present'; // Status column
        }).length;
        return { month: month.label, count };
    });
    return trend;
}

function calculateRequestTypes(requests: any[]) {
    const types: Record<string, number> = {};
    requests.forEach(row => {
        const type = row[2]; // Type column
        types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => ({ type, count }));
}

function calculateOvertimeStats(attendance: any[]) {
    // Group by employee and count "Present" days
    const employeeStats: Record<string, number> = {};
    attendance.forEach(row => {
        const employeeId = row[0];
        if (row[4] === 'Present') {
            employeeStats[employeeId] = (employeeStats[employeeId] || 0) + 1;
        }
    });

    // Convert to array and sort
    const sorted = Object.entries(employeeStats)
        .map(([employeeId, days]) => ({ employeeId, days }))
        .sort((a, b) => b.days - a.days)
        .slice(0, 5); // Top 5

    return sorted;
}

function getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            monthIndex: date.getMonth(),
            year: date.getFullYear(),
            label: date.toLocaleString('es-ES', { month: 'short', year: 'numeric' })
        });
    }
    return months;
}
