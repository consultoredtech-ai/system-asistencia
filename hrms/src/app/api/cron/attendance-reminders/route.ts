import { getSheetData, getUsers } from '@/lib/googleSheets';
import { sendAttendanceReminder } from '@/lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Basic security check: verify a secret token in headers or query
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = now.toISOString().split('T')[0];
        const currentTimeStr = now.toLocaleTimeString('en-GB', { hour12: false }).substring(0, 5); // HH:MM

        const users = await getUsers();
        const schedules = await getSheetData('Schedules!A2:F');
        const attendance = await getSheetData('Attendance!A2:F');

        const results = [];

        for (const user of users) {
            if (user.Role !== 'Employee') continue;

            const userSchedule = schedules.find(s => s[0] === user.EmployeeID && s[1] === dayOfWeek);
            if (!userSchedule) continue;

            const s1Start = userSchedule[2];
            const s1End = userSchedule[3];
            const s2Start = userSchedule[4];
            const s2End = userSchedule[5];

            const userAttendance = attendance.filter(a => a[0] === user.EmployeeID && a[1] === dateStr);

            // Helper to check if time is within a 30-min window
            const isNear = (targetTime: string) => {
                if (!targetTime) return false;
                const [targetH, targetM] = targetTime.split(':').map(Number);
                const [currentH, currentM] = currentTimeStr.split(':').map(Number);
                const diff = (currentH * 60 + currentM) - (targetH * 60 + targetM);
                return diff >= -15 && diff <= 15; // 15 mins before or after
            };

            // 1. Check-in Reminder (S1 Start)
            if (isNear(s1Start)) {
                const hasCheckIn = userAttendance.some(a => a[2]); // Column C is check-in
                if (!hasCheckIn) {
                    await sendAttendanceReminder(user.Email, user.Name, 'check-in');
                    results.push({ user: user.Name, type: 'check-in' });
                }
            }

            // 2. Check-out Reminder (S1 End or S2 End)
            const targetEnd = s2End || s1End;
            if (isNear(targetEnd)) {
                const hasCheckOut = userAttendance.some(a => a[3]); // Column D is check-out
                if (!hasCheckOut) {
                    await sendAttendanceReminder(user.Email, user.Name, 'check-out');
                    results.push({ user: user.Name, type: 'check-out' });
                }
            }
        }

        return NextResponse.json({ success: true, remindersSent: results });
    } catch (error) {
        console.error('Error in attendance reminders cron:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
