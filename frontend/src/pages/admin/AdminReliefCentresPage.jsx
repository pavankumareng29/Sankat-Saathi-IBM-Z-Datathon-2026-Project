import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { centres } from '../../data/centres'
import { AdminMetric, AdminPageHeader, AdminPanel, DemoNotice, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

export default function AdminReliefCentresPage({ notify = () => {} }) {
  const [query, setQuery] = useState('')
  const openCentres = centres.filter((centre) => centre.status === 'Open').length
  const totalCapacity = centres.reduce((total, centre) => total + centre.capacity, 0)
  const occupiedPlaces = centres.reduce((total, centre) => total + centre.occupied, 0)
  const filteredCentres = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value
      ? centres.filter((centre) => [centre.name, centre.area, centre.status].some((field) => field.toLowerCase().includes(value)))
      : centres
  }, [query])

  return (
    <>
      <AdminPageHeader
        title="Relief centres"
        subtitle="Monitor shelter availability and occupancy across relief locations."
        action={<button onClick={() => notify('Centre registration can be connected when the backend is ready.')} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700">+ Add centre</button>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Total centres" value={centres.length} detail={`${openCentres} currently open`} />
        <AdminMetric label="People accommodated" value={occupiedPlaces.toLocaleString()} detail="Current occupancy" tone="emerald" />
        <AdminMetric label="Available capacity" value={Math.max(totalCapacity - occupiedPlaces, 0).toLocaleString()} detail="Places remaining" tone="sky" />
      </div>
      <AdminPanel title="Centre directory" description="Occupancy and availability based on the current demo centre list.">
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search centre, area, or status" />
        </label>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={tableHeadClass}>
              <tr><th className="pb-3">Centre</th><th className="pb-3">Area</th><th className="pb-3">Occupancy</th><th className="pb-3">Capacity</th><th className="pb-3">Availability</th></tr>
            </thead>
            <tbody>
              {filteredCentres.map((centre) => {
                const occupancy = centre.capacity ? Math.round((centre.occupied / centre.capacity) * 100) : 0
                return (
                  <tr key={centre.id} className={tableRowClass}>
                    <td className="py-4 font-semibold text-slate-800">{centre.name}</td>
                    <td className="py-4 text-slate-600">{centre.area}</td>
                    <td className="py-4 text-slate-600">{centre.occupied.toLocaleString()}</td>
                    <td className="py-4 text-slate-600">{centre.capacity.toLocaleString()}</td>
                    <td className="py-4"><div className="flex flex-wrap items-center gap-2"><StatusTag tone={centre.status === 'Open' ? 'emerald' : 'rose'}>{centre.status}</StatusTag><span className="text-xs text-slate-500">{occupancy}% full</span></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredCentres.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No centres match that search.</p>}
        </div>
      </AdminPanel>
      <DemoNotice />
    </>
  )
}
