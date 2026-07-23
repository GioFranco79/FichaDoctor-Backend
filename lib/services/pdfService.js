const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de receta médica en memoria (Buffer).
 *
 * @param {Object} prescription - Datos completos de la receta
 * @param {string} prescription.id - UUID de la receta
 * @param {Object} prescription.doctor - Datos del doctor {first_name, last_name}
 * @param {Object} prescription.patient - Datos del paciente {first_name, last_name}
 * @param {Array} prescription.medications - Array de medicamentos [{name, dosage, frequency, duration}]
 * @param {string|null} prescription.instructions - Indicaciones generales
 * @param {string} prescription.issue_date - Fecha de emisión
 * @returns {Promise<Buffer>} Buffer con el contenido del PDF
 */
async function generatePrescriptionPdf(prescription) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Receta Médica', { align: 'center' });
      doc.moveDown();

      // Doctor info
      const doctorName = `${prescription.doctor.first_name} ${prescription.doctor.last_name}`;
      doc.fontSize(12).text(`Doctor: ${doctorName}`);
      doc.moveDown(0.5);

      // Patient info
      const patientName = `${prescription.patient.first_name} ${prescription.patient.last_name}`;
      doc.text(`Paciente: ${patientName}`);
      doc.moveDown(0.5);

      // Issue date
      doc.text(`Fecha: ${prescription.issue_date}`);
      doc.moveDown();

      // Separator
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Medications
      doc.fontSize(14).text('Medicamentos:', { underline: true });
      doc.moveDown(0.5);

      if (prescription.medications && prescription.medications.length > 0) {
        prescription.medications.forEach((med, index) => {
          doc.fontSize(11);
          doc.text(`${index + 1}. ${med.name}`);
          doc.text(`   Dosis: ${med.dosage}`);
          doc.text(`   Frecuencia: ${med.frequency}`);
          doc.text(`   Duración: ${med.duration}`);
          doc.moveDown(0.5);
        });
      }

      // Instructions
      if (prescription.instructions) {
        doc.moveDown();
        doc.fontSize(14).text('Indicaciones:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(prescription.instructions);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePrescriptionPdf,
};
