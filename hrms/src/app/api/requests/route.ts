import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { appendSheetData, getSheetData, updateSheetData, getUsers } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createNotification } from '../notifications/route';

// Mock email sender or real one if env vars present
async function sendEmail(to: string, subject: string, text: string) {
    // In a real app, configure transporter with env vars
    console.log(`Sending email to ${to}: ${subject} - ${text}`);
    // const transporter = ...
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, startDate, endDate, reason, startTime, endTime } = await req.json();
    const employeeId = (session.user as any).id;
    const requestId = Math.random().toString(36).substring(7);

    // Columns: ID, EmployeeID, Type, StartDate, EndDate, Reason, Status, StartTime, EndTime
    await appendSheetData('Requests!A2:I', [requestId, employeeId, type, startDate, endDate, reason, 'Pending', startTime || '', endTime || '']);

    // Create notification for all admins
    const users = await getUsers();
    const admins = users.filter(u => u.Role === 'Admin');
    const employeeName = session.user?.name || 'Un empleado';

    for (const admin of admins) {
        await createNotification(
            admin.EmployeeID,
            'request_created',
            `Nueva solicitud de ${employeeName}: ${type}`,
            '/dashboard'
        );
    }

    return NextResponse.json({ success: true, message: 'Request submitted' });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { requestId, status, employeeEmail } = await req.json(); // status: 'Approved' | 'Rejected'

    const rows = await getSheetData('Requests!A2:I');
    const rowIndex = rows.findIndex(row => row[0] === requestId);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const sheetRow = rowIndex + 2;
    await updateSheetData(`Requests!G${sheetRow}`, [status]);

    // Send notification
    if (employeeEmail) {
        await sendEmail(employeeEmail, `Leave Request ${status}`, `Your leave request has been ${status}.`);
    }

    // Create in-app notification for employee
    const request = rows[rowIndex];
    const employeeId = request[1];
    const statusSpanish = status === 'Approved' ? 'aprobada' : 'rechazada';

    await createNotification(
        employeeId,
        status === 'Approved' ? 'request_approved' : 'request_rejected',
        `Tu solicitud de ${request[2]} fue ${statusSpanish}`,
        '/dashboard'
    );

    return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employeeId = (session.user as any).id;
    const isAdmin = (session.user as any).role === 'Admin';

    const rows = await getSheetData('Requests!A2:I');

    // Optimization: Fetch users only if Admin to map emails
    let userMap = new Map();
    if (isAdmin) {
        const users = await getSheetData('Users!A2:C'); // ID, Name, Email
        users.forEach(u => userMap.set(u[0], u[2]));
    }

    let requests = rows.map(row => ({
        id: row[0],
        employeeId: row[1],
        type: row[2],
        startDate: row[3],
        endDate: row[4],
        reason: row[5],
        status: row[6],
        startTime: row[7],
        endTime: row[8],
        email: isAdmin ? userMap.get(row[1]) : undefined
    }));

    if (!isAdmin) {
        requests = requests.filter(r => r.employeeId === employeeId);
    }

    return NextResponse.json({ requests });
}
