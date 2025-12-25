import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, appendSheetData, getUsers } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    try {
        const payrollData = await getSheetData('Payroll!A2:J');

        let filtered = payrollData.map(row => ({
            id: row[0],
            employeeId: row[1],
            month: row[2],
            year: row[3],
            baseSalary: parseFloat(row[4]) || 0,
            overtimeHours: parseFloat(row[5]) || 0,
            overtimePay: parseFloat(row[6]) || 0,
            deductions: parseFloat(row[7]) || 0,
            netSalary: parseFloat(row[8]) || 0,
            status: row[9]
        }));

        // Filter by role
        if (user.role === 'Employee') {
            filtered = filtered.filter(p => p.employeeId === user.id);
        }

        // Filter by month/year if provided
        if (month && year) {
            filtered = filtered.filter(p => p.month === month && p.year === year);
        }

        return NextResponse.json({ payroll: filtered });
    } catch (error) {
        console.error('Error fetching payroll:', error);
        return NextResponse.json({ payroll: [] });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employeeId, month, year } = await req.json();

    try {
        // Get user data
        const users = await getUsers();
        const user = users.find(u => u.EmployeeID === employeeId);

        if (!user) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const baseSalary = parseFloat(user.Salary || '0') || 0;

        // Calculate overtime hours from attendance
        const attendance = await getSheetData('Attendance!A2:E');
        const monthAttendance = attendance.filter(row => {
            const date = new Date(row[1]);
            return row[0] === employeeId &&
                date.getMonth() + 1 === parseInt(month) &&
                date.getFullYear() === parseInt(year);
        });

        // Mock overtime calculation (you can enhance this)
        const overtimeHours = monthAttendance.length * 0.5; // Example: 0.5 hrs overtime per day
        const hourlyRate = baseSalary / 160; // Assuming 160 hours/month
        const overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x for overtime

        // Mock deductions (10% taxes + 5% insurance)
        const deductions = baseSalary * 0.15;

        const netSalary = baseSalary + overtimePay - deductions;

        // Save to Payroll sheet
        const payrollId = `p${Date.now()}`;
        await appendSheetData('Payroll!A2:J', [
            payrollId,
            employeeId,
            month,
            year,
            baseSalary.toString(),
            overtimeHours.toFixed(2),
            overtimePay.toFixed(2),
            deductions.toFixed(2),
            netSalary.toFixed(2),
            'Generated'
        ]);

        return NextResponse.json({
            success: true,
            payroll: {
                id: payrollId,
                employeeId,
                month,
                year,
                baseSalary,
                overtimeHours,
                overtimePay,
                deductions,
                netSalary
            }
        });
    } catch (error) {
        console.error('Error generating payroll:', error);
        return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
    }
}
