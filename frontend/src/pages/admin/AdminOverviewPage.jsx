import { Activity, Building2, MapPin, Users } from 'lucide-react'
import { AdminMetric, AdminPageHeader, AdminPanel, DemoNotice, StatusTag, tableClass, tableHeadClass, tableRowClass } from './AdminComponents'

export default function AdminOverviewPage({ data }) {
  const stats = data?.stats || []
  const requests = data?.requests || []
  const iconFor = [Activity, Users, MapPin, Building2]
  const toneFor = ['amber', 'emerald', 'rose', 'sky']

  return (
    <>
      <AdminPageHeader title="Admin overview" subtitle="A high-level view of current response activity and coordination." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = iconFor[index] || Activity
          return (
            <div key={stat.label} className="relative">
              <AdminMetric label={stat.label} value={stat.value} detail={stat.change} tone={toneFor[index]} />
              <Icon className="absolute right-5 top-5 text-slate-300" size={19} aria-hidden="true" />
            </div>
          )
        })}
      </div>

      <AdminPanel title="Latest relief requests" description="Recent requests across the response network.">
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead className={tableHeadClass}>
              <tr>
                <th className="pb-3">Location</th>
                <th className="pb-3">Requested support</th>
                <th className="pb-3">People</th>
                <th className="pb-3">Priority</th>
                <th className="pb-3">Received</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className={tableRowClass}>
                  <td className="py-4 font-semibold text-slate-800">{request.area}<span className="block text-xs font-normal text-slate-400">{request.id}</span></td>
                  <td className="py-4 text-slate-600">{request.need}</td>
                  <td className="py-4 text-slate-600">{request.people || '—'}</td>
                  <td className="py-4"><StatusTag tone={request.priority === 'Critical' ? 'rose' : request.priority === 'High' ? 'amber' : 'sky'}>{request.priority}</StatusTag></td>
                  <td className="py-4 text-slate-500">{request.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No requests to display.</p>}
        </div>
      </AdminPanel>
      <DemoNotice />
    </>
  )
}
