const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAuth() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
    });
    return auth;
}

async function createSettingsSheet() {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 1. Check if sheet exists
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = metadata.data.sheets.some(s => s.properties.title === 'Settings');

    if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: { title: 'Settings' }
                    }
                }]
            }
        });
        console.log('Created Settings sheet');

        // 2. Add Headers and Default Data
        const values = [
            ['Key', 'Value'],
            ['CompanyName', 'ASESORIAS Y CAPACITACIONES KTALAN SPA'],
            ['CompanyRUT', '78.152.536-7'],
            ['CompanyAddress', 'Alcalde Wenceslao Ramos 1470, Osorno'],
            ['CompanyLogoUrl', ''] // Placeholder
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Settings!A1:B5',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values }
        });
        console.log('Populated Settings sheet');
    } else {
        console.log('Settings sheet already exists');
    }
}

createSettingsSheet().catch(console.error);
