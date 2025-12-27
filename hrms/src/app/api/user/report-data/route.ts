import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getSheetData, getUserByEmail } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user?.email;
    if (!email) return NextResponse.json({ error: 'User email not found' }, { status: 400 });

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const employeeId = user.EmployeeID;

    // Fetch Attendance
    const attendanceRows = await getSheetData('Attendance!A2:E');
    const userAttendance = attendanceRows.filter(row => row[0] === employeeId);

    // Calculate stats
    const totalPresent = userAttendance.length;
    // Simple logic for late: if checkIn > 9:00 AM (mock logic)
    const lateArrivals = userAttendance.filter(row => {
        const time = row[2]; // CheckIn time
        // Assuming format HH:MM:SS AM/PM or 24h. 
        // For simplicity, let's just count rows where status is 'Late' if we had that logic in check-in
        // Or parse time. Let's assume 'Present' is default.
        return false;
    }).length;

    // Fetch Requests
    const requestRows = await getSheetData('Requests!A2:G');
    const userRequests = requestRows.filter(row => row[1] === employeeId);

    const approvedVacationDays = userRequests
        .filter(r => r[2] === 'Vacation' && r[6] === 'Approved')
        .reduce((acc, r) => {
            const start = new Date(r[3]);
            const end = new Date(r[4]);
            const diff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24) + 1;
            return acc + diff;
        }, 0);

    return NextResponse.json({
        user: {
            name: user.Name,
            email: user.Email,
            role: user.Role,
            salary: user.Salary,
            employeeId: user.EmployeeID,
            afp: user.AFP,
            healthSystem: user.HealthSystem,
            joinDate: user.JoinDate,
            address: user.Address,
        },
        stats: {
            totalPresent,
            lateArrivals,
            approvedVacationDays,
        },
        attendanceHistory: userAttendance.map(row => ({
            date: row[1],
            checkIn: row[2],
            checkOut: row[3],
            status: row[4]
        })),
        requests: userRequests.map(row => ({
            type: row[2],
            startDate: row[3],
            endDate: row[4],
            status: row[6]
        }))
    });
}
