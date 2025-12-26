import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, updateSheetData, appendSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rows = await getSheetData('Users!A2:M');

    const users = rows.map(row => ({
        employeeId: row[0],
        name: row[1],
        email: row[2],
        role: row[3],
        salary: row[4],
        birthDate: row[8] || '',
        address: row[9] || '',
        phone: row[10] || '',
        joinDate: row[11] || '',
        terminationDate: row[12] || ''
    }));

    return NextResponse.json({ users });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await req.json();
    const {
        employeeId, name, email, role, salary, password,
        birthDate, address, phone, joinDate, terminationDate
    } = data;

    if (!employeeId || !name || !email || !role || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rows = await getSheetData('Users!A2:A');
    if (rows.some(row => row[0] === employeeId)) {
        return NextResponse.json({ error: 'Employee ID already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // A:ID, B:Name, C:Email, D:Role, E:Salary, F:Hash, G:Entry, H:Exit, I:Birth, J:Address, K:Phone, L:Join, M:Term
    const newUserRow = [
        employeeId, name, email, role, salary || '0', hashedPassword,
        '', '', // Entry/Exit defaults
        birthDate || '', address || '', phone || '', joinDate || '', terminationDate || ''
    ];

    await appendSheetData('Users!A2:M', newUserRow);

    return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employeeId, entryTime, exitTime } = await req.json();

    const rows = await getSheetData('Users!A2:H');
    const rowIndex = rows.findIndex(row => row[0] === employeeId);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sheetRow = rowIndex + 2;
    // Update Columns G (Entry) and H (Exit)
    await updateSheetData(`Users!G${sheetRow}:H${sheetRow}`, [entryTime, exitTime]);

    return NextResponse.json({ success: true });
}
