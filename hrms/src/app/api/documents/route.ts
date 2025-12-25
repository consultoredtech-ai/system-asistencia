import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { appendSheetData, getSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employeeId, fileName, fileLink, type } = await req.json();
    const documentId = Math.random().toString(36).substring(7);
    const uploadDate = new Date().toISOString().split('T')[0];

    // Columns: DocumentID, EmployeeID, FileName, FileLink, UploadDate, Type
    await appendSheetData('Documents!A2:F', [documentId, employeeId, fileName, fileLink, uploadDate, type]);

    return NextResponse.json({ success: true, message: 'Document link saved' });
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await getSheetData('Documents!A2:F');
    const documents = rows.map(row => ({
        id: row[0],
        employeeId: row[1],
        fileName: row[2],
        fileLink: row[3],
        uploadDate: row[4],
        type: row[5]
    }));

    // If not admin, filter by own ID
    const user = session.user as any;
    if (user.role !== 'Admin') {
        const myDocs = documents.filter(d => d.employeeId === user.id);
        return NextResponse.json({ documents: myDocs });
    }

    return NextResponse.json({ documents });
}
