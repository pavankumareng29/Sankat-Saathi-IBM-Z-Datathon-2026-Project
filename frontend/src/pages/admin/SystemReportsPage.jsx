import { useEffect, useMemo, useState } from 'react'
import { Download, FileBarChart, LoaderCircle, Search } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { AdminMetric, AdminPageHeader, AdminPanel, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const REPORT_SOURCES = [
  { id: 'requests', name: 'Citizen assistance requests', category: 'Operations', table: 'assistance_requests' },
  { id: 'incidents', name: 'Disaster incidents', category: 'Operations', table: 'disaster_incidents' },
  { id: 'centres', name: 'Relief centre directory', category: 'Shelter', table: 'relief_centres' },
  { id: 'partners', name: 'NGO partner directory', category: 'Coordination', table: 'ngo_partners' },
  { id: 'inventory', name: 'Resource inventory', category: 'Supplies', table: 'inventory' },
  { id: 'allocations', name: 'Resource allocations', category: 'Coordination', table: 'allocations' },
  { id: 'deliveries', name: 'Delivery tracking', category: 'Logistics', table: 'deliveries' },
]

export default function SystemReportsPage() {
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadReportCounts = async () => {
      const results = await Promise.all(REPORT_SOURCES.map(async (source) => {
        const { count, error: countError } = await supabase
          .from(source.table)
          .select('id', { count: 'exact', head: true })
        return { source, count, error: countError }
      }))

      if (cancelled) return
      const failed = results.find((result) => result.error)
      if (failed) {
        setError(`Could not load reports from ${failed.source.table}: ${failed.error.message}`)
        setLoading(false)
        return
      }

      const generatedAt = new Date().toISOString()
      setReports(results.map(({ source, count }) => ({
        id: source.id,
        name: source.name,
        category: source.category,
        count: count ?? 0,
        date: generatedAt,
        status: 'Ready',
      })))
      setLoading(false)
    }

    loadReportCounts()
    return () => { cancelled = true }
  }, [])

  const visibleReports = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value
      ? reports.filter((report) => [report.name, report.category].some((field) => field.toLowerCase().includes(value)))
      : reports
  }, [reports, query])

  const downloadReport = () => {
    const rows = [
      ['Report', 'Category', 'Database table', 'Records', 'Generated at'],
      ...reports.map((report) => [
        report.name,
        report.category,
        REPORT_SOURCES.find((source) => source.id === report.id)?.table || '',
        String(report.count),
        report.date,
      ]),
    ]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sankat-saathi-database-summary.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <AdminPageHeader
        title="System reports"
        subtitle="Review live record counts from the connected operational tables."
        action={<button type="button" onClick={downloadReport} disabled={loading || !!error} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"><Download size={17} /> Export CSV</button>}
      />
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Report sources" value={REPORT_SOURCES.length} detail="Connected database tables" />
        <AdminMetric label="Total records" value={reports.reduce((total, report) => total + report.count, 0).toLocaleString()} detail="Across listed sources" tone="emerald" />
        <AdminMetric label="Report status" value={error ? 'Error' : loading ? 'Loading' : 'Live'} detail={error ? 'Check table permissions' : 'Supabase connected'} tone={error ? 'rose' : 'sky'} />
      </div>
      <AdminPanel title="Database report register" description="Counts are queried from Supabase when this page loads; the CSV exports those counts.">
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search reports" />
        </label>
        {loading ? <div className="flex justify-center py-10"><LoaderCircle className="animate-spin text-sky-600" /></div> : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={tableHeadClass}><tr><th className="pb-3">Report</th><th className="pb-3">Category</th><th className="pb-3">Records</th><th className="pb-3">Generated</th><th className="pb-3">Status</th></tr></thead>
              <tbody>{visibleReports.map((report) => (
                <tr key={report.id} className={tableRowClass}>
                  <td className="py-4"><span className="flex items-center gap-2 font-semibold text-slate-800"><FileBarChart size={17} className="text-sky-600" />{report.name}</span><span className="ml-6 block text-xs text-slate-400">{REPORT_SOURCES.find((source) => source.id === report.id)?.table}</span></td>
                  <td className="py-4 text-slate-600">{report.category}</td>
                  <td className="py-4 font-semibold text-slate-700">{report.count.toLocaleString()}</td>
                  <td className="py-4 text-slate-600">{new Date(report.date).toLocaleString()}</td>
                  <td className="py-4"><StatusTag tone="emerald">{report.status}</StatusTag></td>
                </tr>
              ))}</tbody>
            </table>
            {visibleReports.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No reports match that search.</p>}
          </div>
        )}
      </AdminPanel>
    </>
  )
}
