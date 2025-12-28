const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function exportToDocs() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: [
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive'
        ],
    });

    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    try {
        // 1. Create the Document
        const doc = await docs.documents.create({
            requestBody: {
                title: 'Consultoría HRMS - Estrategia CTO y Arquitectura',
            },
        });

        const documentId = doc.data.documentId;
        console.log(`Documento creado con ID: ${documentId}`);

        // 2. Read content from artifacts
        const planPath = path.resolve('C:/Users/Administrador/.gemini/antigravity/brain/71420737-a053-4357-b06d-ecfb68b5ccde/implementation_plan.md');
        const walkthroughPath = path.resolve('C:/Users/Administrador/.gemini/antigravity/brain/71420737-a053-4357-b06d-ecfb68b5ccde/walkthrough.md');

        const planContent = fs.readFileSync(planPath, 'utf8');
        const walkthroughContent = fs.readFileSync(walkthroughPath, 'utf8');

        const fullContent = `
# RESUMEN DE CONSULTORÍA HRMS

${walkthroughContent}

---

# PLAN DETALLADO Y ESTRATEGIA

${planContent}
        `.trim();

        // 3. Update the Document with content
        // Note: The Google Docs API uses a batchUpdate with requests. 
        // For simplicity, we just insert the text at the beginning.
        await docs.documents.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: { index: 1 },
                            text: fullContent,
                        },
                    },
                ],
            },
        });

        console.log('Contenido insertado correctamente.');

        // 4. Make the document readable by anyone with the link (if possible)
        // Or at least output the link.
        await drive.permissions.create({
            fileId: documentId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log(`Enlace al documento: https://docs.google.com/document/d/${documentId}/edit`);

    } catch (error) {
        console.error('Error exportando a Google Docs:', error);
    }
}

exportToDocs();
