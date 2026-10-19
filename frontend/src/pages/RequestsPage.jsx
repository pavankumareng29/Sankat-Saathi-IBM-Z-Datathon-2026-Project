import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle, RefreshCw, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Panel from '../components/Panel'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { allowedResourceCodesForNeed, requestedItemsForNeed, RESOURCE_OPTIONS } from '../services/resourceMapping'

const priorityTone = {
  critical: 'bg-rose-100 text-rose-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const timeAgo = (value) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`
  return `${Math.round(minutes / 1440)} day(s) ago`
}

const AllocationQuantityInput = memo(function AllocationQuantityInput({
  item,
  initialValue,
  onQuantityChange,
}) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : '')
  const quantity = Number(value)
  const invalid = value !== '' && (!Number.isFinite(quantity) || quantity > item.available)

  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue === '' || /^\d{0,11}(?:\.\d{0,3})?$/.test(nextValue)) {
            setValue(nextValue)
            onQuantityChange(item.inventoryId, nextValue)
          }
        }}
        aria-label={`${item.name} allocation quantity`}
        aria-invalid={invalid}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 sm:w-44 ${
          invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-sky-500 focus:ring-sky-100'
        }`}
        placeholder={`Quantity (${item.unit})`}
      />
      {invalid && <p className="mt-1 text-xs text-rose-700">Maximum available: {item.available.toLocaleString()} {item.unit}</p>}
    </div>
  )
})

export default function RequestsPage({ notify = () => {} }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acceptingId, setAcceptingId] = useState('')
  const [allocationRequest, setAllocationRequest] = useState(null)
  const [allocationStock, setAllocationStock] = useState([])
  const [unavailableItems, setUnavailableItems] = useState([])
  const stockQuantitiesRef = useRef({})
  const [loadingStock, setLoadingStock] = useState(false)
  const [error, setError] = useState('')
  const [membershipRequired, setMembershipRequired] = useState(false)
  const updateStockQuantity = useCallback((inventoryId, quantity) => {
    stockQuantitiesRef.current[inventoryId] = quantity
  }, [])

  const loadRequests = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    setMembershipRequired(false)

    const { data, error: loadError } = await supabase.rpc('get_ngo_request_inbox')
    let refreshedRequests = []
    if (loadError) {
      const message = loadError.message.toLowerCase()
      const needsMembership = message.includes('ngo membership') || message.includes('ngo partner')
      setMembershipRequired(needsMembership)
      setError(needsMembership
        ? 'This NGO login is not linked to an approved NGO partner yet.'
        : `Could not load the NGO request inbox: ${loadError.message}`)
      setRequests([])
    } else {
      const inbox = data || []
      if (inbox.length) {
        const { data: detailsRows, error: detailsError } = await supabase.rpc('get_ngo_request_details', {
          request_ids: inbox.map((request) => request.id),
        })
        if (detailsError) {
          setError(`Requests loaded, but supply and allocation details could not be loaded: ${detailsError.message}`)
          refreshedRequests = inbox
        } else {
          const detailsByRequestId = new Map((detailsRows || []).map((row) => [row.request_id, row]))
          refreshedRequests = inbox.map((request) => ({ ...request, ...detailsByRequestId.get(request.id) }))
        }
      }
    }
    setRequests(refreshedRequests)
    setLoading(false)
    setRefreshing(false)
    return refreshedRequests
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  useEffect(() => {
    let refreshTimer
    const refreshInbox = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => loadRequests(true), 250)
    }
    const channel = supabase.channel(`ngo-request-sync-${user.id}`)
    for (const table of ['assistance_requests', 'assistance_request_needs', 'assistance_request_need_items', 'request_assignments', 'inventory', 'allocations', 'allocation_items', 'deliveries']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refreshInbox)
    }
    channel.subscribe()
    return () => {
      window.clearTimeout(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [loadRequests, user.id])

  const visibleRequests = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return requests
    return requests.filter((request) =>
      [
        request.request_code,
        request.category,
        request.medical_type,
        request.details,
        request.location_text,
        request.priority,
      ].some((field) => String(field || '').toLowerCase().includes(value))
    )
  }, [requests, query])

  const openAcceptanceForm = async (request) => {
    setAllocationRequest(request)
    setAllocationStock([])
    setUnavailableItems([])
    stockQuantitiesRef.current = {}
    setLoadingStock(true)
    setError('')

    const { data: memberships, error: membershipError } = await supabase
      .from('ngo_memberships')
      .select('partner_id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .order('created_at')
      .limit(1)

    if (membershipError) {
      setError(`Could not load your NGO membership: ${membershipError.message}`)
      setLoadingStock(false)
      return
    }

    const partnerId = memberships?.[0]?.partner_id
    if (!partnerId) {
      setError('Your NGO account is not linked to an active partner.')
      setLoadingStock(false)
      return
    }

    const { data: inventoryRows, error: inventoryError } = await supabase
      .from('inventory')
      .select('id, quantity, reserved_quantity, resource:resource_catalog(name, unit, resource_code)')
      .eq('partner_id', partnerId)
      .is('centre_id', null)
      .order('updated_at', { ascending: false })

    if (inventoryError) {
      setError(`Could not load your available inventory: ${inventoryError.message}`)
      setLoadingStock(false)
      return
    }

    const needs = request.needs?.length ? request.needs : [{ category: request.category, medical_type: request.medical_type, details: request.details }]
    const allowedCodes = new Set(needs.flatMap((need) => [...allowedResourceCodesForNeed(need)]))
    const requestedByCode = new Map()
    for (const item of needs.flatMap((need) => requestedItemsForNeed(need))) {
      const existing = requestedByCode.get(item.resourceCode)
      if (existing && existing.unit === item.unit) {
        existing.quantity += item.quantity
      } else {
        requestedByCode.set(item.resourceCode, { ...item })
      }
    }
    const stock = (inventoryRows || []).map((row) => {
      const resource = Array.isArray(row.resource) ? row.resource[0] : row.resource
      return {
        inventoryId: row.id,
        resourceCode: resource?.resource_code,
        name: resource?.name || 'Unknown resource',
        unit: resource?.unit || 'units',
        available: Math.max(0, Number(row.quantity) - Number(row.reserved_quantity)),
        requestedQuantity: requestedByCode.get(resource?.resource_code)?.unit === resource?.unit
          ? requestedByCode.get(resource?.resource_code).quantity
          : null,
      }
    }).filter((item) => item.resourceCode && allowedCodes.has(item.resourceCode))
      .sort((left, right) => left.name.localeCompare(right.name))
    setUnavailableItems([...requestedByCode.values()].filter((requested) =>
      !stock.some((item) => item.resourceCode === requested.resourceCode && item.unit === requested.unit)
    ).map((item) => ({
      ...item,
      name: RESOURCE_OPTIONS.find((resource) => resource.code === item.resourceCode)?.name || item.resourceCode,
    })))
    for (const item of stock) {
      stockQuantitiesRef.current[item.inventoryId] = item.requestedQuantity === null
        ? ''
        : String(item.requestedQuantity)
    }
    setAllocationStock(stock)
    setLoadingStock(false)
  }

  const acceptRequest = async (request) => {
    const needs = request.needs?.length ? request.needs : [{
      category: request.category,
      medical_type: request.medical_type,
      details: request.details,
    }]
    const requestedByCode = new Map()
    for (const item of needs.flatMap((need) => requestedItemsForNeed(need))) {
      const existing = requestedByCode.get(item.resourceCode)
      if (existing && existing.unit === item.unit) {
        existing.quantity += item.quantity
      } else {
        requestedByCode.set(item.resourceCode, { ...item })
      }
    }
    const requestedItems = allocationStock
      .map((item) => ({ inventory_id: item.inventoryId, quantity: Number(stockQuantitiesRef.current[item.inventoryId] || 0) }))
      .filter((item) => item.quantity > 0)

    if (!requestedItems.length) {
      setError('Enter a quantity for at least one inventory item to accept this request.')
      return
    }
    const exceedsStock = requestedItems.find((item) => {
      const stock = allocationStock.find((entry) => entry.inventoryId === item.inventory_id)
      const requested = requestedByCode.get(stock?.resourceCode)
      return !stock || item.quantity > stock.available || (requested && item.quantity > requested.quantity)
    })
    if (exceedsStock) {
      setError('An allocation quantity is greater than the citizen request or available stock.')
      return
    }

    setAcceptingId(request.id)
    setError('')
    const { data: requestCode, error: acceptError } = await supabase.rpc('accept_assistance_request', {
      target_request_id: request.id,
      requested_items: requestedItems,
    })

    setAcceptingId('')
    if (acceptError) {
      const refreshedRequests = await loadRequests(true)
      const savedRequest = refreshedRequests.find((item) =>
        item.id === request.id && item.allocated_items?.length
      )
      if (savedRequest) {
        setAllocationRequest(null)
        setError('')
        notify(`${request.request_code} was accepted. The saved allocation has been reloaded.`)
        return
      }
      setError(`Could not accept ${request.request_code}: ${acceptError.message}`)
      return
    }

    setAllocationRequest(null)
    notify(`${requestCode} accepted. Inventory quantities were updated.`)
    await loadRequests(true)
  }

  return (
    <>
      <PageHeader title="Relief requests" subtitle="Review citizen requests and allocate the supplies your NGO will provide.">
        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
          Refresh
        </button>
      </PageHeader>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
          {membershipRequired && (
            <div className="mt-2 space-y-1 text-rose-900">
              <p>Signed in as <strong>{user?.email || user?.name}</strong>. Ask your platform administrator to:</p>
              <ol className="list-inside list-decimal">
                <li>Open <strong>Admin → NGO Partners</strong> and choose the correct organisation.</li>
                <li>Select this registered login under <strong>Manage members</strong>, then choose <strong>Link and approve</strong>.</li>
                <li>Refresh this Requests page after approval.</li>
              </ol>
              <p className="pt-1">If no NGO account appears in the list, register this login with the NGO operator role first.</p>
            </div>
          )}
        </div>
      )}

      <Panel title={`Request inbox · ${requests.length}`}>
        <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search requests</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search location, request, or need" />
        </label>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading requests…
          </div>
        ) : visibleRequests.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {requests.length ? 'No requests match your search.' : 'No citizen requests are available for your NGO right now.'}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-900">{request.category}{request.medical_type ? ` · ${request.medical_type}` : ''}</h2>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityTone[request.priority] || priorityTone.medium}`}>{request.priority}</span>
                      {request.assigned_to_partner && (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          {request.status === 'in_progress' ? 'Accepted by your NGO' : 'Assigned to your NGO'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{request.location_text}</p>
                    {request.needs?.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {request.needs.map((need) => (
                          <li key={need.category}>
                            <span className="font-medium">{need.category}</span>
                            {need.medical_type && ` · ${need.medical_type}`}
                            {need.details && ` · ${need.details}`}
                            {need.items?.length > 0 && (
                              <ul className="ml-4 mt-1 list-disc space-y-0.5 text-slate-600">
                                {need.items.map((item) => (
                                  <li key={item.resource_code}>
                                    {item.name}: {Number(item.requested_quantity).toLocaleString()} {item.unit}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : request.details && <p className="mt-2 text-sm text-slate-700">{request.details}</p>}
                    <p className="mt-2 text-xs text-slate-500">
                      {request.request_code} · {request.people_affected} people affected · {timeAgo(request.created_at)}
                    </p>
                    {request.assigned_to_partner
                      ? <p className="mt-2 text-sm font-medium text-slate-700">{request.contact_name || 'Citizen'}{request.contact_phone && <> · <a href={`tel:${request.contact_phone}`} className="text-sky-700 hover:underline">{request.contact_phone}</a></>}</p>
                      : <p className="mt-1 text-xs text-slate-500">Citizen contact details become available to your NGO after you claim the request.</p>}
                  </div>
                </div>
                {request.assigned_to_partner && request.allocation_status ? (
                    <section className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">Saved allocation</h3>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold capitalize text-emerald-800">
                          {request.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      {request.allocated_items?.length ? (
                        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                          {request.allocated_items.map((item) => (
                            <li key={item.inventory_id} className="flex justify-between gap-4">
                              <span>{item.name}</span>
                              <span className="shrink-0 font-semibold">{Number(item.quantity).toLocaleString()} {item.unit}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-2 text-sm text-slate-600">No supplies have been allocated.</p>}
                      <p className="mt-3 text-xs text-slate-600">
                        Delivery status: {request.delivery_status
                          ? request.delivery_status.replaceAll('_', ' ')
                          : request.status === 'fulfilled' ? 'delivered' : request.allocation_status.replaceAll('_', ' ')}
                      </p>
                    </section>
                  ) : allocationRequest?.id === request.id ? (
                  <form
                    onSubmit={(event) => { event.preventDefault(); acceptRequest(request) }}
                    className="mt-5 rounded-xl bg-slate-50 p-4"
                  >
                    <h3 className="font-semibold text-slate-900">Choose supplies for this request</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.needs?.length
                        ? `Requested: ${request.needs.map((need) => need.category).join(', ')}. `
                        : `Requested: ${request.category}. `}
                      Selected quantities are deducted from your NGO's inventory when accepted.
                    </p>
                    {unavailableItems.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <p className="font-semibold">Requested supplies not in your current stock</p>
                        <ul className="mt-1 list-inside list-disc">
                          {unavailableItems.map((item) => (
                            <li key={item.resourceCode}>
                              {item.name}: {item.quantity.toLocaleString()} {item.unit} requested · 0 available
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-xs">Add these resources in Inventory before allocating them.</p>
                      </div>
                    )}
                    {loadingStock ? (
                      <div className="flex items-center gap-2 py-5 text-sm text-slate-500">
                        <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Loading inventory…
                      </div>
                    ) : allocationStock.length ? (
                      <div className="mt-4 space-y-3">
                        {allocationStock.map((item) => (
                          <label key={item.inventoryId} className="grid gap-1 text-sm font-medium text-slate-700 sm:grid-cols-[1fr_auto] sm:items-center">
                            <span>
                              {item.name}
                              {item.requestedQuantity !== null && <span className="font-normal text-slate-500"> · Citizen requested {item.requestedQuantity.toLocaleString()} {item.unit}</span>}
                              <span className="font-normal text-slate-500"> · {item.available.toLocaleString()} {item.unit} available</span>
                            </span>
                            <AllocationQuantityInput
                              item={item}
                              initialValue={item.requestedQuantity}
                              onQuantityChange={updateStockQuantity}
                            />
                          </label>
                        ))}
                      </div>
                    ) : unavailableItems.length > 0 || (request.assigned_to_partner && ['accepted', 'in_progress'].includes(request.status)) ? null : (
                      <p className="mt-3 text-sm text-amber-800">No matching supplies are available for this request. Add the requested resource to central-store inventory before accepting.</p>
                    )}
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setAllocationRequest(null); setError('') }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loadingStock || !allocationStock.length || !!acceptingId}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {acceptingId === request.id ? 'Accepting…' : 'Accept request'}
                      </button>
                    </div>
                  </form>
                ) : request.assigned_to_partner && ['accepted', 'in_progress'].includes(request.status) ? null : (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => openAcceptanceForm(request)}
                      disabled={loadingStock || !!acceptingId}
                      className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {request.assigned_to_partner ? 'Accept & allocate' : 'Accept request'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
