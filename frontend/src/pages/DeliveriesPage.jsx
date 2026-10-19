import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, Clock3, Flag, LoaderCircle, MapPin, Package, PackageOpen, Timer, Truck,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../services/supabase'

const STATUS_OPTIONS = [
  ['preparing', 'Preparing'],
  ['loading', 'Loading'],
  ['en_route', 'En route'],
  ['delivered', 'Delivered'],
]

const SORT_OPTIONS = [
  ['outstanding', 'Outstanding first · priority & oldest request'],
  ['newest', 'Newest request first'],
  ['oldest', 'Oldest request first'],
  ['stage', 'Delivery stage · en route first'],
]

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const STAGE_ORDER = { en_route: 0, loading: 1, preparing: 2, delivered: 3, cancelled: 4 }

const progressFor = (status) => ({
  preparing: 5,
  loading: 30,
  en_route: 65,
  delivered: 100,
  cancelled: 0,
})[status] ?? 0

function isComplete(status) {
  return status === 'delivered' || status === 'cancelled'
}

// Presentation-only helpers
const STATUS_STYLE = {
  preparing: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500', label: 'Preparing' },
  loading: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', bar: 'bg-sky-500', label: 'Loading' },
  en_route: { badge: 'bg-blue-50 text-blue-800 ring-blue-200', bar: 'bg-blue-600', label: 'En route' },
  delivered: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', bar: 'bg-emerald-500', label: 'Delivered' },
  cancelled: { badge: 'bg-rose-50 text-rose-800 ring-rose-200', bar: 'bg-rose-400', label: 'Cancelled' },
}

const PRIORITY_STYLE = {
  critical: 'bg-rose-50 text-rose-800 ring-rose-200',
  high: 'bg-orange-50 text-orange-800 ring-orange-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const STAGES = [
  ['preparing', 'Preparing'],
  ['loading', 'Loading'],
  ['en_route', 'En route'],
  ['delivered', 'Delivered'],
]

function StatusBadge({ status }) {
  const style = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${style?.badge || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {style?.label || status}
    </span>
  )
}

function Unavailable() {
  return <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">Details unavailable</span>
}

function Summary({ icon: Icon, label, value, tone }) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${tones[tone]}`}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-extrabold leading-none tabular-nums text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function Stepper({ statusValue }) {
  const cancelled = statusValue === 'cancelled'
  const currentIndex = STAGES.findIndex(([value]) => value === statusValue)
  return (
    <ol className="mt-2 grid grid-cols-4 gap-1 text-[11px]" aria-label="Delivery stages">
      {STAGES.map(([value, label], index) => {
        const reached = !cancelled && index <= currentIndex
        return (
          <li
            key={value}
            aria-current={index === currentIndex ? 'step' : undefined}
            className={`truncate ${reached ? 'font-semibold text-slate-800' : 'text-slate-400'}`}
          >
            {label}
          </li>
        )
      })}
    </ol>
  )
}

export default function DeliveriesPage({ notify = () => {} }) {
  const [deliveries, setDeliveries] = useState([])
  const [sortBy, setSortBy] = useState('outstanding')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadDeliveries = async () => {
      const { data: rows, error: loadError } = await supabase
        .from('deliveries')
        .select(`
          id, delivery_code, allocation_id, status, eta,
          allocation:allocations!deliveries_allocation_id_fkey(
            request_id,
            request:assistance_requests!allocations_request_id_fkey(request_code, location_text, priority, created_at),
            allocation_items(
              quantity,
              inventory:inventory!allocation_items_inventory_id_fkey(
                resource:resource_catalog!inventory_resource_id_fkey(name, unit)
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (loadError) {
        setError(`Could not load deliveries: ${loadError.message}`)
      } else {
        setDeliveries((rows || []).map((row) => {
          const allocation = Array.isArray(row.allocation) ? row.allocation[0] : row.allocation
          const request = Array.isArray(allocation?.request) ? allocation.request[0] : allocation?.request
          const supplies = (allocation?.allocation_items || []).map((item) => {
            const inventory = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory
            const resource = Array.isArray(inventory?.resource) ? inventory.resource[0] : inventory?.resource
            return { name: resource?.name || 'Relief supplies', quantity: Number(item.quantity), unit: resource?.unit || 'units' }
          })
          const status = row.status.replaceAll('_', ' ')
          return {
            id: row.delivery_code,
            allocationId: row.allocation_id,
            requestCode: request?.request_code,
            destination: request?.location_text || row.delivery_code,
            requestPriority: request?.priority || 'low',
            requestCreatedAt: request?.created_at || null,
            eta: row.eta ? new Date(row.eta).toLocaleString() : 'Not set',
            status: status.charAt(0).toUpperCase() + status.slice(1),
            statusValue: row.status,
            progress: progressFor(row.status),
            supplies,
          }
        }))
      }
      setLoading(false)
    }
    loadDeliveries()
    const channel = supabase.channel('ngo-deliveries-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliveries',
      }, loadDeliveries)
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const sortedDeliveries = useMemo(() => {
    const rows = [...deliveries]
    rows.sort((left, right) => {
      if (sortBy === 'newest' || sortBy === 'oldest') {
        const direction = sortBy === 'newest' ? -1 : 1
        return direction * ((Date.parse(left.requestCreatedAt) || 0) - (Date.parse(right.requestCreatedAt) || 0))
      }
      if (sortBy === 'stage') {
        return (STAGE_ORDER[left.statusValue] ?? 5) - (STAGE_ORDER[right.statusValue] ?? 5)
          || (Date.parse(left.requestCreatedAt) || 0) - (Date.parse(right.requestCreatedAt) || 0)
      }

      const completionOrder = Number(isComplete(left.statusValue)) - Number(isComplete(right.statusValue))
      if (completionOrder) return completionOrder
      const priorityOrder = (PRIORITY_ORDER[left.requestPriority] ?? 4) - (PRIORITY_ORDER[right.requestPriority] ?? 4)
      if (priorityOrder) return priorityOrder
      return (Date.parse(left.requestCreatedAt) || 0) - (Date.parse(right.requestCreatedAt) || 0)
    })
    return rows
  }, [deliveries, sortBy])

  const outstandingCount = deliveries.filter((delivery) => !isComplete(delivery.statusValue)).length
  const completedCount = deliveries.length - outstandingCount

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

      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Summary icon={Truck} label="Outstanding deliveries" value={outstandingCount} tone="sky" />
          <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <Summary icon={CheckCircle2} label="Delivered or cancelled" value={completedCount} tone="emerald" />
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:items-end">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:w-auto"
          >
            {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading deliveries…
        </div>
      ) : deliveries.length ? (
        <div className="space-y-3">
          {sortedDeliveries.map((delivery) => {
            const style = STATUS_STYLE[delivery.statusValue]
            const hasLocation = delivery.destination !== delivery.id
            const priorityKey = String(delivery.requestPriority || '').toLowerCase()
            return (
              <article key={delivery.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,15rem)] lg:gap-6">
                  {/* Delivery identity */}
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100">
                      <Truck size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-slate-500">
                        {delivery.requestCode
                          ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">{delivery.requestCode}</span>
                          : <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500">Request ID unavailable</span>}
                        <span>{delivery.id}</span>
                      </p>
                      <h2 className="mt-1.5 flex items-start gap-1.5 font-bold leading-snug text-slate-900">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                        {hasLocation ? <span className="break-words">{delivery.destination}</span> : <Unavailable />}
                      </h2>
                    </div>
                  </div>

                  {/* Delivery details */}
                  <div className="min-w-0 space-y-2.5 border-t border-slate-100 pt-3 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div className="flex items-start gap-2">
                      <Package size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                      {delivery.supplies?.length > 0 ? (
                        <ul className="min-w-0 space-y-0.5 text-slate-600">
                          {delivery.supplies.map((item) => (
                            <li key={`${item.name}-${item.unit}`}>
                              {item.name}: <span className="font-semibold tabular-nums text-slate-900">{item.quantity.toLocaleString()} {item.unit}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <Unavailable />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} className="text-slate-400" aria-hidden="true" />
                        {delivery.requestCreatedAt
                          ? <>Received {new Date(delivery.requestCreatedAt).toLocaleString()}</>
                          : <Unavailable />}
                      </span>
                      {delivery.requestCreatedAt && delivery.requestPriority && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold capitalize ring-1 ring-inset ${PRIORITY_STYLE[priorityKey] || PRIORITY_STYLE.low}`}>
                          <Flag size={12} aria-hidden="true" /> {delivery.requestPriority} priority
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status and actions */}
                  <div className="space-y-2.5 border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={delivery.statusValue} />
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
                        <Timer size={14} aria-hidden="true" /> {delivery.eta}
                      </span>
                    </div>
                    <label className="block text-xs font-semibold text-slate-600">
                      Update status
                      <select
                        aria-label={`Update status for ${delivery.id}`}
                        value={delivery.statusValue || 'preparing'}
                        onChange={(event) => updateStatus(delivery, event.target.value)}
                        disabled={updatingId === delivery.id || delivery.statusValue === 'delivered'}
                        className="mt-1 w-full rounded-lg border border-sky-300 bg-sky-50/60 px-3 py-2.5 text-sm font-semibold text-sky-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
                      >
                        {delivery.statusValue === 'cancelled' && <option value="cancelled" disabled>Cancelled</option>}
                        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    {updatingId === delivery.id && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <LoaderCircle size={12} className="animate-spin" aria-hidden="true" /> Saving…
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={delivery.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${delivery.id} progress: ${delivery.status}`}
                  >
                    <div className={`h-full rounded-full transition-all ${style?.bar || 'bg-sky-500'}`} style={{ width: `${delivery.progress}%` }} />
                  </div>
                  <Stepper statusValue={delivery.statusValue} />
                </div>
              </article>
            )
          })}
        </div>
      ) : error ? null : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            <PackageOpen size={24} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-800">No deliveries yet</p>
          <p className="mt-1 text-sm text-slate-500">No deliveries are currently visible to your account.</p>
        </div>
      )}
    </>
  )
}