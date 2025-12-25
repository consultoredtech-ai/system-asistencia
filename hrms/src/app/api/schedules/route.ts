import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, appendSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
        return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const rows = await getSheetData('Schedules!A2:F'); // A:ID, B:Day, C:S1_Start, D:S1_End, E:S2_Start, F:S2_End
    const userSchedules = rows.filter(row => row[0] === employeeId);

    return NextResponse.json({ schedules: userSchedules });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employeeId, schedules } = await req.json();
    // schedules: [{ day: 'Monday', s1Start, s1End, s2Start, s2End }, ...]

    const rows = await getSheetData('Schedules!A2:F');

    // For simplicity, we will delete old schedules for this user and append new ones
    // In a real DB this is an update, in Sheets it's tricky. 
    // Strategy: Find indices to clear, but clearing rows in Sheets leaves gaps.
    // Better Strategy for Sheets MVP: 
    // 1. Read all data.
    // 2. Filter OUT the current user's data.
    // 3. Append the new data.
    // 4. Overwrite the entire sheet (risky but effective for small data).
    // ALTERNATIVE: Just update row by row if exists, append if not.

    for (const sched of schedules) {
        const rowIndex = rows.findIndex(row => row[0] === employeeId && row[1] === sched.day);
        const rowData = [employeeId, sched.day, sched.s1Start, sched.s1End, sched.s2Start, sched.s2End];

        if (rowIndex !== -1) {
            // Update existing row
            const sheetRow = rowIndex + 2;
            await updateSheetData(`Schedules!A${sheetRow}:F${sheetRow}`, rowData);
        } else {
            // Append new row
            await appendSheetData('Schedules!A2:F', rowData);
        }
    }

    return NextResponse.json({ success: true });
}
