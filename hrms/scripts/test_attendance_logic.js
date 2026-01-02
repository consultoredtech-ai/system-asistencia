
const getMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

function testCheckIn(currentMinutes, targetEntry) {
    const entryMinutes = getMinutes(targetEntry);
    const diffMinutes = currentMinutes - entryMinutes;
    const balance = -diffMinutes;
    let observation = '';

    if (diffMinutes < 0) observation = 'Tiempo a favor';
    else if (diffMinutes > 0 && diffMinutes <= 60) observation = 'Atraso';
    else if (diffMinutes > 60) observation = 'Descuento';

    return { balance, observation };
}

function testCheckOut(currentMinutes, targetExit, initialBalance) {
    const exitMinutes = getMinutes(targetExit);
    const diffMinutes = currentMinutes - exitMinutes;
    const balance = initialBalance + diffMinutes;
    let observation = '';

    if (diffMinutes < 0) observation = 'Falta cumplir horario';
    else if (diffMinutes > 0 && diffMinutes <= 60) observation = 'Tiempo a favor';
    else if (diffMinutes > 60) observation = 'Hora Extra';

    return { balance, observation };
}

// Test Cases
console.log('--- Check-in Tests ---');
console.log('Early check-in (08:50 for 09:00):', testCheckIn(8 * 60 + 50, '09:00'));
console.log('Late check-in (09:10 for 09:00):', testCheckIn(9 * 60 + 10, '09:00'));
console.log('Very late check-in (10:10 for 09:00):', testCheckIn(10 * 60 + 10, '09:00'));

console.log('\n--- Check-out Tests ---');
console.log('Early check-out (17:50 for 18:00, initial 10):', testCheckOut(17 * 60 + 50, '18:00', 10));
console.log('Late check-out (18:10 for 18:00, initial -10):', testCheckOut(18 * 60 + 10, '18:00', -10));
console.log('Overtime check-out (19:10 for 18:00, initial 0):', testCheckOut(19 * 60 + 10, '18:00', 0));
