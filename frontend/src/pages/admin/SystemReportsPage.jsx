import { useMemo, useState } from 'react'
import { Download, FileBarChart, Search } from 'lucide-react'
import { AdminMetric, AdminPageHeader, AdminPanel, DemoNotice, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const DEMO_REPORTS = [
  { id: 'RPT-1024', name: 'Daily response summary', category: 'Operations', date: 'Today, 09:00', status: 'Ready' },
  { id: 'RPT-1023', name: 'Relief centre occupancy', category: 'Shelter', date: 'Today, 08:30', status: 'Ready' },
  { id: 'RPT-1022', name: 'Partner activity report', category: 'Coordination', date: 'Yesterday, 18:00', status: 'Ready' },
]

function downloadReport() {
  const rows = [
    ['Report ID', 'Report name', 'Category', 'Generated', 'Status'],
    ...DEMO_REPORTS.map(({ id, name, category, date, status }) => [id, name, category, date, status]),
  ]
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'sankat-saathi-demo-reports.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export default function SystemReportsPage() {
  const [query, setQuery] = useState('')
  const reports = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value
      ? DEMO_REPORTS.filter((report) => [report.id, report.name, report.category].some((field) => field.toLowerCase().includes(value)))
      : DEMO_REPORTS
  }, [query])

  return (
    <>
      <AdminPageHeader
        title="System reports"
        subtitle="Review operational summaries and export a sample report register."
        action={<button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"><Download size={17} /> Export CSV</button>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Available reports" value={DEMO_REPORTS.length} detail="Demo report register" />
        <AdminMetric label="Ready to export" value={DEMO_REPORTS.filter((report) => report.status === 'Ready').length} detail="Available now" tone="emerald" />
        <AdminMetric label="Report categories" value={new Set(DEMO_REPORTS.map((report) => report.category)).size} detail="Operations and coordination" tone="sky" />
      </div>
      <AdminPanel title="Report register" description="The CSV export contains this sample list until report generation is connected.">
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search reports" />
        </label>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={tableHeadClass}>
              <tr><th className="pb-3">Report</th><th className="pb-3">Category</th><th className="pb-3">Generated</th><th className="pb-3">Status</th><th className="pb-3">Type</th></tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className={tableRowClass}>
                  <td className="py-4"><span className="flex items-center gap-2 font-semibold text-slate-800"><FileBarChart size={17} className="text-sky-600" />{report.name}</span><span className="ml-6 block text-xs text-slate-400">{report.id}</span></td>
                  <td className="py-4 text-slate-600">{report.category}</td>
                  <td className="py-4 text-slate-600">{report.date}</td>
                  <td className="py-4"><StatusTag tone="emerald">{report.status}</StatusTag></td>
                  <td className="py-4 text-slate-600">CSV</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No reports match that search.</p>}
        </div>
      </AdminPanel>
      <DemoNotice />
    </>
  )
}
