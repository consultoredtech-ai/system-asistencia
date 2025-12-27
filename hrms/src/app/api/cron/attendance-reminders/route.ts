import { getSheetData, getUsers } from '@/lib/googleSheets';
import { sendAttendanceReminder } from '@/lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Basic security check: verify a secret token in headers or query
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const isTest = searchParams.get('test') === 'true';
    const testEmployeeId = searchParams.get('employeeId');

    if (!isTest && token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
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

        const dayOfWeek = getValue('weekday');
        const dateStr = `${getValue('year')}-${getValue('month')}-${getValue('day')}`;
        const currentTimeStr = `${getValue('hour')}:${getValue('minute')}`;

        const users = await getUsers();
        const schedules = await getSheetData('Schedules!A2:F');
        const attendance = await getSheetData('Attendance!A2:G');

        const results = [];

        for (const user of users) {
            if (user.Role !== 'Employee') continue;

            // If in test mode, only process the specified employee
            if (isTest && testEmployeeId && user.EmployeeID !== testEmployeeId) continue;

            const userSchedule = schedules.find(s => s[0] === user.EmployeeID && s[1] === dayOfWeek);
            if (isTest) console.log(`Testing user ${user.Name} (${user.EmployeeID}). Schedule found:`, !!userSchedule);
            if (!userSchedule) continue;

            const s1Start = userSchedule[2];
            const s1End = userSchedule[3];
            const s2Start = userSchedule[4];
            const s2End = userSchedule[5];

            const userAttendance = attendance.filter(a => a[0] === user.EmployeeID && a[1] === dateStr);
            if (isTest) console.log(`Attendance for today:`, userAttendance);

            // Helper to check if time is within a 30-min window
            const isNear = (targetTime: string) => {
                if (isTest) return true; // Bypass time check for testing
                if (!targetTime) return false;
                const [targetH, targetM] = targetTime.split(':').map(Number);
                const [currentH, currentM] = currentTimeStr.split(':').map(Number);
                const diff = (currentH * 60 + currentM) - (targetH * 60 + targetM);
                return diff >= -15 && diff <= 15; // 15 mins before or after
            };

            // 1. Check-in Reminder (S1 Start)
            if (isNear(s1Start)) {
                const hasCheckIn = userAttendance.some(a => a[2]); // Column C is check-in
                if (isTest) console.log(`Check-in check: hasCheckIn=${hasCheckIn}`);
                if (!hasCheckIn) {
                    await sendAttendanceReminder(user.Email, user.Name, 'check-in');
                    results.push({ user: user.Name, type: 'check-in' });
                }
            }

            // 2. Check-out Reminder (S1 End or S2 End)
            const targetEnd = s2End || s1End;
            if (isNear(targetEnd)) {
                const hasCheckOut = userAttendance.some(a => a[3]); // Column D is check-out
                if (isTest) console.log(`Check-out check: targetEnd=${targetEnd}, hasCheckOut=${hasCheckOut}`);
                if (!hasCheckOut) {
                    await sendAttendanceReminder(user.Email, user.Name, 'check-out');
                    results.push({ user: user.Name, type: 'check-out' });
                }
            }
        }

        return NextResponse.json({ success: true, remindersSent: results, testMode: isTest });
    } catch (error) {
        console.error('Error in attendance reminders cron:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
