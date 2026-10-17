import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { AdminMetric, AdminPageHeader, AdminPanel, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const EMPTY_FORM = { title: '', hazardType: 'Flood', area: '', severity: 'moderate', description: '' }
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
const severityTone = { critical: 'rose', high: 'rose', moderate: 'amber', low: 'sky' }

export default function IncidentsPage() {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.from('disaster_incidents')
      .select('id, title, hazard_type, description, severity, status, area, started_at')
      .order('started_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) setError(`Could not load incidents: ${loadError.message}`)
        else setIncidents(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const visibleIncidents = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return incidents
    return incidents.filter((incident) =>
      [incident.title, incident.hazard_type, incident.area, incident.severity, incident.status]
        .some((field) => String(field || '').toLowerCase().includes(value))
    )
  }, [incidents, query])

  const activeCount = incidents.filter((incident) => incident.status === 'active').length
  const criticalCount = incidents.filter((incident) => incident.severity === 'critical' && incident.status === 'active').length
  const addIncident = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase.from('disaster_incidents').insert({
      title: form.title.trim(),
      hazard_type: form.hazardType,
      area: form.area.trim(),
      severity: form.severity,
      description: form.description.trim() || null,
      created_by: user.id,
    }).select('id, title, hazard_type, description, severity, status, area, started_at').single()
    setSaving(false)
    if (insertError) {
      setError(`Could not save the incident: ${insertError.message}`)
      return
    }
    setIncidents((current) => [data, ...current])
    setForm(EMPTY_FORM)
    setFormOpen(false)
  }

  const updateIncident = async (incident, patch) => {
    setError('')
    const { data, error: updateError } = await supabase.from('disaster_incidents')
      .update(patch)
      .eq('id', incident.id)
      .select('id, title, hazard_type, description, severity, status, area, started_at')
      .single()
    if (updateError) {
      setError(`Could not update ${incident.title}: ${updateError.message}`)
      return
    }
    setIncidents((current) => current.map((item) => item.id === data.id ? data : item))
  }

  return (
    <>
      <AdminPageHeader
        title="Incidents"
        subtitle="Manage active disaster incidents and link citizen requests to the response."
        action={<button type="button" onClick={() => setFormOpen((open) => !open)} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700">{formOpen ? 'Cancel' : '+ Add incident'}</button>}
      />
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      {formOpen && (
        <AdminPanel title="Create incident" description="Incident records are saved to disaster_incidents.">
          <form onSubmit={addIncident} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Incident title<input className={`${inputClass} mt-1.5`} required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Hazard type<input className={`${inputClass} mt-1.5`} required maxLength={80} value={form.hazardType} onChange={(event) => setForm({ ...form, hazardType: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Area<input className={`${inputClass} mt-1.5`} required maxLength={200} value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Severity<select className={`${inputClass} mt-1.5`} value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea rows={3} maxLength={1000} className={`${inputClass} mt-1.5`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="sm:col-span-2 sm:text-right"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? 'Saving…' : 'Save incident'}</button></div>
          </form>
        </AdminPanel>
      )}

      <div className="mb-6 mt-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Incident records" value={incidents.length} detail="From Supabase" />
        <AdminMetric label="Active incidents" value={activeCount} detail="Response in progress" tone="amber" />
        <AdminMetric label="Critical active" value={criticalCount} detail="Urgent" tone="rose" />
      </div>
      <AdminPanel title="Incident register" description="Incident data is read directly from disaster_incidents.">
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search title, area, type, or status" />
        </label>
        {loading ? <div className="flex justify-center py-10"><LoaderCircle className="animate-spin text-sky-600" /></div> : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={tableHeadClass}><tr><th className="pb-3">Incident</th><th className="pb-3">Type / area</th><th className="pb-3">Severity</th><th className="pb-3">Status</th><th className="pb-3">Started</th><th className="pb-3">Update</th></tr></thead>
              <tbody>{visibleIncidents.map((incident) => (
                <tr key={incident.id} className={tableRowClass}>
                  <td className="py-4"><span className="font-semibold text-slate-800">{incident.title}</span><span className="block text-xs text-slate-400">{incident.id.slice(0, 8)}</span></td>
                  <td className="py-4 text-slate-600">{incident.hazard_type}<span className="block text-xs text-slate-400">{incident.area}</span></td>
                  <td className="py-4"><StatusTag tone={severityTone[incident.severity] || 'slate'}>{incident.severity}</StatusTag></td>
                  <td className="py-4"><StatusTag tone={incident.status === 'active' ? 'emerald' : 'slate'}>{incident.status}</StatusTag></td>
                  <td className="py-4 text-slate-500">{new Date(incident.started_at).toLocaleString()}</td>
                  <td className="py-4"><select aria-label={`Update status for ${incident.title}`} value={incident.status} onChange={(event) => updateIncident(incident, { status: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="active">Active</option><option value="contained">Contained</option><option value="resolved">Resolved</option></select></td>
                </tr>
              ))}</tbody>
            </table>
            {!loading && visibleIncidents.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{incidents.length ? 'No incidents match your search.' : 'No incidents are saved yet.'}</p>}
          </div>
        )}
      </AdminPanel>
    </>
  )
}
