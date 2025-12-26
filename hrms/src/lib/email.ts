import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendAttendanceReminder(email: string, name: string, type: 'check-in' | 'check-out') {
    const subject = type === 'check-in' ? 'Recordatorio: Marcaje de Entrada' : 'Recordatorio: Marcaje de Salida';
    const message = type === 'check-in'
        ? `Hola ${name},\n\nEste es un recordatorio para que marques tu entrada en el sistema de asistencia. ¡Que tengas una excelente jornada!`
        : `Hola ${name},\n\nEste es un recordatorio para que marques tu salida en el sistema de asistencia. ¡Buen descanso!`;

    try {
        await transporter.sendMail({
            from: `"Sistema HRMS" <${process.env.SMTP_USER}>`,
            to: email,
            subject: subject,
            text: message,
            html: `<p>Hola <strong>${name}</strong>,</p><p>${message.split('\n\n')[1]}</p><p>Saludos,<br>Equipo de RRHH</p>`,
        });
        console.log(`Email reminder (${type}) sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending email reminder:', error);
        return { success: false, error };
    }
}
