import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Patient, User } from '../types';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value?: string) {
  if (!value) {
    return new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function dosageFor(m: {
  morning?: boolean;
  afternoon?: boolean;
  night?: boolean;
}) {
  return [
    m.morning ? 'M' : '–',
    m.afternoon ? 'A' : '–',
    m.night ? 'N' : '–',
  ].join('  ');
}

function cleanFilePart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'Patient';
}

function buildPrescriptionHtml(user: User, patient: Patient) {
  const visit = patient.visits?.[0];
  const vitals = visit?.vitals;
  const medicines = visit?.medicines ?? [];

  const vitalsHtml = visit && vitals
    ? `
      <div class="vitals">
        ${vitals.bp ? `<span>BP <strong>${escapeHtml(vitals.bp)} mmHg</strong></span>` : ''}
        ${vitals.pulse ? `<span>Pulse <strong>${escapeHtml(vitals.pulse)} bpm</strong></span>` : ''}
        ${vitals.spo2 ? `<span>SpO₂ <strong>${escapeHtml(vitals.spo2)}%</strong></span>` : ''}
        ${vitals.weight ? `<span>Weight <strong>${escapeHtml(vitals.weight)} kg</strong></span>` : ''}
      </div>
    `
    : '';

  const clinicalHtml =
    visit && (visit.complaints || visit.diagnosis)
      ? `
        <section class="section">
          <div class="section-title">Clinical Summary</div>

          <div class="clinical-grid">
            ${
              visit.complaints
                ? `
                  <div>
                    <div class="label">Chief Complaints</div>
                    <div class="value">${escapeHtml(visit.complaints)}</div>
                  </div>
                `
                : ''
            }

            ${
              visit.diagnosis
                ? `
                  <div>
                    <div class="label">Diagnosis</div>
                    <div class="value">${escapeHtml(visit.diagnosis)}</div>
                  </div>
                `
                : ''
            }
          </div>
        </section>
      `
      : '';

  const medicinesHtml = medicines.length
    ? `
      <table class="medicine-table">
        <thead>
          <tr>
            <th class="number">#</th>
            <th class="type">Type</th>
            <th class="medicine">Medicine</th>
            <th>Instructions</th>
            <th class="schedule">M / A / N</th>
            <th class="timing">Food</th>
            <th class="quantity">Qty</th>
          </tr>
        </thead>

        <tbody>
          ${medicines
            .map(
              (m, i) => `
                <tr>
                  <td class="number">${i + 1}</td>
                  <td class="type">${escapeHtml(m.type)}</td>
                  <td class="medicine">${escapeHtml(m.name)}</td>
                  <td>${escapeHtml(m.instructions)}</td>
                  <td class="schedule">${escapeHtml(dosageFor(m))}</td>
                  <td class="timing">${escapeHtml(m.timing)} food</td>
                  <td class="quantity">${escapeHtml(m.quantity)}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    `
    : `
      <div class="empty">
        No medicines prescribed for this visit.
      </div>
    `;

  const instructionsHtml =
    visit && (visit.suggestions || visit.investigations)
      ? `
        <section class="section">
          <div class="section-title">Instructions</div>

          <div class="notes">
            ${
              visit.suggestions
                ? `
                  <div class="note">
                    <div class="label">Advice</div>
                    <div class="value">${escapeHtml(visit.suggestions)}</div>
                  </div>
                `
                : ''
            }

            ${
              visit.investigations
                ? `
                  <div class="note">
                    <div class="label">Investigations</div>
                    <div class="value">${escapeHtml(visit.investigations)}</div>
                  </div>
                `
                : ''
            }
          </div>
        </section>
      `
      : '';

  const followUpHtml = visit?.followUp
    ? `
      <section class="section">
        <div class="section-title">Follow-up</div>

        <div class="follow">
          <span class="follow-label">Return</span>
          <span>
            After ${escapeHtml(visit.followUp)}
            ${escapeHtml(visit.followUpUnit)}
          </span>
        </div>
      </section>
    `
    : '';

  return `
    <div class="paper">

      <header class="letterhead">
        ${user.activeClinic.bannerImage ? `
          <img
            src="${user.activeClinic.bannerImage}"
            alt="${escapeHtml(user.activeClinic.name)}"
            class="banner-image"
          />
        ` : `
          <div class="head-left">
            <div class="clinic">
              ${escapeHtml(user.activeClinic.name)}
            </div>

            <div class="address">
              ${escapeHtml(user.activeClinic.address)}
            </div>
          </div>

          <div class="doctor">
            <div class="doctor-name">
              ${escapeHtml(user.activeClinic.doctorName)}
            </div>

            <div>
              ${escapeHtml(user.activeClinic.qualification)}
            </div>

            <div>
              Reg. No: ${escapeHtml(user.activeClinic.regNo)}
            </div>
          </div>
        `}
      </header>

      <div class="accent"></div>

      <main>

        <section class="patient">

          <div>
            <div class="label">Patient</div>

            <div class="patient-name">
              ${escapeHtml(patient.name)}
            </div>

            <div class="details">
              ${
                patient.age !== undefined && patient.age !== null
                  ? `<span>Age: <strong>${escapeHtml(patient.age)}</strong></span>`
                  : ''
              }

              ${
                patient.gender
                  ? `<span>Sex: <strong>${escapeHtml(patient.gender)}</strong></span>`
                  : ''
              }

              ${
                patient.phone
                  ? `<span>Phone: <strong>${escapeHtml(patient.phone)}</strong></span>`
                  : ''
              }
            </div>

            ${vitalsHtml}
          </div>

          <div class="date">
            <div class="label">Date</div>

            <div class="date-value">
              ${escapeHtml(formatDate(visit?.date))}
            </div>
          </div>

        </section>

        ${clinicalHtml}

        <section class="section">

          <div class="rx">
            <span class="rx-symbol">Rx</span>
            <span class="rx-label">Medicines</span>
            <span class="rx-line"></span>
          </div>

          ${medicinesHtml}

        </section>

        ${instructionsHtml}

        ${followUpHtml}

        <footer class="signature">

          <div class="signature-block">

            <div class="signature-space"></div>

            <div class="signature-name">
              ${escapeHtml(user.activeClinic.doctorName)}
            </div>

            <div class="signature-meta">
              ${escapeHtml(user.activeClinic.qualification)}
              <br />
              Reg. No: ${escapeHtml(user.activeClinic.regNo)}
            </div>

          </div>

        </footer>

      </main>
    </div>
  `;
}

const PDF_CSS = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #ffffff;
  color: #172B3D;
  font-family:
    Arial,
    "Noto Sans Devanagari",
    "Nirmala UI",
    sans-serif;
}

.paper {
  width: 794px;
  min-height: 1123px;
  padding: 0 42px 34px;
  background: #ffffff;
}

.letterhead {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  padding: 34px 0 22px;
}

.banner-image {
  display: block;
  width: 100%;
  max-height: 160px;
  object-fit: contain;
  object-position: left center;
}

.clinic {
  color: #163B54;
  font-size: 23px;
  font-weight: 750;
  line-height: 1.15;
}

.address {
  margin-top: 7px;
  max-width: 440px;
  color: #6C8393;
  font-size: 11px;
  line-height: 1.5;
}

.doctor {
  flex: 0 0 auto;
  color: #718896;
  font-size: 10px;
  line-height: 1.45;
  text-align: right;
}

.doctor-name {
  color: #163B54;
  font-size: 14px;
  font-weight: 750;
  margin-bottom: 3px;
}

.accent {
  height: 3px;
  background: #A8DCEB;
}

main {
  padding-top: 27px;
}

.patient {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  padding-bottom: 17px;
  border-bottom: 1px solid #DCE8EF;
}

.label {
  color: #7894A5;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.patient-name {
  margin-top: 6px;
  color: #132E43;
  font-size: 19px;
  font-weight: 750;
}

.details,
.vitals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  color: #607888;
  font-size: 10px;
}

.details {
  margin-top: 8px;
}

.vitals {
  padding-top: 11px;
}

strong {
  color: #294355;
}

.date {
  min-width: 145px;
  text-align: right;
}

.date-value {
  margin-top: 6px;
  color: #18344A;
  font-size: 12px;
  font-weight: 700;
}

.section {
  margin-top: 23px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
  color: #668396;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.section-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #D9E7EE;
}

.clinical-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 32px;
}

.value {
  color: #2C4557;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.rx {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
}

.rx-symbol {
  color: #1681A8;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 29px;
  font-weight: 700;
  font-style: italic;
}

.rx-label {
  color: #587488;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.rx-line {
  flex: 1;
  height: 1px;
  background: #CFE1EA;
}

.medicine-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid #D6E4EB;
}

.medicine-table th {
  padding: 8px;
  border: 1px solid #D6E4EB;
  background: #F5FAFC;
  color: #6E8797;
  font-size: 8px;
  font-weight: 800;
  text-align: left;
  text-transform: uppercase;
}

.medicine-table td {
  padding: 9px 8px;
  border: 1px solid #D6E4EB;
  color: #344D5E;
  font-size: 10px;
  line-height: 1.4;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.number {
  width: 32px;
  text-align: center;
}

.type {
  width: 62px;
}

.medicine {
  width: 126px;
  color: #17334A;
  font-weight: 750;
}

.schedule {
  width: 68px;
  white-space: nowrap;
}

.timing {
  width: 70px;
}

.quantity {
  width: 42px;
  text-align: center;
  font-weight: 750;
}

.notes {
  display: grid;
  gap: 10px;
}

.note {
  padding: 10px 12px;
  border-left: 3px solid #9DD7E8;
  background: #F7FBFD;
}

.follow {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 11px;
  border: 1px solid #CDE2EB;
  background: #F6FBFD;
  color: #284A5D;
  font-size: 10.5px;
  font-weight: 650;
}

.follow-label {
  color: #668394;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}

.signature {
  display: flex;
  justify-content: flex-end;
  margin-top: 38px;
  padding-top: 17px;
  border-top: 1px solid #DCE8EF;
}

.signature-block {
  min-width: 185px;
  text-align: center;
}

.signature-space {
  height: 30px;
}

.signature-name {
  color: #19354A;
  font-size: 11px;
  font-weight: 750;
}

.signature-meta {
  margin-top: 3px;
  color: #78909E;
  font-size: 8.5px;
  line-height: 1.45;
}
`;

async function generatePrescriptionPdf(
  user: User,
  patient: Patient,
): Promise<{ file: File; url: string }> {
  const host = document.createElement('div');

  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: '794px',
    background: '#fff',
    pointerEvents: 'none',
  });

  const style = document.createElement('style');
  style.textContent = PDF_CSS;

  host.appendChild(style);

  host.insertAdjacentHTML(
    'beforeend',
    buildPrescriptionHtml(user, patient),
  );

  document.body.appendChild(host);

  try {
    await document.fonts?.ready;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const paper = host.querySelector('.paper') as HTMLElement | null;

    if (!paper) {
      throw new Error('Could not prepare prescription PDF.');
    }

    const canvas = await html2canvas(paper, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;

    const pxPerPage = Math.floor(
      canvas.width *
      (pageHeight / pageWidth) *
      0.96,
    );

    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const remaining = canvas.height - sourceY;

      const sliceHeight = Math.min(
        pxPerPage,
        remaining,
      );

      const pageCanvas = document.createElement('canvas');

      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not create PDF canvas.');
      }

      ctx.fillStyle = '#ffffff';

      ctx.fillRect(
        0,
        0,
        pageCanvas.width,
        pageCanvas.height,
      );

      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      if (pageIndex > 0) {
        pdf.addPage();
      }

      const imageHeight =
        (sliceHeight / canvas.width) *
        pageWidth;

      pdf.addImage(
        pageCanvas.toDataURL('image/jpeg', 0.96),
        'JPEG',
        0,
        0,
        pageWidth,
        imageHeight,
        undefined,
        'FAST',
      );

      sourceY += sliceHeight;
      pageIndex += 1;
    }

    const blob = pdf.output('blob');

    const visitDate = patient.visits?.[0]?.date;

    const datePart = visitDate
      ? new Date(visitDate)
          .toISOString()
          .slice(0, 10)
      : new Date()
          .toISOString()
          .slice(0, 10);

    const fileName =
      `Prescription-${cleanFilePart(patient.name)}-${datePart}.pdf`;

    const file = new File(
      [blob],
      fileName,
      {
        type: 'application/pdf',
        lastModified: Date.now(),
      },
    );

    const url = URL.createObjectURL(blob);

    return {
      file,
      url,
    };
  } finally {
    host.remove();
  }
}

export async function sharePrescriptionPdf(
  user: User,
  patient: Patient,
) {
  const { file, url } =
    await generatePrescriptionPdf(
      user,
      patient,
    );

  try {

    /*
     * MOBILE / SUPPORTED BROWSERS
     *
     * If the browser supports sharing files,
     * the PDF can be handed directly to the
     * native share sheet.
     */
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({
        files: [file],
      })
    ) {
      await navigator.share({
        title: `Prescription - ${patient.name}`,
        text: `Prescription from ${user.activeClinic.name}`,
        files: [file],
      });

      return {
        shared: true,
        downloaded: false,
      };
    }

    /*
     * DESKTOP FALLBACK
     *
     * Chrome cannot attach a local PDF to
     * WhatsApp Web automatically.
     *
     * Therefore:
     * 1. Download the REAL PDF.
     * 2. Open WhatsApp.
     * 3. Use ONLY a short message.
     *
     * The doctor attaches the downloaded PDF.
     */

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download = file.name;

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    const rawPhone =
      (patient.phone || '')
        .replace(/\D/g, '');

    const phone =
      rawPhone.length === 10
        ? `91${rawPhone}`
        : rawPhone;

    if (phone) {
      const message =
        `Hello ${patient.name},\n\n` +
        `Your prescription from ` +
        `${user.activeClinic.name} ` +
        `is attached as a PDF.\n\n` +
        `Thank you.`;

      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }

    return {
      shared: false,
      downloaded: true,
    };

  } finally {
    window.setTimeout(
      () => URL.revokeObjectURL(url),
      10_000,
    );
  }
}