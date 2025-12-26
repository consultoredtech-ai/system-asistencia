import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export interface User {
    EmployeeID: string;
    Name: string;
    Email: string;
    Role: 'Admin' | 'Employee';
    Salary?: string;
    PasswordHash: string;
    BirthDate?: string;
    Address?: string;
    Phone?: string;
    JoinDate?: string;
    TerminationDate?: string;
}

export async function getAuth() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
    });
    return auth;
}

export async function getSheetData(range: string) {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range,
    });

    return response.data.values || [];
}

export async function appendSheetData(range: string, values: any[]) {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [values],
        },
    });

    return response.data;
}

export async function updateSheetData(range: string, values: any[]) {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [values],
        },
    });

    return response.data;
}

export async function getUsers(): Promise<User[]> {
    const rows = await getSheetData('Users!A2:M');
    return rows.map((row) => ({
        EmployeeID: row[0],
        Name: row[1],
        Email: row[2],
        Role: row[3] as 'Admin' | 'Employee',
        Salary: row[4],
        PasswordHash: row[5],
        BirthDate: row[8] || '',
        Address: row[9] || '',
        Phone: row[10] || '',
        JoinDate: row[11] || '',
        TerminationDate: row[12] || '',
    }));
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const users = await getUsers();
    return users.find((user) => user.Email === email) || null;
}

export async function deleteSheetRow(sheetName: string, rowIndex: number) {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get Sheet ID
    const metadata = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });

    const sheet = metadata.data.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet || sheet.properties?.sheetId === undefined) {
        throw new Error(`Sheet ${sheetName} not found`);
    }
    const sheetId = sheet.properties.sheetId;

    // 2. Delete Row (rowIndex is 0-based sheet index)
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }]
        }
    });
}
