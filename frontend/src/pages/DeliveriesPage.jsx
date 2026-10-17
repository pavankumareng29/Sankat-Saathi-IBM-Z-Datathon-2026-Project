import { useState } from 'react'
import { Truck } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../services/supabase'

const STATUS_OPTIONS = [
  ['preparing', 'Preparing'],
  ['loading', 'Loading'],
  ['en_route', 'En route'],
  ['delivered', 'Delivered'],
]

const progressFor = (status) => ({
  preparing: 5,
  loading: 30,
  en_route: 65,
  delivered: 100,
  cancelled: 0,
})[status] ?? 0

export default function DeliveriesPage({ data, notify = () => {} }) {
  const [deliveries, setDeliveries] = useState(data.deliveries)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  const updateStatus = async (delivery, status) => {
    setUpdatingId(delivery.id)
    setError('')
    const { error: updateError } = await supabase.from('deliveries')
      .update({
        status,
      })
      .eq('delivery_code', delivery.id)

    setUpdatingId('')
    if (updateError) {
      setError(`Could not update delivery ${delivery.id}: ${updateError.message}`)
      return
    }
    setDeliveries((current) => current.map((item) => item.id === delivery.id
      ? { ...item, status: status.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()), statusValue: status, progress: progressFor(status), eta: status === 'delivered' ? 'Delivered' : item.eta }
      : item))
    notify(`Delivery ${delivery.id} updated.`)
  }

  return (
    <>
      <PageHeader title="Delivery tracking" subtitle="Track deliveries associated with your NGO's assignments and update their progress." />
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {deliveries.length ? (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <article key={delivery.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                <div className="h-fit rounded-xl bg-sky-50 p-3 text-sky-600"><Truck size={23} aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div><h2 className="font-bold text-slate-800">{delivery.destination}</h2><p className="mt-1 text-sm text-slate-500">{delivery.id} · {delivery.status}</p></div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span className="text-sm font-semibold text-sky-700">{delivery.eta}</span>
                      <select
                        aria-label={`Update status for ${delivery.id}`}
                        value={delivery.statusValue || 'preparing'}
                        onChange={(event) => updateStatus(delivery, event.target.value)}
                        disabled={updatingId === delivery.id}
                        className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${delivery.progress}%` }} /></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No deliveries are currently visible to your account.</p>}
    </>
  )
}
