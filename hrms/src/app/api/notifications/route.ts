import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, appendSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

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
            isRead: row[4] === 'true',
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

    const { notificationId } = await req.json();
    const rows = await getSheetData('Notifications!A2:G');
    const rowIndex = rows.findIndex(row => row[0] === notificationId);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update IsRead to true
    const row = rows[rowIndex];
    row[4] = 'true';

    // Update in sheet (row index + 2 because: 1 for header, 1 for 0-based to 1-based)
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
