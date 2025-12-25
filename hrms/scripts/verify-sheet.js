require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function verify() {
    try {
        console.log('Authenticating...');
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        console.log(`Checking Spreadsheet ID: ${spreadsheetId}`);
        const response = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        console.log('Connection Successful!');
        console.log('Spreadsheet Title:', response.data.properties.title);
        console.log('Sheets found:', response.data.sheets.map(s => s.properties.title).join(', '));

    } catch (error) {
        console.error('Verification Failed:', error.message);
        if (error.code === 403) {
            console.error('Hint: Make sure you shared the sheet with:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        }
        process.exit(1);
    }
}

verify();
