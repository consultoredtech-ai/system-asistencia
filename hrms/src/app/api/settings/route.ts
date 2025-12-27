import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSheetData, updateSheetData } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rows = await getSheetData('Settings!A2:B');
        const settings: { [key: string]: string } = {};
        rows.forEach(row => {
            if (row[0]) settings[row[0]] = row[1] || '';
        });
        return NextResponse.json({ settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ settings: {} });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'Admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const data = await req.json();

    try {
        // We expect data to be { CompanyName: '...', CompanyRUT: '...', ... }
        // We need to map this back to the sheet rows.
        // We know the order from the script: Name, RUT, Address, Logo
        // Or we can just update specific cells if we want to be safe, or rewrite the whole range.
        // Let's rewrite the values based on keys.

        const updates = [
            ['CompanyName', data.CompanyName || ''],
            ['CompanyRUT', data.CompanyRUT || ''],
            ['CompanyAddress', data.CompanyAddress || ''],
            ['CompanyLogoUrl', data.CompanyLogoUrl || '']
        ];

        await updateSheetData('Settings!A2:B5', updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
