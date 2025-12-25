import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getSheetData, deleteSheetRow } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // 1. Find the row index
    const rows = await getSheetData('Documents!A2:F');
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 2. Delete the row
    // rowIndex is from the array starting at A2.
    // Sheet Row 1 is Header. Row 2 is Index 0.
    // So Sheet Row Index (0-based) for Index 0 is 1.
    // Formula: sheetRowIndex = rowIndex + 1
    await deleteSheetRow('Documents', rowIndex + 1);

    return NextResponse.json({ success: true, message: 'Document deleted' });
}
