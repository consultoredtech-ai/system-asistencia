import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getSheetData, updateSheetData, deleteSheetRow } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employeeId = params.id;
    const data = await req.json();
    const {
        name, email, role, salary, password,
        birthDate, address, phone, joinDate, terminationDate
    } = data;

    const rows = await getSheetData('Users!A2:M');
    const rowIndex = rows.findIndex(row => row[0] === employeeId);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sheetRow = rowIndex + 2;
    const existingRow = rows[rowIndex];

    // Prepare updated row
    const updatedRow = [...existingRow];
    if (name) updatedRow[1] = name;
    if (email) updatedRow[2] = email;
    if (role) updatedRow[3] = role;
    if (salary !== undefined) updatedRow[4] = salary;
    if (password) {
        updatedRow[5] = await bcrypt.hash(password, 10);
    }
    if (birthDate !== undefined) updatedRow[8] = birthDate;
    if (address !== undefined) updatedRow[9] = address;
    if (phone !== undefined) updatedRow[10] = phone;
    if (joinDate !== undefined) updatedRow[11] = joinDate;
    if (terminationDate !== undefined) updatedRow[12] = terminationDate;

    await updateSheetData(`Users!A${sheetRow}:M${sheetRow}`, updatedRow);

    return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const employeeId = params.id;
    const rows = await getSheetData('Users!A2:A');
    const rowIndex = rows.findIndex(row => row[0] === employeeId);

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // rowIndex is 0-based for the data starting at A2. 
    // deleteSheetRow expects 0-based index for the WHOLE sheet.
    // So A2 is index 1.
    await deleteSheetRow('Users', rowIndex + 1);

    return NextResponse.json({ success: true });
}
