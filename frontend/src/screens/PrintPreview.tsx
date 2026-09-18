import type { User, Screen, Patient } from '../types';
import { MOCK_PATIENTS } from '../data';
import { Button, PageHeader } from '../components/ui';

interface PrintPreviewProps {
  user: User;
  patient?: Patient | null;
  onNavigate: (screen: Screen) => void;
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
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function hasValue(value?: string | number | null) {
  return value !== undefined && value !== null && String(value).trim() !== '';
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

export default function PrintPreview({
  user,
  patient,
  onNavigate,
}: PrintPreviewProps) {
  const p = patient ?? MOCK_PATIENTS[0];

  // The app/API keeps the newest visit at index 0.
  const visit = p.visits?.[0];
  const vitals = visit?.vitals;
  const medicines = visit?.medicines ?? [];

  const handlePrint = () => {
    // Keep the title neutral. Chrome's own print headers/footers are
    // controlled by the browser, not by React/CSS.
    const previousTitle = document.title;
    document.title = 'Prescription';

    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        document.title = previousTitle;
      }, 1000);
    }, 50);
  };

  return (
    <div className="prescription-page">
      <style>{`
        .prescription-page {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          padding: 28px 32px 48px;
          background: #EFF6FB;
          color: #172B3D;
        }

        .prescription-page *,
        .prescription-page *::before,
        .prescription-page *::after {
          box-sizing: border-box;
        }

        .screen-actions {
          width: min(794px, 100%);
          margin: 0 auto 18px;
        }

        /*
         * A4 document.
         * The screen preview has a very light blue surround, but the paper
         * itself stays white so it is economical and clean when printed.
         */
        .prescription-document {
          width: min(794px, 100%);
          margin: 0 auto;
          background: #FFFFFF;
          border: 1px solid #DCE8EF;
          border-radius: 12px;
          box-shadow: 0 12px 42px rgba(15, 33, 51, 0.12);
          overflow: hidden;
        }

        .prescription-letterhead {
          padding: 28px 42px 22px;
          background: #FFFFFF;
          border-bottom: 3px solid #8FD3E8;
        }

        .prescription-letterhead-main {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 28px;
        }

        .clinic-name {
          color: #163B54;
          font-size: 23px;
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -0.02em;
        }

        .clinic-address {
          margin-top: 7px;
          max-width: 440px;
          color: #6C8393;
          font-size: 11px;
          line-height: 1.5;
        }

        .doctor-block {
          flex: 0 0 auto;
          text-align: right;
        }

        .doctor-name {
          color: #163B54;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 750;
        }

        .doctor-meta {
          margin-top: 3px;
          color: #718896;
          font-size: 10px;
          line-height: 1.45;
        }

        .prescription-body {
          padding: 27px 42px 34px;
        }

        .patient-strip {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          padding-bottom: 17px;
          border-bottom: 1px solid #DCE8EF;
        }

        .patient-label,
        .visit-date-label,
        .clinical-item-label,
        .note-label {
          color: #7894A5;
          font-size: 9px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        .patient-name {
          margin-top: 6px;
          color: #132E43;
          font-size: 19px;
          line-height: 1.25;
          font-weight: 750;
        }

        .patient-details {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 18px;
          margin-top: 8px;
          color: #607888;
          font-size: 10px;
        }

        .patient-details strong,
        .vitals strong {
          color: #294355;
          font-weight: 700;
        }

        .visit-date {
          min-width: 145px;
          text-align: right;
        }

        .visit-date-value {
          margin-top: 6px;
          color: #18344A;
          font-size: 12px;
          font-weight: 700;
        }

        .vitals {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 18px;
          padding-top: 11px;
          color: #6A8291;
          font-size: 10px;
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
          line-height: 1;
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

        .clinical-item-label {
          margin-bottom: 5px;
          color: #8AA0AE;
          font-size: 8px;
        }

        .clinical-item-value {
          color: #2C4557;
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .rx-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 11px;
        }

        .rx-symbol {
          color: #1681A8;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 29px;
          line-height: 1;
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

        /*
         * Patient-first medicine table:
         * only the information needed to identify the medicine, take it
         * correctly, and know how much was prescribed.
         */
        .medicine-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #D6E4EB;
        }

        .medicine-table th {
          padding: 8px 8px;
          border: 1px solid #D6E4EB;
          background: #F5FAFC;
          color: #6E8797;
          font-size: 8px;
          line-height: 1.2;
          font-weight: 800;
          text-align: left;
          letter-spacing: .045em;
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

        .medicine-table .number {
          width: 32px;
          color: #8AA0AE;
          text-align: center;
        }

        .medicine-table .type {
          width: 62px;
          color: #5F7787;
        }

        .medicine-table .medicine {
          width: 126px;
          color: #17334A;
          font-size: 11px;
          font-weight: 750;
        }

        .medicine-table .instructions {
          width: auto;
        }

        .medicine-table .schedule {
          width: 68px;
          color: #476476;
          white-space: nowrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 9px;
          font-weight: 650;
        }

        .medicine-table .timing {
          width: 76px;
        }

        .medicine-table .quantity {
          width: 42px;
          text-align: center;
          font-weight: 750;
        }

        .empty-medicines {
          padding: 16px;
          border: 1px dashed #C9DCE6;
          color: #718897;
          font-size: 10px;
          text-align: center;
        }

        .notes {
          display: grid;
          gap: 10px;
        }

        .note-block {
          padding: 10px 12px;
          border-left: 3px solid #9DD7E8;
          border-radius: 0 7px 7px 0;
          background: #F7FBFD;
        }

        .note-label {
          margin-bottom: 4px;
          color: #7894A5;
          font-size: 8px;
        }

        .note-value {
          color: #294354;
          font-size: 10.5px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .follow-up {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 11px;
          border: 1px solid #CDE2EB;
          border-radius: 7px;
          background: #F6FBFD;
          color: #284A5D;
          font-size: 10.5px;
          font-weight: 650;
        }

        .follow-up-label {
          color: #668394;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .06em;
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

        @media (max-width: 760px) {
          .prescription-page {
            padding: 18px 10px 30px;
          }

          .prescription-letterhead {
            padding: 22px 22px 18px;
          }

          .prescription-body {
            padding: 22px 22px 28px;
          }

          .patient-strip,
          .clinical-grid {
            grid-template-columns: 1fr;
          }

          .visit-date {
            min-width: 0;
            text-align: left;
          }

          .medicine-scroll {
            overflow-x: auto;
          }

          .medicine-table {
            min-width: 650px;
          }
        }

        /*
         * PRINT MODE
         *
         * The application shell is removed from the printed document.
         * The paper itself is white with only a soft blue line for branding.
         */
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body,
          #root {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /*
           * Only the prescription root is allowed to participate in print.
           * This prevents sidebar/app containers from leaking into print.
           */
          body * {
            visibility: hidden !important;
          }

          .prescription-page,
          .prescription-page * {
            visibility: visible !important;
          }

          .prescription-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }

          .no-print,
          .screen-actions {
            display: none !important;
          }

          .prescription-document {
            width: 100% !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .prescription-letterhead {
            padding: 5mm 0 4mm !important;
            background: #fff !important;
            border-bottom: 1.2mm solid #B9DFEA !important;
          }

          .prescription-body {
            padding: 6mm 0 0 !important;
          }

          .section {
            margin-top: 5mm;
          }

          .medicine-table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          .medicine-table th,
          .medicine-table td {
            padding: 2.4mm 2mm !important;
          }

          .medicine-table thead {
            display: table-header-group;
          }

          .medicine-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .patient-strip,
          .clinical-grid,
          .rx-heading,
          .section-title,
          .note-block,
          .follow-up,
          .signature {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .signature {
            margin-top: 8mm;
            padding-top: 4mm;
          }
        }
      `}</style>

      <div className="screen-actions no-print">
        <PageHeader
          title="Prescription Print Preview"
          subtitle="Patient-ready A4 prescription"
          actions={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => onNavigate('add-patient')}
              >
                ← Back to Edit
              </Button>

              <Button
                variant="success"
                onClick={handlePrint}
                icon={
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5h-2M6 14h12v8H6z" />
                  </svg>
                }
              >
                Print
              </Button>
            </div>
          }
        />
      </div>

      <article
        className="prescription-document"
        aria-label="Patient prescription"
      >
        <header className="prescription-letterhead">
          <div className="prescription-letterhead-main">
            <div>
              <div className="clinic-name">
                {user.activeClinic.name}
              </div>

              <div className="clinic-address">
                {user.activeClinic.address}
              </div>
            </div>

            <div className="doctor-block">
              <div className="doctor-name">
                {user.activeClinic.doctorName}
              </div>

              <div className="doctor-meta">
                {user.activeClinic.qualification}
              </div>

              <div className="doctor-meta">
                Reg. No: {user.activeClinic.regNo}
              </div>
            </div>
          </div>
        </header>

        <main className="prescription-body">
          <section className="patient-strip">
            <div>
              <div className="patient-label">Patient</div>

              <div className="patient-name">
                {p.name}
              </div>

              <div className="patient-details">
                {hasValue(p.age) && (
                  <span>
                    Age: <strong>{p.age}</strong>
                  </span>
                )}

                {hasValue(p.gender) && (
                  <span>
                    Sex: <strong>{p.gender}</strong>
                  </span>
                )}

                {hasValue(p.phone) && (
                  <span>
                    Phone: <strong>{p.phone}</strong>
                  </span>
                )}
              </div>

              {visit && vitals && (
                <div className="vitals">
                  {hasValue(vitals.bp) && (
                    <span>
                      BP <strong>{vitals.bp} mmHg</strong>
                    </span>
                  )}

                  {hasValue(vitals.pulse) && (
                    <span>
                      Pulse <strong>{vitals.pulse} bpm</strong>
                    </span>
                  )}

                  {hasValue(vitals.spo2) && (
                    <span>
                      SpO₂ <strong>{vitals.spo2}%</strong>
                    </span>
                  )}

                  {hasValue(vitals.weight) && (
                    <span>
                      Weight <strong>{vitals.weight} kg</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="visit-date">
              <div className="visit-date-label">Date</div>
              <div className="visit-date-value">
                {formatDate(visit?.date)}
              </div>
            </div>
          </section>

          {visit ? (
            <>
              {(hasValue(visit.complaints) ||
                hasValue(visit.diagnosis)) && (
                <section className="section">
                  <div className="section-title">
                    Clinical Summary
                  </div>

                  <div className="clinical-grid">
                    {hasValue(visit.complaints) && (
                      <div>
                        <div className="clinical-item-label">
                          Chief Complaints
                        </div>
                        <div className="clinical-item-value">
                          {visit.complaints}
                        </div>
                      </div>
                    )}

                    {hasValue(visit.diagnosis) && (
                      <div>
                        <div className="clinical-item-label">
                          Diagnosis
                        </div>
                        <div className="clinical-item-value">
                          {visit.diagnosis}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section className="section">
                <div className="rx-heading">
                  <span className="rx-symbol">Rx</span>
                  <span className="rx-label">Medicines</span>
                  <span className="rx-line" />
                </div>

                {medicines.length > 0 ? (
                  <div className="medicine-scroll">
                    <table className="medicine-table">
                      <thead>
                        <tr>
                          <th className="number">#</th>
                          <th className="type">Type</th>
                          <th className="medicine">Medicine</th>
                          <th className="instructions">
                            Instructions
                          </th>
                          <th className="schedule">M / A / N</th>
                          <th className="timing">Food</th>
                          <th className="quantity">Qty</th>
                        </tr>
                      </thead>

                      <tbody>
                        {medicines.map((m, i) => (
                          <tr key={m.id}>
                            <td className="number">{i + 1}</td>
                            <td className="type">{m.type}</td>
                            <td className="medicine">{m.name}</td>
                            <td className="instructions">
                              {m.instructions}
                            </td>
                            <td className="schedule">
                              {dosageFor(m)}
                            </td>
                            <td className="timing">
                              {m.timing}
                            </td>
                            <td className="quantity">
                              {m.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-medicines">
                    No medicines prescribed for this visit.
                  </div>
                )}
              </section>

              {(hasValue(visit.suggestions) ||
                hasValue(visit.investigations)) && (
                <section className="section">
                  <div className="section-title">Instructions</div>

                  <div className="notes">
                    {hasValue(visit.suggestions) && (
                      <div className="note-block">
                        <div className="note-label">Advice</div>
                        <div className="note-value">
                          {visit.suggestions}
                        </div>
                      </div>
                    )}

                    {hasValue(visit.investigations) && (
                      <div className="note-block">
                        <div className="note-label">
                          Investigations
                        </div>
                        <div className="note-value">
                          {visit.investigations}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {visit.followUp && (
                <section className="section">
                  <div className="section-title">Follow-up</div>

                  <div className="follow-up">
                    <span className="follow-up-label">Return</span>
                    <span>
                      After {visit.followUp} {visit.followUpUnit}
                    </span>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="empty-medicines" style={{ marginTop: 28 }}>
              No visit information is available for this patient.
            </div>
          )}

          <footer className="signature">
            <div className="signature-block">
              <div className="signature-space" />

              <div className="signature-name">
                {user.activeClinic.doctorName}
              </div>

              <div className="signature-meta">
                {user.activeClinic.qualification}
                <br />
                Reg. No: {user.activeClinic.regNo}
              </div>
            </div>
          </footer>
        </main>
      </article>
    </div>
  );
}
