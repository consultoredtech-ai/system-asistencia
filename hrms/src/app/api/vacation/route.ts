import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, getUsers } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;

    // Get user data
    const users = await getUsers();
    const user = users.find(u => u.EmployeeID === userId);

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse vacation data from Users sheet (columns G and H)
    // Temporarily using default values until columns are added
    const totalDays = 15; // Will be column G
    const usedDays = 0; // Will be column H

    // Get pending vacation requests
    const requests = await getSheetData('Requests!A2:I');
    const userRequests = requests.filter(row =>
        row[1] === userId &&
        row[2] === 'Vacation' &&
        row[6] === 'Pending'
    );

    // Calculate pending days
    let pendingDays = 0;
    for (const req of userRequests) {
        const start = new Date(req[3]);
        const end = new Date(req[4]);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        pendingDays += days;
    }

    const availableDays = totalDays - usedDays - pendingDays;

    return NextResponse.json({
        total: totalDays,
        used: usedDays,
        pending: pendingDays,
        available: availableDays
    });
}
