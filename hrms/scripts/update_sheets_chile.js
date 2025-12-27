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

async function updateHeaders() {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Update Users Headers (A-Q)
    // Existing: A:ID, B:Name, C:Email, D:Role, E:Salary, F:Hash, G:Entry, H:Exit, I:Birth, J:Address, K:Phone, L:Join, M:Term
    // New: N:AFP, O:HealthSystem, P:Colacion, Q:Movilizacion
    const userHeaders = [
        'EmployeeID', 'Name', 'Email', 'Role', 'Salary', 'PasswordHash',
        'EntryTime', 'ExitTime', 'BirthDate', 'Address', 'Phone', 'JoinDate', 'TerminationDate',
        'AFP', 'HealthSystem', 'Colacion', 'Movilizacion'
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Users!A1:Q1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [userHeaders] }
    });
    console.log('Updated Users headers');

    // Update Payroll Headers (A-Q)
    // Existing: A:ID, B:EmpID, C:Month, D:Year, E:Base, F:OverHours, G:OverPay, H:Deductions, I:Net, J:Status
    // New: K:Gratification, L:TaxableIncome, M:NonTaxableIncome, N:AFP_Amount, O:Health_Amount, P:UI_Amount, Q:OtherDeductions
    const payrollHeaders = [
        'ID', 'EmployeeID', 'Month', 'Year', 'BaseSalary',
        'OvertimeHours', 'OvertimePay', 'TotalDeductions', 'NetSalary', 'Status',
        'Gratification', 'TaxableIncome', 'NonTaxableIncome', 'AFP_Amount', 'Health_Amount', 'UI_Amount', 'OtherDeductions'
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Payroll!A1:Q1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [payrollHeaders] }
    });
    console.log('Updated Payroll headers');
}

async function addEmployee() {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Check if user exists
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Users!A2:A',
    });
    const existingIds = res.data.values ? res.data.values.flat() : [];

    const employeeId = '18.532.664-0';
    if (existingIds.includes(employeeId)) {
        console.log(`Employee ${employeeId} already exists.`);
        return;
    }

    // Fernanda Stephanie Mera Ascencio
    // Salary: 351771
    // AFP: PLAN VITAL
    // Health: FONASA
    // Colacion: 30000
    // Movilizacion: 30000
    // Beca hijo: 45000 (We can put this in NonTaxable or handle separately, for now let's assume it's part of "Others" or just fixed logic)
    // Actually, let's add it to the script as a note or handle it in logic. The prompt said "Colacion, Movilizacion".
    // I'll put the Beca in "Other Non Taxable" if I had a column, but I don't. I'll stick to the requested structure.

    // Password hash for "123456" (example)
    const hash = '$2a$10$abcdefg...'; // Placeholder, or we can generate one if we had bcrypt here. 
    // Since I can't easily run bcrypt in this standalone script without installing it or requiring it from node_modules (which might be tricky if not in path), 
    // I'll use a dummy hash. The user can reset it or I can use the app to create it properly later.
    // Actually, I can try to require bcryptjs if it's in node_modules.
    let passwordHash = '$2a$10$X7.1.1.1.1.1.1.1.1.1.1'; // Dummy

    try {
        const bcrypt = require('bcryptjs');
        passwordHash = await bcrypt.hash('123456', 10);
    } catch (e) {
        console.log('bcryptjs not found, using dummy hash');
    }

    const newUser = [
        employeeId,
        'Fernanda Stephanie Mera Ascencio',
        'fernanda@ktalan.cl',
        'Employee',
        '351771',
        passwordHash,
        '', '', // Entry/Exit
        '', // Birth
        'Alcalde Wenceslao Ramos 1470, Osorno', // Address from slip
        '', // Phone
        '02/06/2025', // JoinDate
        '', // Term
        'PLAN VITAL', // AFP
        'FONASA', // Health
        '30000', // Colacion
        '30000' // Movilizacion
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Users!A2:Q',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newUser] }
    });
    console.log(`Added employee ${employeeId}`);
}

async function main() {
    try {
        await updateHeaders();
        await addEmployee();
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
