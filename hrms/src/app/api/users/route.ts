import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rows = await getSheetData('Users!A2:H'); // A:ID, B:Name, C:Email, D:Role, E:Salary, F:Hash, G:Entry, H:Exit

    const users = rows.map(row => ({
        employeeId: row[0],
        name: row[1],
        email: row[2],
        role: row[3],
        entryTime: row[6] || '',
        exitTime: row[7] || ''
    }));

    return NextResponse.json({ users });
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
