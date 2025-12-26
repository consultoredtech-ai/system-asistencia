import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, appendSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const rows = await getSheetData('Notifications!A2:G');

    const notifications = rows
        .map(row => ({
            id: row[0],
            userId: row[1],
            type: row[2],
            message: row[3],
            isRead: String(row[4]).toLowerCase() === 'true',
            createdAt: row[5],
            link: row[6] || ''
        }))
        .filter(n => n.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ notifications });
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationId, markAll } = await req.json();
    const user = session.user as any;
    const rows = await getSheetData('Notifications!A2:G');

    if (markAll) {
        // Mark all notifications for this user as read
        const updates = [];
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][1] === user.id && String(rows[i][4]).toLowerCase() === 'false') {
                const row = [...rows[i]];
                // Ensure the row has at least 5 elements to avoid index issues
                while (row.length < 5) row.push('');
                row[4] = 'true';
                updates.push({
                    range: `Notifications!A${i + 2}:G${i + 2}`,
                    values: [row]
                });
            }
        }

        if (updates.length > 0) {
            const { google } = await import('googleapis');
            const { getAuth } = await import('@/lib/googleSheets');
            const auth = await getAuth();
            const sheets = google.sheets({ version: 'v4', auth });

            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                requestBody: {
                    data: updates,
                    valueInputOption: 'USER_ENTERED'
                }
            });
        }
        return NextResponse.json({ success: true });
    }

    const rowIndex = rows.findIndex(row => row[0] === notificationId);
    if (rowIndex === -1) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update IsRead to true
    const row = [...rows[rowIndex]];
    // Ensure the row has at least 5 elements to avoid index issues
    while (row.length < 5) row.push('');
    row[4] = 'true';

    // Update in sheet
    await updateSheetData(`Notifications!A${rowIndex + 2}:G${rowIndex + 2}`, row);

    return NextResponse.json({ success: true });
}

// Internal function to create notifications (called by other APIs)
export async function createNotification(userId: string, type: string, message: string, link: string = '') {
    const notificationId = `n${Date.now()}`;
    const createdAt = new Date().toISOString();

    await appendSheetData('Notifications!A2:G', [
        notificationId,
        userId,
        type,
        message,
        'false', // isRead
        createdAt,
        link
    ]);
}
