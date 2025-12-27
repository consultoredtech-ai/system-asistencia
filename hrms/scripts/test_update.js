

async function run() {
    const payload = {
        employeeId: '1120',
        date: '2025-12-27',
        observation: 'Autorizado por jefatura',
        balance: '0'
    };

    try {
        const res = await fetch('http://localhost:3000/api/attendance', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
