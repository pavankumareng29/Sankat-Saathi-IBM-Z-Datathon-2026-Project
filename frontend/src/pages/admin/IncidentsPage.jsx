import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AdminMetric, AdminPageHeader, AdminPanel, DemoNotice, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const EMPTY_INCIDENTS = []

export default function IncidentsPage({ data }) {
  const [query, setQuery] = useState('')
  const incidents = data?.requests || EMPTY_INCIDENTS
  const filteredIncidents = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return incidents
    return incidents.filter((incident) =>
      [incident.id, incident.area, incident.need, incident.priority].some((field) => String(field).toLowerCase().includes(value))
    )
  }, [incidents, query])
  const criticalCount = incidents.filter((incident) => incident.priority === 'Critical').length
  const highCount = incidents.filter((incident) => incident.priority === 'High').length

  return (
    <>
      <AdminPageHeader title="Incidents" subtitle="Review incoming emergency reports and prioritise response activity." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Active incidents" value={incidents.length} detail="All reported areas" />
        <AdminMetric label="Critical priority" value={criticalCount} detail="Immediate attention" tone="rose" />
        <AdminMetric label="High priority" value={highCount} detail="Expedite response" tone="amber" />
      </div>
      <AdminPanel title="Incident register" description="Search the current demo incident records.">
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search ID, area, need, or priority" />
        </label>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={tableHeadClass}>
              <tr><th className="pb-3">Incident</th><th className="pb-3">Need</th><th className="pb-3">People affected</th><th className="pb-3">Priority</th><th className="pb-3">Reported</th></tr>
            </thead>
            <tbody>
              {filteredIncidents.map((incident) => (
                <tr key={incident.id} className={tableRowClass}>
                  <td className="py-4"><span className="font-semibold text-slate-800">{incident.area}</span><span className="block text-xs text-slate-400">{incident.id}</span></td>
                  <td className="py-4 text-slate-600">{incident.need}</td>
                  <td className="py-4 text-slate-600">{incident.people || '—'}</td>
                  <td className="py-4"><StatusTag tone={incident.priority === 'Critical' ? 'rose' : incident.priority === 'High' ? 'amber' : 'sky'}>{incident.priority}</StatusTag></td>
                  <td className="py-4 text-slate-500">{incident.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredIncidents.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No incidents match that search.</p>}
        </div>
      </AdminPanel>
      <DemoNotice />
    </>
  )
}
