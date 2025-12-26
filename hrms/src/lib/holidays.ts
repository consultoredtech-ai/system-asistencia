export interface Holiday {
    nombre: string;
    fecha: string;
    irrenunciable: string;
    tipo: string;
}

let holidayCache: { year: number; holidays: Holiday[] } | null = null;

export async function getChileanHolidays(year: number = new Date().getFullYear()): Promise<Holiday[]> {
    if (holidayCache && holidayCache.year === year) {
        return holidayCache.holidays;
    }

    try {
        const res = await fetch(`https://apis.digital.gob.cl/fl/feriados/${year}`);
        if (!res.ok) throw new Error('Failed to fetch holidays');
        const data = await res.json();

        // The API returns an array of holidays or an error object
        if (Array.isArray(data)) {
            holidayCache = { year, holidays: data };
            return data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching Chilean holidays:', error);
        return [];
    }
}

export async function isHoliday(date: Date): Promise<boolean> {
    const year = date.getFullYear();
    const dateStr = date.toISOString().split('T')[0];
    const holidays = await getChileanHolidays(year);
    return holidays.some(h => h.fecha === dateStr);
}

export async function getBusinessDaysInMonth(month: number, year: number): Promise<number> {
    const holidays = await getChileanHolidays(year);
    const holidayDates = new Set(holidays.map(h => h.fecha));

    let businessDays = 0;
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isFestive = holidayDates.has(dateStr);

        if (!isWeekend && !isFestive) {
            businessDays++;
        }
    }

    return businessDays;
}
