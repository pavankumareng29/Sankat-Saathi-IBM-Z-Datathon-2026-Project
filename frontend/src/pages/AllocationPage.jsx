import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../services/supabase'

const statusTone = {
  proposed: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  dispatched: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-600',
}

export default function AllocationPage({ data, notify = () => {}, goTo = () => {} }) {
  const [creatingId, setCreatingId] = useState('')
  const [error, setError] = useState('')
  const deliveryAllocationIds = new Set(data.deliveries.map((delivery) => delivery.allocationId))

  const createDelivery = async (allocation) => {
    setCreatingId(allocation.id)
    setError('')
    const { data: deliveryCode, error: createError } = await supabase
      .rpc('create_delivery_for_allocation', { target_allocation_id: allocation.id })
    setCreatingId('')
    if (createError) {
      setError(`Could not create a delivery: ${createError.message}`)
      return
    }
    notify(`Delivery ${deliveryCode} created.`)
    goTo('Deliveries')
  }

  return (
    <>
      <PageHeader title="Allocations" subtitle="Review the requests your NGO has claimed and start their delivery workflow." />
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {data.allocations.length ? (
        <div className="space-y-4">
          {data.allocations.map((allocation) => (
            <article key={allocation.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-800">{allocation.zone}</h2>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone[allocation.status] || statusTone.proposed}`}>{allocation.status}</span>
                  </div>
                  <p className="mt-4 font-semibold text-slate-700">{allocation.action}</p>
                  <p className="mt-2 text-sm text-slate-500">{allocation.reason}</p>
                </div>
                {['proposed', 'approved'].includes(allocation.status) && !deliveryAllocationIds.has(allocation.id) && (
                  <button
                    type="button"
                    onClick={() => createDelivery(allocation)}
                    disabled={!!creatingId}
                    className="h-fit shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {creatingId === allocation.id ? 'Creating…' : 'Create delivery'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Claim a request from the Requests page to create an allocation here.</p>}
    </>
  )
}
