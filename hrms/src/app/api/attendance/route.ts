import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { appendSheetData, getSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import { isHoliday } from '@/lib/holidays';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json(); // 'check-in' or 'check-out'
    const employeeId = (session.user as any).id;

    // Normalize to Chile timezone
    const now = new Date();
    const chileTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'long'
    }).formatToParts(now);

    const getValue = (type: string) => chileTime.find(p => p.type === type)?.value;

    const dateStr = `${getValue('year')}-${getValue('month')}-${getValue('day')}`;
    const timeStr = `${getValue('hour')}:${getValue('minute')}:${getValue('second')}`;
    const dayOfWeek = getValue('weekday');

    // Fetch user schedule from Schedules sheet
    const schedules = await getSheetData('Schedules!A2:F');
    // Find schedule for this user and this day
    const dailySchedule = schedules.find(s => s[0] === employeeId && s[1] === dayOfWeek);

    // Default to null if no schedule found
    const s1Start = dailySchedule ? dailySchedule[2] : null;
    const s1End = dailySchedule ? dailySchedule[3] : null;
    const s2Start = dailySchedule ? dailySchedule[4] : null;
    const s2End = dailySchedule ? dailySchedule[5] : null;

    if (action === 'check-in') {
        const rows = await getSheetData('Attendance!A2:G');

        // Find the LAST record for today
        const todayRecords = rows.filter(row => row[0] === employeeId && row[1] === dateStr);
        const lastRecord = todayRecords[todayRecords.length - 1];

        if (lastRecord && !lastRecord[3]) { // If last record has no checkout
            return NextResponse.json({ error: 'Already checked in' }, { status: 400 });
        }

        let observation = '';
        let balance = 0;
        let targetEntry = null;

        // Determine which shift we are targeting
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const getMinutes = (time: string) => {
            if (!time) return 9999;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const s1StartMin = getMinutes(s1Start);
        const s2StartMin = getMinutes(s2Start);

        // If closer to S2 start than S1 start (and S2 exists), assume S2
        if (s2Start && Math.abs(currentMinutes - s2StartMin) < Math.abs(currentMinutes - s1StartMin)) {
            targetEntry = s2Start;
        } else {
            targetEntry = s1Start;
        }

        if (targetEntry) {
            const checkInDate = new Date(`${dateStr}T${timeStr}`);
            const entryDate = new Date(`${dateStr}T${targetEntry}:00`);
            const diffMinutes = Math.round((checkInDate.getTime() - entryDate.getTime()) / 60000);

            balance = -diffMinutes; // Early = positive, Late = negative

            if (diffMinutes < 0) observation = 'Tiempo a favor';
            else if (diffMinutes > 0 && diffMinutes <= 60) {
                const festive = await isHoliday(now);
                observation = festive ? 'Feriado (Trabajado)' : 'Atraso';
            }
            else if (diffMinutes > 60) {
                const festive = await isHoliday(now);
                observation = festive ? 'Feriado (Trabajado)' : 'Descuento';
            }
        }

        await appendSheetData('Attendance!A2:G', [employeeId, dateStr, timeStr, '', 'Present', observation, balance]);
        return NextResponse.json({ success: true, message: 'Checked in' });

    } else if (action === 'check-out') {
        const rows = await getSheetData('Attendance!A2:G');
        // Find the last record that has NO checkout
        const rowIndex = rows.findIndex(row => row[0] === employeeId && row[1] === dateStr && !row[3]);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'No active check-in found' }, { status: 400 });
        }

        let observation = rows[rowIndex][5] || '';
        let balance = parseInt(rows[rowIndex][6] || '0');
        let targetExit = null;

        // Determine which shift we are ending
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const getMinutes = (time: string) => {
            if (!time) return -9999;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const s1EndMin = getMinutes(s1End);
        const s2EndMin = getMinutes(s2End);

        if (s2End && Math.abs(currentMinutes - s2EndMin) < Math.abs(currentMinutes - s1EndMin)) {
            targetExit = s2End;
        } else {
            targetExit = s1End;
        }

        if (targetExit) {
            const checkOutDate = new Date(`${dateStr}T${timeStr}`);
            const exitDate = new Date(`${dateStr}T${targetExit}:00`);
            const diffMinutes = Math.round((checkOutDate.getTime() - exitDate.getTime()) / 60000);

            balance += diffMinutes; // Late exit = positive, Early exit = negative

            let outObs = '';
            if (diffMinutes < 0) outObs = 'Falta cumplir horario';
            else if (diffMinutes > 0 && diffMinutes <= 60) outObs = 'Tiempo a favor';
            else if (diffMinutes > 60) outObs = 'Hora Extra';

            if (outObs) observation = observation ? `${observation}, ${outObs}` : outObs;
        }

        const sheetRow = rowIndex + 2;
        await updateSheetData(`Attendance!D${sheetRow}:G${sheetRow}`, [timeStr, 'Present', observation, balance]);
        return NextResponse.json({ success: true, message: 'Checked out' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, date, observation, balance } = await req.json();
    if (!employeeId || !date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rows = await getSheetData('Attendance!A2:G');
    // Find the row to update. Note: There could be multiple records for one user on one day.
    // We'll update the last one for that day as it's usually the most relevant.
    const rowIndex = rows.findLastIndex(row => row[0] === employeeId && row[1] === date);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const sheetRow = rowIndex + 2;
    // Update observation (F) and balance (G)
    await updateSheetData(`Attendance!F${sheetRow}:G${sheetRow}`, [observation, balance]);

    return NextResponse.json({ success: true, message: 'Record updated' });
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filterEmployeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const employeeId = (session.user as any).id;
    const isAdmin = (session.user as any).role === 'Admin';
    const rows = await getSheetData('Attendance!A2:G');

    // Optimization: Fetch users only if Admin to map names
    let userMap = new Map();
    if (isAdmin) {
        const users = await getSheetData('Users!A2:B'); // ID, Name
        users.forEach(u => userMap.set(u[0], u[1]));
    }

    let history = rows.map(row => ({
        employeeId: row[0],
        name: isAdmin ? userMap.get(row[0]) || 'Unknown' : undefined,
        date: row[1],
        checkIn: row[2],
        checkOut: row[3],
        status: row[4],
        observation: row[5],
        balance: row[6] || '0'
    }));

    // Filter by employee ID if not Admin
    if (!isAdmin) {
        history = history.filter(row => row.employeeId === employeeId);
    } else {
        // Admin filters
        if (filterEmployeeId && filterEmployeeId !== 'all') {
            history = history.filter(row => row.employeeId === filterEmployeeId);
        }
        if (startDate) {
            history = history.filter(row => row.date >= startDate);
        }
        if (endDate) {
            history = history.filter(row => row.date <= endDate);
        }
    }

    return NextResponse.json({ history });
}
