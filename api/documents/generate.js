/**
 * POST /api/documents/generate
 *
 * Genera un PDF (Receta Médica o Solicitud de Examen), lo guarda en Supabase Storage
 * y retorna la URL pública del PDF.
 *
 * Body:
 *   - type: "receta" | "examen"
 *   - patient_id: UUID del paciente
 *   - content: texto del contenido (medicamentos o exámenes)
 *
 * Requiere rol Doctor.
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const { success, error } = require('../../lib/utils/responseHelper');
const supabaseAdmin = require('../../lib/supabaseAdmin');
const PDFDocument = require('pdfkit');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  if (req.user.role !== 'Doctor') {
    return error(res, 'FORBIDDEN', 'Solo doctores pueden generar documentos', 403);
  }

  const { type, patient_id, content, appointment_id } = req.body;

  if (!type || !patient_id || !content) {
    return error(res, 'VALIDATION_ERROR', 'type, patient_id y content son requeridos', 400);
  }

  if (!['receta', 'examen'].includes(type)) {
    return error(res, 'VALIDATION_ERROR', 'type debe ser "receta" o "examen"', 400);
  }

  // Fetch doctor data
  const { data: doctor } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, rut, especialidad')
    .eq('id', req.user.id)
    .single();

  if (!doctor) {
    return error(res, 'NOT_FOUND', 'Doctor no encontrado', 404);
  }

  // Fetch patient data
  const { data: patient } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, rut, fecha_nacimiento')
    .eq('id', patient_id)
    .single();

  if (!patient) {
    return error(res, 'NOT_FOUND', 'Paciente no encontrado', 404);
  }

  // Calculate age
  let patientAge = '';
  if (patient.fecha_nacimiento) {
    const birth = new Date(patient.fecha_nacimiento);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    patientAge = `${age} años`;
  }

  const title = type === 'receta' ? 'Receta Médica' : 'Solicitud de Examen';
  const doctorFullName = `Dr. ${doctor.first_name} ${doctor.last_name}`;
  const patientFullName = `${patient.first_name} ${patient.last_name}`;
  const today = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Generate PDF
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks = [];
  const pageWidth = doc.page.width - 100; // margin left + right
  const blueColor = '#1E3A5F'; // dark blue for lines
  const lightBlue = '#3B82F6'; // accent blue

  doc.on('data', (chunk) => chunks.push(chunk));

  await new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);

    // Top border line
    doc.strokeColor(blueColor).lineWidth(2)
      .moveTo(50, 45).lineTo(50 + pageWidth, 45).stroke();

    // Header / Title
    doc.moveDown(0.3);
    doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.3);

    // Doctor info below title
    doc.fontSize(12).font('Helvetica').text(doctorFullName, { align: 'center' });
    doc.fontSize(10).text(`RUT: ${doctor.rut}`, { align: 'center' });
    if (doctor.especialidad) {
      doc.text(`Especialidad: ${doctor.especialidad}`, { align: 'center' });
    }
    doc.moveDown(0.5);

    // Blue divider after header
    const afterHeaderY = doc.y;
    doc.strokeColor(lightBlue).lineWidth(1)
      .moveTo(50, afterHeaderY).lineTo(50 + pageWidth, afterHeaderY).stroke();
    doc.moveDown(0.8);

    // Date (right aligned)
    doc.fillColor('#000000').fontSize(10).font('Helvetica').text(`Fecha: ${today}`, { align: 'right' });
    doc.moveDown(0.8);

    // Patient info section
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Datos del Paciente');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Nombre: ${patientFullName}`);
    doc.text(`RUT: ${patient.rut || 'No registrado'}`);
    if (patientAge) {
      doc.text(`Edad: ${patientAge}`);
    }
    doc.moveDown(0.5);

    // Blue divider after patient info
    const afterPatientY = doc.y;
    doc.strokeColor(lightBlue).lineWidth(1)
      .moveTo(50, afterPatientY).lineTo(50 + pageWidth, afterPatientY).stroke();
    doc.moveDown(0.8);

    // Content section
    const contentLabel = type === 'receta' ? 'Medicamentos Recetados' : 'Exámenes Solicitados';
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(contentLabel);
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(content, { lineGap: 5 });
    doc.moveDown(1);

    // Blue divider after content
    const afterContentY = doc.y;
    doc.strokeColor(lightBlue).lineWidth(1)
      .moveTo(50, afterContentY).lineTo(50 + pageWidth, afterContentY).stroke();

    // Footer with doctor signature area (bottom right)
    const pageHeight = doc.page.height;
    const bottomY = pageHeight - 130;

    // Bottom border line
    doc.strokeColor(blueColor).lineWidth(2)
      .moveTo(50, bottomY - 20).lineTo(50 + pageWidth, bottomY - 20).stroke();

    doc.fillColor('#000000').fontSize(10).font('Helvetica');
    doc.text('_________________________', 350, bottomY, { width: 200, align: 'center' });
    doc.text(doctorFullName, 350, bottomY + 15, { width: 200, align: 'center' });
    doc.text(`RUT: ${doctor.rut}`, 350, bottomY + 30, { width: 200, align: 'center' });
    doc.text('Firma y Timbre', 350, bottomY + 45, { width: 200, align: 'center' });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);

  // Save to Supabase Storage
  const timestamp = Date.now();
  const fileName = `${type}_${doctor.id}_${patient.id}_${timestamp}.pdf`;
  const filePath = `documents/${doctor.id}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('medical-documents')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    // If bucket doesn't exist, try creating it
    if (uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
      await supabaseAdmin.storage.createBucket('medical-documents', { public: false });
      const { error: retryError } = await supabaseAdmin.storage
        .from('medical-documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (retryError) {
        console.error('Upload retry error:', retryError);
        return error(res, 'STORAGE_ERROR', `Error al guardar documento: ${retryError.message}`, 500);
      }
    } else {
      console.error('Upload error:', uploadError);
      return error(res, 'STORAGE_ERROR', `Error al guardar documento: ${uploadError.message}`, 500);
    }
  }

  // Get signed URL for viewing
  const { data: signedUrl } = await supabaseAdmin.storage
    .from('medical-documents')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  // Save document record in database
  await supabaseAdmin.from('documents').insert({
    doctor_id: doctor.id,
    patient_id: patient.id,
    appointment_id: appointment_id || null,
    type,
    file_path: filePath,
    content_summary: content.substring(0, 255),
  });

  return success(res, {
    url: signedUrl?.signedUrl || null,
    filePath,
    type,
    patient: patientFullName,
  }, 201);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
