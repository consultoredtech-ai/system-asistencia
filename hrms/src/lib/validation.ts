// Validation utilities for HRMS forms

export function validateDateRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
    if (!startDate || !endDate) {
        return { valid: false, error: 'Ambas fechas son requeridas' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
        return { valid: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
    }

    return { valid: true };
}

export function validateURL(url: string): { valid: boolean; error?: string } {
    if (!url) {
        return { valid: false, error: 'La URL es requerida' };
    }

    try {
        new URL(url);
        return { valid: true };
    } catch {
        return { valid: false, error: 'URL inválida. Debe incluir http:// o https://' };
    }
}

export function validateScheduleOverlap(
    shift1Start: string,
    shift1End: string,
    shift2Start: string,
    shift2End: string
): { valid: boolean; error?: string } {
    if (!shift1Start || !shift1End) {
        return { valid: true }; // Shift 1 is optional
    }

    if (!shift2Start || !shift2End) {
        return { valid: true }; // Shift 2 is optional
    }

    const s1Start = timeToMinutes(shift1Start);
    const s1End = timeToMinutes(shift1End);
    const s2Start = timeToMinutes(shift2Start);
    const s2End = timeToMinutes(shift2End);

    if (s1End > s1Start && s2Start < s1End) {
        return { valid: false, error: 'Los turnos no pueden solaparse. El Turno 2 debe empezar después del Turno 1.' };
    }

    return { valid: true };
}

export function validateTimeRange(startTime: string, endTime: string, maxHours: number = 8): { valid: boolean; error?: string } {
    if (!startTime || !endTime) {
        return { valid: false, error: 'Ambas horas son requeridas' };
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (end <= start) {
        return { valid: false, error: 'La hora de fin debe ser posterior a la hora de inicio' };
    }

    const hours = (end - start) / 60;
    if (hours > maxHours) {
        return { valid: false, error: `El rango no puede exceder ${maxHours} horas` };
    }

    return { valid: true };
}

export function validateVacationBalance(requestedDays: number, availableDays: number): { valid: boolean; error?: string } {
    if (requestedDays <= 0) {
        return { valid: false, error: 'Debe solicitar al menos 1 día' };
    }

    if (requestedDays > availableDays) {
        return { valid: false, error: `Solo tienes ${availableDays} días disponibles` };
    }

    return { valid: true };
}

export function calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    return diffDays;
}

// Helper function
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
