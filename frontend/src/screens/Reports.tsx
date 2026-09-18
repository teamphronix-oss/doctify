import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { getMonthlyReport, type MonthlyReportData } from '../api/client';
import { Card, PageHeader } from '../components/ui';

type ReportMode = 'monthly' | 'weekly' | 'custom' | 'yearly';

type ReportKind =
  | 'patients'
  | 'illness'
  | 'cash'
  | 'fitness'
  | 'reference';

type ReportDefinition = {
  kind: ReportKind;
  title: string;
  description: string;
  icon: string;
  accent: string;
};

const REPORTS: ReportDefinition[] = [
  {
    kind: 'patients',
    title: 'Patient Report',
    description: 'Patients who visited during the selected period',
    icon: '👤',
    accent: '#169BD5',
  },
  {
    kind: 'illness',
    title: 'Illness Certificate Report',
    description: 'Patients who received illness certificates',
    icon: '🩺',
    accent: '#D97706',
  },
  {
    kind: 'cash',
    title: 'Cash Receipt Report',
    description: 'Cash receipts recorded during the selected period',
    icon: '🧾',
    accent: '#16A34A',
  },
  {
    kind: 'fitness',
    title: 'Fitness Certificate Report',
    description: 'Patients who received fitness certificates',
    icon: '📋',
    accent: '#7C3AED',
  },
  {
    kind: 'reference',
    title: 'Reference Letter Report',
    description: 'Reference letters created during the selected period',
    icon: '📨',
    accent: '#DB2777',
  },
];

const today = () => new Date();

function localDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function firstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

function formatDate(value: string) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPeriod(from: string, to: string) {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function monthLabel(value: string) {
  if (!value) return '';
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function fileSafe(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function reportRows(kind: ReportKind, data: MonthlyReportData) {
  switch (kind) {
    case 'patients':
      return {
        headers: ['Sr. No.', 'Patient ID', 'Patient Name', 'Phone', 'Age', 'Gender', 'Visit Date', 'Visit Type'],
        rows: data.patientReport.map((r, i) => [
          i + 1,
          r.patientId,
          r.patientName,
          r.phone || '—',
          r.age || '—',
          r.gender || '—',
          formatDate(r.date),
          r.visitType,
        ]),
      };

    case 'illness':
      return {
        headers: ['Sr. No.', 'Patient Name', 'Age', 'Gender', 'Examination Date', 'Diagnosis', 'From', 'To', 'Resume Date'],
        rows: data.illnessReport.map((r, i) => [
          i + 1,
          r.patientName,
          r.age || '—',
          r.gender || '—',
          formatDate(r.examinationDate),
          r.diagnosis || '—',
          formatDate(r.startDate),
          formatDate(r.endDate),
          r.resumeDate ? formatDate(r.resumeDate) : '—',
        ]),
      };

    case 'cash':
      return {
        headers: ['Sr. No.', 'Receipt No.', 'Patient Name', 'Date', 'Description', 'Amount (₹)'],
        rows: data.cashReceiptReport.map((r, i) => [
          i + 1,
          r.receiptNo,
          r.patientName,
          formatDate(r.date),
          r.description || '—',
          `₹${Number(r.amount || 0).toLocaleString('en-IN')}`,
        ]),
      };

    case 'fitness':
      return {
        headers: ['Sr. No.', 'Patient Name', 'Age', 'Gender', 'Examination Date', 'Fitness Type'],
        rows: data.fitnessReport.map((r, i) => [
          i + 1,
          r.patientName,
          r.age || '—',
          r.gender || '—',
          formatDate(r.examinationDate),
          r.fitnessType || '—',
        ]),
      };

    case 'reference':
      return {
        headers: ['Sr. No.', 'Patient Name', 'Date', 'Referred To', 'Reason', 'Urgency'],
        rows: data.referenceLetterReport.map((r, i) => [
          i + 1,
          r.patientName,
          formatDate(r.date),
          r.referredTo || '—',
          r.reason || '—',
          r.urgency || 'Routine',
        ]),
      };
  }
}

function filePeriod(from: string, to: string) {
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return monthLabel(from.slice(0, 7)).replace(/ /g, '_');
  }
  return `${from}_to_${to}`;
}



export default function Reports() {
  const now = today();
  const [mode, setMode] = useState<ReportMode>('monthly');
  const [month, setMonth] = useState(monthString(now));
  const [weekDate, setWeekDate] = useState(localDateString(now));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = useState(localDateString(firstDayOfMonth(now)));
  const [customTo, setCustomTo] = useState(localDateString(lastDayOfMonth(now)));
  const [data, setData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    if (mode === 'monthly') {
      const [y, m] = month.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return { from: localDateString(firstDayOfMonth(d)), to: localDateString(lastDayOfMonth(d)) };
    }
    if (mode === 'weekly') {
      const d = new Date(`${weekDate}T12:00:00`);
      return { from: localDateString(startOfWeek(d)), to: localDateString(endOfWeek(d)) };
    }
    if (mode === 'yearly') return { from: `${year}-01-01`, to: `${year}-12-31` };
    return { from: customFrom, to: customTo };
  }, [mode, month, weekDate, year, customFrom, customTo]);

  const loadReport = useCallback(async () => {
    if (!period.from || !period.to || period.from > period.to) {
      setError('Please choose a valid report period.');
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getMonthlyReport(period.from, period.to));
    } catch (err) {
      console.error(err);
      setData(null);
      setError('Could not load the report. Please check the backend.');
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  const downloadPdf = async (definition: ReportDefinition) => {
    if (!data) return;
    setExporting(`pdf-${definition.kind}`);
    try {
      const { jsPDF } = await import('jspdf');
      const module = await import('jspdf-autotable');
      const autoTable = module.default ?? module.autoTable;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const rows = reportRows(definition.kind, data);
      addPdfHeader(doc, definition.title, period.from, period.to);
      autoTable(doc, {
        startY: 49, head: [rows.headers], body: rows.rows, theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: [25,43,60], lineColor: [220,230,237], lineWidth: 0.2 },
        headStyles: { fillColor: [22,155,213], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247,251,253] }, margin: { left: 15, right: 15, bottom: 15 },
      });
      doc.save(`Doctify_${fileSafe(definition.title)}_${filePeriod(period.from, period.to)}.pdf`);
    } catch (err) {
      console.error(err); setError('PDF export failed. Please try again.');
    } finally { setExporting(null); }
  };

  const downloadExcel = async (definition: ReportDefinition) => {
    if (!data) return;
    setExporting(`excel-${definition.kind}`);
    try {
      const XLSX = await import('xlsx');
      const rows = reportRows(definition.kind, data);
      const sheetData = [['DOCTIFY'], [definition.title], [`Period: ${formatPeriod(period.from, period.to)}`], [], rows.headers, ...rows.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      worksheet['!cols'] = rows.headers.map((header) => ({ wch: Math.min(Math.max(header.length + 4, 14), 30) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, definition.title.slice(0, 31));
      XLSX.writeFile(workbook, `Doctify_${fileSafe(definition.title)}_${filePeriod(period.from, period.to)}.xlsx`);
    } catch (err) {
      console.error(err); setError('Excel export failed. Please try again.');
    } finally { setExporting(null); }
  };

  const printReport = (definition: ReportDefinition) => {
    if (!data) return;
    const rows = reportRows(definition.kind, data);
    const htmlRows = rows.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    openPrintWindow(definition.title, period.from, period.to, rows.headers, htmlRows);
  };

  const fullSections = data ? REPORTS.map((definition) => ({ title: definition.title, ...reportRows(definition.kind, data) })) : [];

  const downloadFullExcel = async () => {
    if (!data) return;
    setExporting('full-excel');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      fullSections.forEach((section) => {
        const sheetData = [['DOCTIFY'], [section.title], [`Period: ${formatPeriod(period.from, period.to)}`], [], section.headers, ...section.rows];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        worksheet['!cols'] = section.headers.map((header) => ({ wch: Math.min(Math.max(header.length + 4, 14), 30) }));
        XLSX.utils.book_append_sheet(workbook, worksheet, section.title.slice(0, 31));
      });
      XLSX.writeFile(workbook, `Doctify_Full_Report_${filePeriod(period.from, period.to)}.xlsx`);
    } catch (err) {
      console.error(err); setError('Full Excel export failed. Please try again.');
    } finally { setExporting(null); }
  };

  const downloadFullPdf = async () => {
    if (!data) return;
    setExporting('full-pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const module = await import('jspdf-autotable');
      const autoTable = module.default ?? module.autoTable;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      fullSections.forEach((section, index) => {
        if (index) doc.addPage();
        addPdfHeader(doc, section.title, period.from, period.to);
        autoTable(doc, {
          startY: 49, head: [section.headers], body: section.rows, theme: 'grid',
          styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: [25,43,60], lineColor: [220,230,237], lineWidth: 0.2 },
          headStyles: { fillColor: [22,155,213], textColor: [255,255,255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [247,251,253] }, margin: { left: 15, right: 15, bottom: 15 },
        });
      });
      doc.save(`Doctify_Full_Report_${filePeriod(period.from, period.to)}.pdf`);
    } catch (err) {
      console.error(err); setError('Full PDF export failed. Please try again.');
    } finally { setExporting(null); }
  };

  const printFullReport = () => {
    if (!data) return;
    const html = fullSections.map((section, index) => `
      <section class="report-section">
        <h2>${escapeHtml(section.title)}</h2>
        <table><thead><tr>${section.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${section.rows.length ? section.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${section.headers.length}">No records found.</td></tr>`}</tbody></table>
        ${index < fullSections.length - 1 ? '<div class="page-break"></div>' : ''}
      </section>`).join('');
    openPrintWindow('Full Clinic Report', period.from, period.to, [], '', html);
  };

  return (
    <div className="reports-page flex flex-col h-full overflow-y-auto" style={pageStyle}>
      <style>{`
        .reports-period-card { overflow: hidden; }
        .reports-period-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; }
        .reports-period-heading { flex: 1 1 420px; min-width: 0; }
        .reports-period-body { padding: 22px 24px 24px; }
        .reports-duration-label { margin-bottom: 8px; }
        .reports-duration-tabs { display: flex; flex-wrap: wrap; width: fit-content; max-width: 100%; }
        .reports-selector { width: 100%; max-width: 360px; margin-top: 18px; }
        .reports-custom-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 300px)); gap: 14px; max-width: 620px; margin-top: 18px; }
        .reports-selected-period { margin-top: 18px; }
        .reports-full-card { display: flex; align-items: center; justify-content: space-between; gap: 22px; }
        .reports-full-copy { min-width: 0; }
        .reports-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .reports-individual-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .reports-name { min-width: 0; }

        @media (max-width: 900px) {
          .reports-page { padding: 22px 20px 36px !important; }
          .reports-period-header { flex-direction: column; gap: 16px; }
          .reports-period-heading { flex-basis: auto; width: 100%; }
          .reports-period-body { padding: 20px; }
          .reports-full-card { align-items: flex-start; flex-direction: column; }
          .reports-full-card .reports-actions { width: 100%; justify-content: flex-end; }
          .reports-individual-row { align-items: flex-start; flex-direction: column; }
          .reports-individual-row .reports-actions { width: 100%; justify-content: flex-end; }
        }

        @media (max-width: 620px) {
          .reports-page { padding: 16px 14px 28px !important; }
          .reports-period-body { padding: 18px 16px 20px; }
          .reports-duration-tabs { width: 100%; }
          .reports-duration-tabs button { flex: 1 1 45%; min-width: 120px; }
          .reports-selector { max-width: none; }
          .reports-custom-grid { grid-template-columns: 1fr; max-width: none; }
          .reports-full-card .reports-actions,
          .reports-individual-row .reports-actions { justify-content: stretch; }
          .reports-actions button { flex: 1 1 0; min-width: 0 !important; padding-left: 8px !important; padding-right: 8px !important; }
        }

        @media (max-width: 420px) {
          .reports-duration-tabs button { flex: 1 1 100%; }
          .reports-actions { gap: 6px; }
        }
      `}</style>

      <PageHeader
        title="Reports & Export"
        subtitle="Select a period and export clinic reports as PDF, Excel or Print"
        actions={<button type="button" onClick={() => void loadReport()} disabled={loading} style={refreshButtonStyle}>{loading ? 'Loading…' : '↻ Refresh'}</button>}
      />

      {error && (
        <div style={errorStyle} role="alert">
          {error}
        </div>
      )}

      {/* REPORT PERIOD */}
      <Card style={sectionCardStyle}>
        <div className="reports-period-header" style={periodHeaderStyle}>
          <div className="reports-period-heading">
            <div style={eyebrowStyle}>📅 Report Period</div>
            <div style={sectionTitleStyle}>Select the period for your reports</div>
            <div style={sectionSubtitleStyle}>Choose a month, week, year, or custom date range. Every report will use this same period.</div>
          </div>
        </div>

        <div className="reports-period-body" style={periodBodyStyle}>
          <div className="reports-duration-label" style={fieldLabelStyle}>Report Duration</div>
          <div className="reports-duration-tabs" style={modeGroupStyle}>
            {[
              ['monthly', 'Monthly'],
              ['weekly', 'Weekly'],
              ['custom', 'Custom Range'],
              ['yearly', 'Yearly'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value as ReportMode)}
                aria-pressed={mode === value}
                style={{ ...modeButtonStyle, ...(mode === value ? activeModeButtonStyle : {}) }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'monthly' && (
            <div className="reports-selector" style={selectorWrapStyle}>
              <label style={labelStyle}>Select Month</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
            </div>
          )}

          {mode === 'weekly' && (
            <div className="reports-selector" style={selectorWrapStyle}>
              <label style={labelStyle}>Choose any day in the week</label>
              <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} style={inputStyle} />
            </div>
          )}

          {mode === 'yearly' && (
            <div className="reports-selector" style={selectorWrapStyle}>
              <label style={labelStyle}>Select Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle}>
                {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {mode === 'custom' && (
            <div className="reports-custom-grid" style={customGridStyle}>
              <div>
                <label style={labelStyle}>From</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}

          <div className="reports-selected-period" style={selectedPeriodStyle}>
            <span style={selectedPeriodCheckStyle}>✓</span>
            <span>
              <span style={selectedPeriodLabelStyle}>Selected period</span>
              <strong>{period.from && period.to ? formatPeriod(period.from, period.to) : 'Select a valid period'}</strong>
            </span>
            {loading && <span style={updatingStyle}>Updating…</span>}
          </div>
        </div>
      </Card>

      {/* FULL REPORT */}
      <Card style={fullReportCardStyle}>
        <div className="reports-full-card">
          <div className="reports-full-copy" style={fullReportCopyStyle}>
            <div style={fullReportIconStyle}>📊</div>
            <div>
              <div style={fullReportTitleStyle}>Full Report — All Clinic Data</div>
              <div style={fullReportDescriptionStyle}>All five report sections for the selected period in one complete report.</div>
            </div>
          </div>
          <div className="reports-actions" style={buttonGroupStyle}>
            <ExportButton label="Print" icon="🖨" onClick={printFullReport} disabled={!data || loading} />
            <ExportButton label="PDF" icon="↓" tone="pdf" onClick={() => void downloadFullPdf()} disabled={!data || loading || exporting === 'full-pdf'} busy={exporting === 'full-pdf'} />
            <ExportButton label="Excel" icon="▣" tone="excel" onClick={() => void downloadFullExcel()} disabled={!data || loading || exporting === 'full-excel'} busy={exporting === 'full-excel'} />
          </div>
        </div>
      </Card>

      <Card style={individualCardStyle}>
        <div style={individualHeaderStyle}>
          <div style={individualTitleStyle}>Individual Reports</div>
          <div style={individualSubtitleStyle}>Separate downloadable report for each clinic section</div>
        </div>

        <div style={{ display: 'grid', gap: 9 }}>
          {REPORTS.map((definition) => (
            <div
              key={definition.kind}
              className="reports-individual-row"
              style={{ ...reportRowStyle, borderColor: `${definition.accent}28` }}
            >
              <div className="reports-name" style={reportNameWrapStyle}>
                <div style={{ ...reportIconStyle, background: `${definition.accent}10`, borderColor: `${definition.accent}24` }}>
                  {definition.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={reportNameStyle}>{definition.title}</div>
                  <div style={reportDescriptionStyle}>{definition.description}</div>
                </div>
              </div>

              <div className="reports-actions" style={buttonGroupStyle}>
                <ExportButton label="Print" icon="🖨" onClick={() => printReport(definition)} disabled={!data || loading} />
                <ExportButton label="PDF" icon="↓" tone="pdf" onClick={() => void downloadPdf(definition)} disabled={!data || loading || exporting === `pdf-${definition.kind}`} busy={exporting === `pdf-${definition.kind}`} />
                <ExportButton label="Excel" icon="▣" tone="excel" onClick={() => void downloadExcel(definition)} disabled={!data || loading || exporting === `excel-${definition.kind}`} busy={exporting === `excel-${definition.kind}`} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={footerNoteStyle}>The page is a report generator only. Report records are included in the PDF, Excel or printed output.</div>
    </div>
  );
}

function ExportButton({ label, icon, tone = 'default', onClick, disabled, busy = false }: { label: string; icon: string; tone?: 'default' | 'pdf' | 'excel'; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  const toneStyle = tone === 'pdf' ? pdfButtonStyle : tone === 'excel' ? excelButtonStyle : printButtonStyle;
  return <button type="button" onClick={onClick} disabled={disabled} style={{ ...exportButtonBaseStyle, ...toneStyle, ...(disabled ? disabledButtonStyle : {}) }}><span>{busy ? '…' : icon}</span><span>{busy ? 'Preparing' : label}</span></button>;
}

function addPdfHeader(doc: any, title: string, from: string, to: string) {
  doc.setFillColor(15, 63, 93); doc.rect(0, 0, 297, 26, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('DOCTIFY', 15, 11);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('Clinic Records & Reports', 15, 18);
  doc.setTextColor(25, 43, 60); doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(title, 15, 37);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 100, 115); doc.text(`Period: ${formatPeriod(from, to)}`, 15, 44);
}

function openPrintWindow(title: string, from: string, to: string, headers: string[], htmlRows: string, customBody?: string) {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) { window.alert('Please allow pop-ups to print the report.'); return; }
  const body = customBody ?? `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${htmlRows || `<tr><td colspan="${headers.length}">No records found for this period.</td></tr>`}</tbody></table>`;
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#192b3c;margin:0}.brand{border-bottom:3px solid #169bd5;padding-bottom:10px;margin-bottom:18px}.brand-name{font-size:22px;font-weight:800;letter-spacing:.5px}.brand-sub{color:#64788a;font-size:12px;margin-top:3px}h1{font-size:19px;margin:0 0 6px}h2{font-size:16px;margin:0 0 10px}.meta{color:#5a7080;font-size:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#0f3f5d;color:#fff;text-align:left;padding:8px;border:1px solid #0f3f5d}td{padding:7px 8px;border:1px solid #dbe6ed;vertical-align:top}tbody tr:nth-child(even){background:#f6fafc}.footer{margin-top:14px;color:#7a8d9c;font-size:9px;text-align:right}.report-section{margin-top:20px}.page-break{break-after:page;page-break-after:always}</style></head><body><div class="brand"><div class="brand-name">DOCTIFY</div><div class="brand-sub">Clinic Records & Reports</div></div><h1>${escapeHtml(title)}</h1><div class="meta">Period: ${escapeHtml(formatPeriod(from,to))}</div>${body}<div class="footer">Generated from Doctify</div></body></html>`);
  printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflowY: 'auto',
  padding: '28px 32px 44px',
  background: 'linear-gradient(180deg, #F2F9FC 0%, #F8FBFD 45%, #FFFFFF 100%)',
  boxSizing: 'border-box',
};

const sectionCardStyle: CSSProperties = {
  overflow: 'hidden',
  border: '1px solid #D5E7EF',
  borderRadius: 14,
  boxShadow: '0 7px 22px rgba(20, 83, 112, 0.045)',
  marginBottom: 18,
  background: '#FFFFFF',
};

const periodHeaderStyle: CSSProperties = {
  padding: '22px 24px 19px',
  background: 'linear-gradient(135deg, #EAF8FC 0%, #F8FCFE 60%, #FFFFFF 100%)',
  borderBottom: '1px solid #E1EEF4',
};

const periodBodyStyle: CSSProperties = {
  padding: '20px 24px 23px',
  background: '#FFFFFF',
};

const eyebrowStyle: CSSProperties = {
  color: '#168FCA',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '.075em',
  textTransform: 'uppercase',
  marginBottom: 7,
};

const sectionTitleStyle: CSSProperties = {
  color: '#17354A',
  fontSize: 19,
  lineHeight: 1.3,
  fontWeight: 800,
};

const sectionSubtitleStyle: CSSProperties = {
  color: '#6B8291',
  fontSize: 12.5,
  lineHeight: 1.55,
  marginTop: 5,
  maxWidth: 680,
};

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  color: '#506B7B',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '.025em',
};

const modeGroupStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  background: '#F0F5F8',
  padding: 4,
  borderRadius: 10,
  width: 'fit-content',
  maxWidth: '100%',
};

const modeButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  minHeight: 38,
  fontSize: 12.5,
  fontWeight: 750,
  cursor: 'pointer',
  background: 'transparent',
  color: '#657B89',
  whiteSpace: 'nowrap',
};

const activeModeButtonStyle: CSSProperties = {
  background: '#FFFFFF',
  color: '#0F4B69',
  boxShadow: '0 2px 8px rgba(15, 63, 93, .10)',
};

const selectorWrapStyle: CSSProperties = {
  width: '100%',
  maxWidth: 360,
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  color: '#4A6474',
  fontSize: 11.5,
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 9,
  border: '1px solid #BFD5E0',
  background: '#FFFFFF',
  color: '#18384D',
  padding: '0 12px',
  fontSize: 13.5,
  fontWeight: 700,
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const customGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 300px))',
  gap: 14,
  maxWidth: 620,
};

const selectedPeriodStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 9,
  width: 'fit-content',
  maxWidth: '100%',
  padding: '9px 13px',
  borderRadius: 9,
  background: '#F4FAFC',
  border: '1px solid #DCECF2',
  color: '#315C73',
  fontSize: 12,
  lineHeight: 1.4,
  boxSizing: 'border-box',
};

const selectedPeriodCheckStyle: CSSProperties = {
  width: 22,
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  borderRadius: '50%',
  background: '#E4F5FA',
  color: '#138BBE',
  fontWeight: 900,
};

const selectedPeriodLabelStyle: CSSProperties = {
  display: 'block',
  color: '#7A909D',
  fontSize: 10,
  fontWeight: 700,
  marginBottom: 1,
};

const updatingStyle: CSSProperties = {
  color: '#718996',
  fontWeight: 700,
  fontSize: 11,
};

const refreshButtonStyle: CSSProperties = {
  border: '1px solid #C9DFEB',
  background: '#FFFFFF',
  color: '#173D55',
  borderRadius: 9,
  padding: '9px 15px',
  minHeight: 38,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const errorStyle: CSSProperties = {
  marginBottom: 18,
  border: '1px solid #F1CACA',
  background: '#FFF6F6',
  color: '#B42318',
  borderRadius: 10,
  padding: '12px 15px',
  fontSize: 13,
  fontWeight: 600,
};

const fullReportCardStyle: CSSProperties = {
  padding: '18px 20px',
  marginBottom: 18,
  border: '1px solid #BFE8E8',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #F0FFFF 0%, #FBFEFE 100%)',
  boxShadow: '0 6px 20px rgba(17, 105, 110, .045)',
};

const fullReportCopyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  minWidth: 0,
};

const fullReportIconStyle: CSSProperties = {
  width: 44,
  height: 44,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 11,
  background: '#FFFFFF',
  border: '1px solid #CBEAEA',
  fontSize: 20,
};

const fullReportTitleStyle: CSSProperties = {
  color: '#173A4A',
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.3,
};

const fullReportDescriptionStyle: CSSProperties = {
  color: '#66808C',
  fontSize: 12,
  lineHeight: 1.45,
  marginTop: 3,
};

const individualCardStyle: CSSProperties = {
  padding: '21px 20px 22px',
  border: '1px solid #D8E7EE',
  borderRadius: 14,
  boxShadow: '0 7px 22px rgba(18, 65, 88, .035)',
  background: '#FFFFFF',
};

const individualHeaderStyle: CSSProperties = {
  marginBottom: 15,
  paddingBottom: 13,
  borderBottom: '1px solid #E5EEF3',
};

const individualTitleStyle: CSSProperties = {
  color: '#263D4D',
  fontSize: 17,
  fontWeight: 800,
};

const individualSubtitleStyle: CSSProperties = {
  color: '#7B8E9A',
  fontSize: 12,
  marginTop: 3,
};

const reportRowStyle: CSSProperties = {
  minHeight: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 18,
  padding: '9px 12px',
  border: '1px solid',
  borderRadius: 10,
  background: '#FBFDFF',
  boxSizing: 'border-box',
};

const reportNameWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  minWidth: 0,
};

const reportIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 9,
  border: '1px solid',
  fontSize: 17,
};

const reportNameStyle: CSSProperties = {
  color: '#243B4C',
  fontSize: 13.5,
  lineHeight: 1.25,
  fontWeight: 750,
};

const reportDescriptionStyle: CSSProperties = {
  color: '#7A8E9E',
  fontSize: 11.2,
  lineHeight: 1.35,
  marginTop: 2,
};

const buttonGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  flexShrink: 0,
};

const exportButtonBaseStyle: CSSProperties = {
  minWidth: 68,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  borderRadius: 8,
  padding: '0 10px',
  fontSize: 11.5,
  fontWeight: 800,
  cursor: 'pointer',
};

const printButtonStyle: CSSProperties = {
  border: '1px solid #D2DEE5',
  background: '#FFFFFF',
  color: '#3E5667',
};

const pdfButtonStyle: CSSProperties = {
  border: '1px solid #F0C8C8',
  background: '#FFF3F3',
  color: '#C62828',
};

const excelButtonStyle: CSSProperties = {
  border: '1px solid #BDE5CB',
  background: '#EFFBF3',
  color: '#16803C',
};

const disabledButtonStyle: CSSProperties = {
  opacity: .55,
  cursor: 'not-allowed',
};

const footerNoteStyle: CSSProperties = {
  padding: '12px 3px 0',
  color: '#8496A3',
  fontSize: 11.2,
  lineHeight: 1.5,
};

