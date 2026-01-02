import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { appendSheetData, getSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import { isHoliday } from '@/lib/holidays';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, isAuthorized } = await req.json(); // 'check-in' or 'check-out'
    const employeeId = (session.user as any).id;

    // Normalize to Chile timezone
    const now = new Date();
    const chileTimeParts = new Intl.DateTimeFormat('en-US', {
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

    const getValue = (type: string) => chileTimeParts.find(p => p.type === type)?.value;

    const dateStr = `${getValue('year')}-${getValue('month')}-${getValue('day')}`;
    const timeStr = `${getValue('hour')?.padStart(2, '0')}:${getValue('minute')?.padStart(2, '0')}:${getValue('second')?.padStart(2, '0')}`;
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

        // Check for schedule
        if (!dailySchedule && !isAuthorized) {
            return NextResponse.json({
                error: 'NO_SCHEDULE',
                message: 'No tienes un horario asignado para hoy. ¿Es un marcaje autorizado?'
            }, { status: 400 });
        }

        let observation = '';
        let balance = 0;
        let targetEntry = null;

        if (!dailySchedule && isAuthorized) {
            observation = 'Hora Extra (Pendiente de Autorización)';
        } else {
            // Determine which shift we are targeting
            const currentMinutes = parseInt(getValue('hour') || '0') * 60 + parseInt(getValue('minute') || '0');

            const getMinutes = (time: string | null) => {
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
                const entryMinutes = getMinutes(targetEntry);
                const diffMinutes = currentMinutes - entryMinutes;

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
        }

        await appendSheetData('Attendance!A2:G', [employeeId, dateStr, timeStr, '', 'Present', observation, balance]);
        return NextResponse.json({ success: true, message: 'Checked in' });

    } else if (action === 'check-out') {
        const rows = await getSheetData('Attendance!A2:G');
        // Find the last record that has NO checkout
        const rowIndex = rows.findLastIndex(row => row[0] === employeeId && row[1] === dateStr && !row[3]);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'No active check-in found' }, { status: 400 });
        }

        let observation = rows[rowIndex][5] || '';
        let balance = parseInt(rows[rowIndex][6] || '0');
        let targetExit = null;

        const currentMinutes = parseInt(getValue('hour') || '0') * 60 + parseInt(getValue('minute') || '0');

        if (!dailySchedule) {
            // Calculate duration since check-in for overtime
            const checkInTime = rows[rowIndex][2];
            const [ciH, ciM] = checkInTime.split(':').map(Number);
            const checkInMinutes = ciH * 60 + ciM;
            const duration = currentMinutes - checkInMinutes;
            balance = isNaN(duration) ? 0 : duration;
            // observation already contains "Hora Extra (Pendiente de Autorización)"
        } else {
            // Determine which shift we are ending
            const getMinutes = (time: string | null) => {
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
                const exitMinutes = getMinutes(targetExit);
                const diffMinutes = currentMinutes - exitMinutes;

                balance += diffMinutes; // Late exit = positive, Early exit = negative

                let outObs = '';
                if (diffMinutes < 0) outObs = 'Falta cumplir horario';
                else if (diffMinutes > 0 && diffMinutes <= 60) outObs = 'Tiempo a favor';
                else if (diffMinutes > 60) outObs = 'Hora Extra';

                if (outObs) observation = observation ? `${observation}, ${outObs}` : outObs;
            }
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

    const { employeeId, date, observation, balance, rowIndex: providedRowIndex } = await req.json();
    console.log('PUT /api/attendance', { employeeId, date, observation, balance, providedRowIndex });

    if (!employeeId || !date) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let sheetRow;
    if (providedRowIndex) {
        sheetRow = providedRowIndex;
        console.log('Using provided rowIndex:', sheetRow);
    } else {
        const rows = await getSheetData('Attendance!A2:G');
        const rowIndex = rows.findLastIndex(row => row[0] === employeeId && row[1] === date);
        console.log('Found rowIndex:', rowIndex);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        sheetRow = rowIndex + 2;
    }

    console.log('Updating row:', sheetRow);

    try {
        await updateSheetData(`Attendance!F${sheetRow}:G${sheetRow}`, [observation, balance]);
        console.log('Update successful');
        return NextResponse.json({ success: true, message: 'Record updated' });
    } catch (error) {
        console.error('Update failed:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
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

    let history = rows.map((row, index) => ({
        rowIndex: index + 2, // 1-based index + header row
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
