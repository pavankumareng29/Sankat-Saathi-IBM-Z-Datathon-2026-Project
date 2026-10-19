import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Clock3,
  FileCheck2, Inbox, LoaderCircle, MapPin, Package, PackageCheck, PackageX, RefreshCw,
  ShieldAlert, Truck, Users,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../services/supabase'
import { buildRecommendations, distanceKm } from '../services/allocationRecommendations'

const priorityTone = {
  Critical: 'bg-rose-100 text-rose-800 ring-rose-200',
  High: 'bg-orange-100 text-orange-800 ring-orange-200',
  Medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  Low: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const priorityBar = {
  Critical: 'bg-rose-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-400',
}

const allocationTone = {
  proposed: 'bg-amber-100 text-amber-800 ring-amber-200',
  approved: 'bg-sky-100 text-sky-800 ring-sky-200',
  dispatched: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const formatDistance = (distance) => distance < 1
  ? `${Math.round(distance * 1000)} m`
  : `${distance.toFixed(1)} km`

const formatQty = (value) => Number(value || 0).toLocaleString()
const readable = (value) => String(value || '').replaceAll('_', ' ')

// Delivery stage derived only from the saved delivery_status text; no values are invented.
const deliveryStages = ['Approved', 'Preparing', 'In transit', 'Delivered']
const deliveryStageIndex = (allocation) => {
  if (!allocation.delivery_code && !allocation.delivery_status) return 0
  const status = readable(allocation.delivery_status).toLowerCase()
  if (status.includes('deliver')) return 3
  if (status.includes('transit') || status.includes('dispatch') || status.includes('route') || status.includes('out')) return 2
  return 1
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'

function StatusBadge({ className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${className}`}>
      {children}
    </span>
  )
}

function Metric({ label, value, tone = 'sky', icon: Icon }) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }
  return (
    <article className="flex h-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${tones[tone]}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none tracking-tight text-slate-950 tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </article>
  )
}

function QuantityTile({ label, value, unit, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-900',
    sky: 'bg-sky-50 text-sky-900',
  }
  return (
    <div className={`rounded-lg px-3 py-2 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="text-sm font-extrabold tabular-nums">
        {value} <span className="text-xs font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  )
}

function AvailabilityBadge({ stockKnown, quantityKnown, shortage, unit }) {
  if (!quantityKnown) {
    return <StatusBadge className="bg-amber-50 text-amber-800 ring-amber-200"><AlertTriangle size={12} aria-hidden="true" /> Quantity missing</StatusBadge>
  }
  if (!stockKnown) {
    return <StatusBadge className="bg-rose-50 text-rose-700 ring-rose-200"><PackageX size={12} aria-hidden="true" /> Not in inventory</StatusBadge>
  }
  if (shortage > 0) {
    return <StatusBadge className="bg-amber-50 text-amber-800 ring-amber-200"><AlertTriangle size={12} aria-hidden="true" /> Short {formatQty(shortage)} {unit}</StatusBadge>
  }
  return <StatusBadge className="bg-emerald-50 text-emerald-700 ring-emerald-200"><PackageCheck size={12} aria-hidden="true" /> Stock covers</StatusBadge>
}

function SupplyList({ items }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => {
        const stockKnown = Boolean(item.inventoryId)
        const maxQuantity = Math.min(item.available, item.recommendedQuantity)
        const coverage = item.quantityKnown && stockKnown && item.requestedQuantity > 0
          ? Math.min(100, Math.round((item.available / item.requestedQuantity) * 100))
          : 0
        const coverageColor = !stockKnown || !item.quantityKnown
          ? 'bg-slate-300'
          : item.shortage > 0 ? 'bg-amber-500' : 'bg-emerald-500'
        return (
          <li key={`${item.resourceId || item.resourceCode}-${item.unit}`} className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-bold text-slate-900">
                <Package size={16} className="text-sky-700" aria-hidden="true" /> {item.name}
              </p>
              <AvailabilityBadge stockKnown={stockKnown} quantityKnown={item.quantityKnown} shortage={item.shortage} unit={item.unit} />
            </div>

            {item.quantityKnown ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <QuantityTile label="Requested" value={formatQty(item.requestedQuantity)} unit={item.unit} />
                  <QuantityTile label="Available" value={formatQty(item.available)} unit={item.unit} />
                  <QuantityTile label="Suggested" value={formatQty(item.recommendedQuantity)} unit={item.unit} tone="sky" />
                </div>
                {stockKnown && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                      <span>Stock coverage</span>
                      <span className="tabular-nums">{coverage}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name} stock coverage`}>
                      <div className={`h-full rounded-full ${coverageColor}`} style={{ width: `${coverage}%` }} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-xs text-amber-800">No exact quantity in this request.</p>
            )}

            {!stockKnown && item.quantityKnown && (
              <p className="mt-2 text-xs font-medium text-rose-700">No matching item and unit in central inventory.</p>
            )}

            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Allocate ({item.unit})
              <input
                aria-label={`${item.name} proposed allocation`}
                type="number"
                min="0"
                max={maxQuantity}
                step="0.001"
                value={item.approvalQuantity}
                onChange={(event) => item.onQuantityChange(event.target.value)}
                disabled={!stockKnown || !item.quantityKnown}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
              />
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function NearbyInsights({ request, requests, centres }) {
  const nearbyRequests = requests
    .filter((other) => other.id !== request.id)
    .map((other) => ({ ...other, distance: distanceKm(request, other) }))
    .filter((other) => other.distance !== null)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3)
  const nearbyCentres = centres
    .map((centre) => ({ ...centre, distance: distanceKm(request, centre) }))
    .filter((centre) => centre.distance !== null)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3)

  if (request.latitude == null || request.longitude == null) return null

  return (
    <details className="group mt-3 rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2"><MapPin size={15} className="text-sky-700" aria-hidden="true" /> Nearby</span>
        <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Inbox size={14} aria-hidden="true" /> Requests</p>
          {nearbyRequests.length ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {nearbyRequests.map((other) => (
                <li key={other.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
                  <span className="font-semibold text-slate-800">{other.request_code}</span>
                  <span>{formatDistance(other.distance)} · {readable(other.status)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-500">None with coordinates.</p>}
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><MapPin size={14} aria-hidden="true" /> Relief centres</p>
          {nearbyCentres.length ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {nearbyCentres.map((centre) => (
                <li key={centre.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
                  <span className="font-semibold text-slate-800">{centre.name}</span>
                  <span>{formatDistance(centre.distance)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-500">None with coordinates.</p>}
        </div>
        <p className="text-[11px] text-slate-400 sm:col-span-2">Straight-line distances.</p>
      </div>
    </details>
  )
}

function SummaryCard({ icon: Icon, iconClass, label, count, open, onClick, controls }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={`flex h-full w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50 ${focusRing} ${open ? 'border-sky-300' : 'border-slate-100'}`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${iconClass}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-extrabold leading-none tabular-nums text-slate-950">{count}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{label}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700">
        {open ? 'Hide' : 'View'} <ChevronRight size={15} className={`transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </span>
    </button>
  )
}

export default function AllocationPage({ notify = () => {}, goTo = () => {} }) {
  const [dashboard, setDashboard] = useState({ requests: [], inventory: [], centres: [], allocations: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [creatingDeliveryId, setCreatingDeliveryId] = useState('')
  const [drafts, setDrafts] = useState({})
  const [reviewedDuplicates, setReviewedDuplicates] = useState({})
  const [updatedAt, setUpdatedAt] = useState(0)
  const [expandedId, setExpandedId] = useState('')
  const [openPanel, setOpenPanel] = useState('')

  const loadDashboard = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc('get_ngo_allocation_dashboard')
    if (loadError) {
      setError(`Could not load allocation recommendations: ${loadError.message}`)
    } else {
      setError('')
      setDashboard({
        requests: data?.requests || [],
        inventory: data?.inventory || [],
        centres: data?.centres || [],
        allocations: data?.allocations || [],
      })
      setDrafts({})
      setReviewedDuplicates({})
      setUpdatedAt(Date.now())
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true)
    await loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    let refreshTimer
    const refresh = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(loadDashboard, 300)
    }
    const channel = supabase.channel('ngo-allocation-dashboard')
    for (const table of [
      'assistance_requests',
      'assistance_request_needs',
      'assistance_request_need_items',
      'disaster_incidents',
      'inventory',
      'request_assignments',
      'allocations',
      'allocation_items',
      'deliveries',
      'ngo_allocation_recommendations',
    ]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
    }
    channel.subscribe()
    loadDashboard()
    const timeInterval = window.setInterval(() => setUpdatedAt(Date.now()), 60000)
    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(timeInterval)
      supabase.removeChannel(channel)
    }
  }, [loadDashboard])

  const recommendations = useMemo(
    () => buildRecommendations(dashboard.requests, dashboard.inventory, updatedAt),
    [dashboard, updatedAt]
  )
  const pendingRecommendations = recommendations.filter((request) =>
    ['submitted', 'acknowledged', 'assigned'].includes(request.status)
  )
  const criticalNeeds = pendingRecommendations.filter((request) => request.recommendationPriority === 'Critical').length
  const shortages = pendingRecommendations.reduce((total, request) =>
    total + request.recommendationItems.filter((item) => item.quantityKnown && item.shortage > 0).length, 0)
  const proposedRequests = dashboard.requests.filter((request) => request.recommendation_status === 'proposed')
  const proposedCount = proposedRequests.length
  const activeAllocations = dashboard.allocations.filter((allocation) =>
    ['approved', 'dispatched'].includes(allocation.status)
      && !['delivered', 'cancelled'].includes(allocation.delivery_status)
  )

  const quantitiesFor = (request, recommendation) => {
    const saved = new Map((request.recommendation_items || []).map((item) => [
      item.inventory_id,
      String(item.quantity),
    ]))
    const overrides = drafts[request.id] || {}
    return recommendation.recommendationItems.map((item) => ({
      ...item,
      approvalQuantity: overrides[item.inventoryId]
        ?? saved.get(item.inventoryId)
        ?? String(item.recommendedQuantity),
      onQuantityChange: (value) => setDrafts((current) => ({
        ...current,
        [request.id]: { ...(current[request.id] || {}), [item.inventoryId]: value },
      })),
    }))
  }

  const proposalPayloadFor = (request, recommendation) => quantitiesFor(request, recommendation)
    .filter((item) => item.inventoryId && item.quantityKnown && Number(item.approvalQuantity) > 0)
    .map((item) => ({ inventory_id: item.inventoryId, quantity: Number(item.approvalQuantity) }))

  const hasProposalChanges = (request, recommendation) => {
    if (!request.recommendation_id) return false
    const existing = new Map((request.recommendation_items || []).map((item) => [
      item.inventory_id,
      Number(item.quantity),
    ]))
    const proposed = proposalPayloadFor(request, recommendation)
    const staleFairShares = (request.recommendation_items || []).some((saved) => {
      const line = recommendation.recommendationItems.find((item) => item.inventoryId === saved.inventory_id)
      return !line || Number(saved.quantity) > Math.min(line.available, line.recommendedQuantity)
    })
    return staleFairShares
      || proposed.length !== existing.size
      || proposed.some((item) => existing.get(item.inventory_id) !== item.quantity)
  }

  const saveRecommendation = async (request, recommendation) => {
    setBusyId(request.id)
    setActionError('')
    const editableLines = quantitiesFor(request, recommendation)
    const invalidLine = editableLines.find((item) => {
      const value = String(item.approvalQuantity)
      return value !== '' && !/^\d{1,11}(?:\.\d{1,3})?$/.test(value)
    })
    if (invalidLine) {
      setActionError(`Enter a valid quantity (up to three decimal places) for ${invalidLine.name}.`)
      setBusyId('')
      return
    }
    const items = proposalPayloadFor(request, recommendation)
    if (!items.length) {
      setActionError('No matching, quantified supplies have a positive recommended allocation. Clarify the request or update inventory first.')
      setBusyId('')
      return
    }
    if (editableLines.some((item) =>
      Number(item.approvalQuantity || 0) > Math.min(item.available, item.recommendedQuantity)
    )) {
      setActionError('An allocation cannot exceed its available stock or fair-share recommendation.')
      setBusyId('')
      return
    }
    const { error: saveError } = await supabase.rpc('save_ngo_allocation_recommendation', {
      target_request_id: request.id,
      requested_items: items,
    })
    setBusyId('')
    if (saveError) {
      setActionError(`Could not save the recommendation: ${saveError.message}`)
      return
    }
    notify(`Recommendation for ${request.request_code} saved for approval. No stock has been deducted.`)
    await refreshDashboard()
  }

  const approveRecommendation = async (request) => {
    if (request.duplicate_matches?.length && !reviewedDuplicates[request.id]) {
      setActionError('Review the possible duplicate warning before approving this request.')
      return
    }
    if (!window.confirm(`Approve the saved allocation for ${request.request_code}? This will deduct stock and create a Preparing delivery.`)) {
      return
    }
    setBusyId(request.id)
    setActionError('')
    const { data: requestCode, error: approveError } = await supabase.rpc('approve_ngo_allocation_recommendation', {
      target_recommendation_id: request.recommendation_id,
    })
    setBusyId('')
    if (approveError) {
      setActionError(`Could not approve ${request.request_code}: ${approveError.message}`)
      await refreshDashboard()
      return
    }
    notify(`${requestCode} approved. Inventory was updated and a Preparing delivery was created.`)
    await refreshDashboard()
  }

  const createDelivery = async (allocation) => {
    setCreatingDeliveryId(allocation.id)
    setActionError('')
    const { data: deliveryCode, error: createError } = await supabase.rpc('create_delivery_for_allocation', {
      target_allocation_id: allocation.id,
    })
    setCreatingDeliveryId('')
    if (createError) {
      setActionError(`Could not create a delivery for ${allocation.request_code}: ${createError.message}`)
      return
    }
    notify(`Delivery ${deliveryCode} created.`)
    await refreshDashboard()
    goTo('Deliveries')
  }

  // Expand and scroll to the full review row when it is on this page, otherwise open the request inbox.
  const reviewProposal = (request) => {
    if (document.getElementById(`allocation-request-${request.id}`)) {
      setExpandedId(request.id)
      window.setTimeout(() => {
        document.getElementById(`allocation-request-${request.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } else goTo('Requests')
  }

  const togglePanel = (name) => setOpenPanel((current) => (current === name ? '' : name))

  const alertClass = 'mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'

  return (
    <>
      <PageHeader
        title="Allocation AI"
        subtitle="Prioritize urgent needs using available stock and request details."
      >
        <button
          type="button"
          onClick={refreshDashboard}
          disabled={refreshing || loading}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Refresh
        </button>
      </PageHeader>

      {error && <p role="alert" className={alertClass}><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}
      {actionError && <p role="alert" className={alertClass}><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{actionError}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading…
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric label="Pending" value={pendingRecommendations.length} tone="sky" icon={ClipboardCheck} />
            <Metric label="Critical needs" value={criticalNeeds} tone="rose" icon={ShieldAlert} />
            <Metric label="Inventory shortages" value={shortages} tone="amber" icon={Package} />
            <Metric label="Awaiting approval" value={proposedCount} tone="emerald" icon={FileCheck2} />
          </div>

          <section aria-labelledby="requests-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="requests-heading" className="text-lg font-extrabold text-slate-950">Requests to review</h2>
              <button type="button" onClick={() => goTo('Requests')} className={`inline-flex items-center gap-1 rounded-lg px-1 text-sm font-semibold text-sky-700 hover:text-sky-900 ${focusRing}`}>
                Request inbox <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>

            {pendingRecommendations.length ? (
              <ul className="space-y-2.5">
                {pendingRecommendations.map((request) => {
                  const proposalLines = quantitiesFor(request, request)
                  const hasSavedProposal = request.recommendation_status === 'proposed' && request.recommendation_id
                  const proposalChanged = hasSavedProposal && hasProposalChanges(request, request)
                  const duplicateReviewed = !request.duplicate_matches?.length || reviewedDuplicates[request.id]
                  const isOpen = expandedId === request.id
                  const supplyNames = request.recommendationItems.map((item) => item.name)
                  return (
                    <li key={request.id} id={`allocation-request-${request.id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex">
                        <span className={`w-1 shrink-0 ${priorityBar[request.recommendationPriority] || priorityBar.Low}`} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4">
                            <div className="flex items-center gap-2 sm:w-40 sm:shrink-0 sm:flex-col sm:items-start sm:gap-1.5">
                              <StatusBadge className={priorityTone[request.recommendationPriority] || priorityTone.Low}>
                                {request.recommendationPriority} · {request.recommendationScore}
                              </StatusBadge>
                              <span className="text-xs font-bold text-slate-500">{request.request_code}</span>
                              {hasSavedProposal && (
                                <StatusBadge className="bg-emerald-100 text-emerald-800 ring-emerald-200 sm:hidden">
                                  <FileCheck2 size={12} aria-hidden="true" /> Saved
                                </StatusBadge>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="flex items-start gap-1.5 font-bold leading-snug text-slate-950">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
                                <span className="min-w-0 break-words">{request.location_text}</span>
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {supplyNames.slice(0, 3).map((name) => (
                                  <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{name}</span>
                                ))}
                                {supplyNames.length > 3 && <span className="text-xs font-semibold text-slate-500">+{supplyNames.length - 3}</span>}
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  <Users size={13} aria-hidden="true" /> {Number(request.people_affected).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:shrink-0">
                              {hasSavedProposal && (
                                <StatusBadge className="hidden bg-emerald-100 text-emerald-800 ring-emerald-200 sm:inline-flex">
                                  <FileCheck2 size={12} aria-hidden="true" /> Saved
                                </StatusBadge>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedId(isOpen ? '' : request.id)}
                                aria-expanded={isOpen}
                                aria-controls={`allocation-detail-${request.id}`}
                                className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold sm:w-auto ${focusRing} ${isOpen ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                              >
                                {isOpen ? 'Close' : 'Review'}
                                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div id={`allocation-detail-${request.id}`} className="border-t border-slate-100 bg-slate-50/50 p-3.5 sm:p-4">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" /> {new Date(request.created_at).toLocaleString()}</span>
                                {request.incident_title && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <AlertTriangle size={13} aria-hidden="true" />
                                    <span className="font-semibold text-slate-800">{request.incident_title}</span>
                                    {request.incident_severity && ` · ${request.incident_severity}`}
                                  </span>
                                )}
                              </div>

                              {request.recommendationReasons.length > 0 && (
                                <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Why this priority">
                                  {request.recommendationReasons.map((reason) => (
                                    <li key={reason} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 ring-1 ring-inset ring-sky-100">{reason}</li>
                                  ))}
                                </ul>
                              )}

                              {request.needs.some((need) => need.details || need.medical_type) && (
                                <div className="mt-2.5 space-y-1">
                                  {request.needs.map((need) => (
                                    <p key={need.category} className="text-xs text-slate-600">
                                      <span className="font-semibold text-slate-700">{need.category}{need.medical_type ? ` · ${need.medical_type}` : ''}</span>
                                      {need.details && ` — ${need.details}`}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {request.duplicate_matches?.length > 0 && (
                                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                                  <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
                                    <AlertTriangle size={16} aria-hidden="true" /> Possible duplicate
                                  </p>
                                  <ul className="mt-1 list-inside list-disc text-xs text-amber-900">
                                    {request.duplicate_matches.map((match) => <li key={match.request_code}>{match.request_code}: {match.reason}</li>)}
                                  </ul>
                                  <label className="mt-2 flex items-start gap-2 text-xs font-medium text-amber-950">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(reviewedDuplicates[request.id])}
                                      onChange={(event) => setReviewedDuplicates((current) => ({ ...current, [request.id]: event.target.checked }))}
                                      className="mt-0.5 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
                                    />
                                    I reviewed these matches.
                                  </label>
                                </div>
                              )}

                              <h3 className="mb-2 mt-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                                <PackageCheck size={16} className="text-sky-700" aria-hidden="true" /> Supplies
                              </h3>
                              <SupplyList items={proposalLines} />

                              <NearbyInsights request={request} requests={dashboard.requests} centres={dashboard.centres} />

                              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-slate-500">
                                  {hasSavedProposal
                                    ? proposalChanged ? 'Unsaved edits — save before approval.' : 'Saved · stock not deducted yet.'
                                    : 'Stock changes only after approval.'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => saveRecommendation(request, request)}
                                    disabled={busyId === request.id || !duplicateReviewed}
                                    className={`h-10 rounded-xl border border-sky-200 bg-white px-4 text-sm font-bold text-sky-800 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                                  >
                                    {busyId === request.id ? 'Saving…' : hasSavedProposal ? 'Save changes' : 'Save for approval'}
                                  </button>
                                  {hasSavedProposal && (
                                    <button
                                      type="button"
                                      onClick={() => approveRecommendation(request)}
                                      disabled={busyId === request.id || proposalChanged || !duplicateReviewed}
                                      className={`inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                                    >
                                      <CheckCircle2 size={16} aria-hidden="true" />
                                      {busyId === request.id ? 'Approving…' : 'Approve & allocate'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-7 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                  <CheckCircle2 size={22} aria-hidden="true" />
                </span>
                <h3 className="font-extrabold text-slate-950">All caught up</h3>
                <button
                  type="button"
                  onClick={() => goTo('Requests')}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 ${focusRing}`}
                >
                  <Inbox size={16} aria-hidden="true" /> Open request inbox
                </button>
              </div>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2" aria-label="Proposals and deliveries">
            <SummaryCard
              icon={Clock3}
              iconClass="bg-amber-50 text-amber-700 ring-amber-100"
              label="Saved proposals"
              count={proposedCount}
              open={openPanel === 'proposals'}
              onClick={() => togglePanel('proposals')}
              controls="panel-proposals"
            />
            <SummaryCard
              icon={Truck}
              iconClass="bg-sky-50 text-sky-700 ring-sky-100"
              label="Allocations in progress"
              count={activeAllocations.length}
              open={openPanel === 'progress'}
              onClick={() => togglePanel('progress')}
              controls="panel-progress"
            />
          </section>

          {openPanel === 'proposals' && (
            <div id="panel-proposals" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              {proposedRequests.length ? (
                <ul className="space-y-2">
                  {proposedRequests.map((request) => {
                    const lineCount = (request.recommendation_items || []).length
                    return (
                      <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{request.request_code}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-600">
                            <MapPin size={12} className="shrink-0" aria-hidden="true" /> {request.location_text}
                            {lineCount > 0 && <span className="shrink-0"> · {lineCount} {lineCount === 1 ? 'item' : 'items'}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge className={allocationTone.proposed}>Awaiting approval</StatusBadge>
                          <button
                            type="button"
                            onClick={() => reviewProposal(request)}
                            className={`inline-flex h-9 items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50 ${focusRing}`}
                          >
                            Review <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-500"><FileCheck2 size={18} className="text-slate-400" aria-hidden="true" /> No proposals awaiting approval.</p>
              )}
            </div>
          )}

          {openPanel === 'progress' && (
            <div id="panel-progress" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              {activeAllocations.length ? (
                <ul className="space-y-2">
                  {activeAllocations.map((allocation) => {
                    const stage = deliveryStageIndex(allocation)
                    const progress = Math.round(((stage + 1) / deliveryStages.length) * 100)
                    return (
                      <li key={allocation.id} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{allocation.request_code}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                              <MapPin size={12} className="shrink-0" aria-hidden="true" /> {allocation.location_text}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge className={allocationTone[allocation.status] || allocationTone.approved}>{allocation.status}</StatusBadge>
                            {allocation.delivery_code ? (
                              <button
                                type="button"
                                onClick={() => goTo('Deliveries')}
                                className={`inline-flex h-9 items-center gap-1 rounded-lg border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-800 hover:bg-sky-50 ${focusRing}`}
                              >
                                {allocation.delivery_code} <ArrowRight size={13} aria-hidden="true" />
                              </button>
                            ) : allocation.status === 'approved' ? (
                              <button
                                type="button"
                                onClick={() => createDelivery(allocation)}
                                disabled={creatingDeliveryId === allocation.id}
                                className={`h-9 rounded-lg border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-60 ${focusRing}`}
                              >
                                {creatingDeliveryId === allocation.id ? 'Creating…' : 'Create delivery'}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                            <span>
                              {allocation.delivery_code
                                ? `Delivery ${readable(allocation.delivery_status) || 'pending'}`
                                : 'Delivery pending'}
                            </span>
                            <span className="font-semibold text-slate-700">{deliveryStages[stage]}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${allocation.request_code} delivery progress`}>
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress}%` }} />
                          </div>
                          <ol className="mt-1.5 grid grid-cols-4 gap-1 text-[10px] text-slate-400">
                            {deliveryStages.map((label, index) => (
                              <li key={label} className={`truncate ${index <= stage ? 'font-semibold text-sky-700' : ''}`}>{label}</li>
                            ))}
                          </ol>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-500"><Truck size={18} className="text-slate-400" aria-hidden="true" /> No allocations in progress.</p>
              )}
            </div>
          )}

          <p className="text-right text-xs text-slate-400">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </>
  )
}