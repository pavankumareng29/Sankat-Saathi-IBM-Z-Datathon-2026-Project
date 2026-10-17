import { useMemo, useState } from 'react'
import { MapPin, Phone, Search, User, Users, X } from 'lucide-react'
import { AdminMetric, AdminPageHeader, AdminPanel, DemoNotice, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

const DEMO_PARTNERS = [
  { id: 'NGO-001', name: 'Hope Relief Foundation', contact: 'Ananya Rao', phone: '+91 98765 43001', area: 'North Zone', capacity: '12 teams', status: 'Active' },
  { id: 'NGO-002', name: 'Community Health Network', contact: 'Rahul Menon', phone: '+91 98765 43002', area: 'Central Zone', capacity: '8 teams', status: 'Active' },
  { id: 'NGO-003', name: 'River Aid Collective', contact: 'Farah Khan', phone: '+91 98765 43003', area: 'East Zone', capacity: '5 teams', status: 'Review' },
]

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`

function Avatar({ name }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-extrabold text-white shadow-sm">
      {initials(name)}
    </span>
  )
}

export default function NgoPartnersPage({ notify = () => {} }) {
  const [query, setQuery] = useState('')
  const partners = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value
      ? DEMO_PARTNERS.filter((partner) => [partner.name, partner.contact, partner.area, partner.status].some((field) => field.toLowerCase().includes(value)))
      : DEMO_PARTNERS
  }, [query])

  return (
    <>
      <AdminPageHeader
        title="NGO partners"
        subtitle="View partner organisations, their service areas, and response capacity."
        action={
          <button
            onClick={() => notify('Partner registration can be connected when the backend is ready.')}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 sm:w-auto"
          >
            + Add partner
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <AdminMetric label="Registered partners" value={DEMO_PARTNERS.length} detail="Across response zones" />
        <AdminMetric label="Active partners" value={DEMO_PARTNERS.filter((partner) => partner.status === 'Active').length} detail="Ready to coordinate" tone="emerald" />
        <AdminMetric label="Under review" value={DEMO_PARTNERS.filter((partner) => partner.status === 'Review').length} detail="Verification needed" tone="amber" />
      </div>

      <AdminPanel title="Partner directory" description="Demo partner list; replace this source with your partner API.">
        {/* Search + result count */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100 sm:max-w-md">
            <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Search partners or service areas</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search partners or service areas"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </label>
          <p className="text-sm font-medium text-slate-500" aria-live="polite">
            Showing <span className="font-bold text-slate-800">{partners.length}</span> of {DEMO_PARTNERS.length} partners
          </p>
        </div>

        {/* Mobile and tablet: cards */}
        <ul className="grid gap-3 md:hidden">
          {partners.map((partner) => (
            <li key={partner.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={partner.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug text-slate-900">{partner.name}</p>
                  <p className="text-xs text-slate-400">{partner.id}</p>
                </div>
                <StatusTag tone={partner.status === 'Active' ? 'emerald' : 'amber'}>{partner.status}</StatusTag>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <User size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <div><dt className="text-xs text-slate-400">Coordinator</dt><dd className="font-medium text-slate-700">{partner.contact}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <div><dt className="text-xs text-slate-400">Service area</dt><dd className="font-medium text-slate-700">{partner.area}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Users size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <div><dt className="text-xs text-slate-400">Capacity</dt><dd className="font-medium text-slate-700">{partner.capacity}</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <div><dt className="text-xs text-slate-400">Phone</dt><dd className="font-medium text-slate-700">{partner.phone}</dd></div>
                </div>
              </dl>

              <a
                href={telHref(partner.phone)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
              >
                <Phone size={16} aria-hidden="true" /> Call coordinator
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
          <table className={tableClass}>
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-4 pb-3 pt-3">Organisation</th>
                <th className="pb-3 pt-3">Coordinator</th>
                <th className="pb-3 pt-3">Phone</th>
                <th className="pb-3 pt-3">Service area</th>
                <th className="pb-3 pt-3">Capacity</th>
                <th className="pb-3 pr-4 pt-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} className={`${tableRowClass} transition hover:bg-sky-50/60`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={partner.name} />
                      <div>
                        <span className="font-semibold text-slate-800">{partner.name}</span>
                        <span className="block text-xs text-slate-400">{partner.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-slate-600">{partner.contact}</td>
                  <td className="py-4">
                    <a href={telHref(partner.phone)} className="text-slate-600 hover:text-sky-700 hover:underline">{partner.phone}</a>
                  </td>
                  <td className="py-4 text-slate-600">{partner.area}</td>
                  <td className="py-4 text-slate-600">{partner.capacity}</td>
                  <td className="py-4 pr-4"><StatusTag tone={partner.status === 'Active' ? 'emerald' : 'amber'}>{partner.status}</StatusTag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {partners.length === 0 && (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Search size={26} aria-hidden="true" /></span>
            <p className="font-semibold text-slate-700">No partners match that search</p>
            <button type="button" onClick={() => setQuery('')} className="text-sm font-semibold text-sky-700 hover:underline">Clear search</button>
          </div>
        )}
      </AdminPanel>
      <DemoNotice />
    </>
  )
}