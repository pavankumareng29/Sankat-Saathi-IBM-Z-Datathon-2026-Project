import { supabase } from './supabase'

const queryData = async (query, label) => {
  const { data, error } = await query
  if (error) throw new Error(`Could not load ${label}: ${error.message}`)
  return data || []
}

const priorityLabel = (priority) => priority.charAt(0).toUpperCase() + priority.slice(1)
const timeLabel = (createdAt) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`
  return `${Math.round(minutes / 1440)} day(s) ago`
}

export async function getDashboardData(user) {
  const requestsPromise = queryData(
    supabase.from('assistance_requests')
      .select('id, request_code, category, medical_type, details, people_affected, location_text, priority, status, created_at')
      .order('created_at', { ascending: false }),
    'relief requests'
  )
  const deliveriesPromise = queryData(
    supabase.from('deliveries')
      .select('id, delivery_code, allocation_id, status, eta')
      .order('created_at', { ascending: false }),
    'deliveries'
  )
  const allocationsPromise = queryData(
    supabase.from('allocations')
      .select('id, request_id, partner_id, status, notes, created_at')
      .order('created_at', { ascending: false }),
    'allocations'
  )
  const [requestsRows, deliveriesRows, allocationRows] = await Promise.all([
    requestsPromise,
    deliveriesPromise,
    allocationsPromise,
  ])

  let partnerIds = []
  if (user.role === 'ngo') {
    const memberships = await queryData(
      supabase.from('ngo_memberships')
        .select('partner_id')
        .eq('profile_id', user.id)
        .eq('status', 'active'),
      'your NGO membership'
    )
    partnerIds = memberships.map((membership) => membership.partner_id)
  }

  const inventoryRows = user.role === 'citizen' || (user.role === 'ngo' && partnerIds.length === 0)
    ? []
    : await queryData(
      supabase.from('inventory')
        .select('id, partner_id, quantity, reserved_quantity, resource:resource_catalog(name, unit)')
        .order('updated_at', { ascending: false })
        .limit(500),
      'inventory'
    )
  const visibleInventory = user.role === 'ngo'
    ? inventoryRows.filter((row) => partnerIds.includes(row.partner_id))
    : inventoryRows

  const requests = requestsRows.map((request) => ({
    id: request.request_code,
    requestId: request.id,
    area: request.location_text,
    need: [request.category, request.medical_type, request.details].filter(Boolean).join(' · '),
    people: request.people_affected,
    priority: priorityLabel(request.priority),
    time: timeLabel(request.created_at),
    status: request.status,
  }))
  const requestById = new Map(requestsRows.map((request) => [request.id, request]))
  const allocationById = new Map(allocationRows.map((allocation) => [allocation.id, allocation]))

  const inventory = visibleInventory.map((row) => {
    const resource = Array.isArray(row.resource) ? row.resource[0] : row.resource
    const quantity = Number(row.quantity)
    const available = Math.max(0, quantity - Number(row.reserved_quantity))
    const progress = quantity > 0 ? Math.round((available / quantity) * 100) : 0
    return {
      id: row.id,
      item: resource?.name || 'Unknown resource',
      available,
      unit: resource?.unit || 'units',
      progress,
      state: progress <= 15 ? 'Low' : progress <= 40 ? 'Watch' : 'Healthy',
    }
  })

  const deliveries = deliveriesRows.map((delivery) => {
    const allocation = allocationById.get(delivery.allocation_id)
    const request = allocation ? requestById.get(allocation.request_id) : null
    const status = delivery.status.replaceAll('_', ' ')
    return {
      id: delivery.delivery_code,
      allocationId: delivery.allocation_id,
      destination: request?.location_text || delivery.delivery_code,
      eta: delivery.eta ? new Date(delivery.eta).toLocaleString() : 'Not set',
      status: status.charAt(0).toUpperCase() + status.slice(1),
      statusValue: delivery.status,
      progress: delivery.status === 'delivered' ? 100 : delivery.status === 'en_route' ? 65 : delivery.status === 'loading' ? 30 : 5,
    }
  })

  const allocations = allocationRows.map((allocation) => {
    const request = requestById.get(allocation.request_id)
    return {
      id: allocation.id,
      zone: request?.location_text || allocation.request_id,
      confidence: null,
      action: allocation.notes || `Relief request ${request?.request_code || allocation.request_id}`,
      reason: `Allocation status: ${allocation.status.replaceAll('_', ' ')}`,
      status: allocation.status,
    }
  })

  const activeRequests = requestsRows.filter((request) => !['fulfilled', 'cancelled'].includes(request.status))
  const peopleReached = requestsRows
    .filter((request) => request.status === 'fulfilled')
    .reduce((total, request) => total + request.people_affected, 0)
  const completedDeliveries = deliveriesRows.filter((delivery) => delivery.status === 'delivered').length
  const criticalRequests = activeRequests.filter((request) => request.priority === 'critical').length
  const deliveryRate = deliveriesRows.length
    ? `${Math.round((completedDeliveries / deliveriesRows.length) * 100)}%`
    : '—'

  return {
    stats: [
      { label: 'Open requests', value: activeRequests.length.toLocaleString(), change: `${requestsRows.length} total`, tone: 'amber' },
      { label: 'People reached', value: peopleReached.toLocaleString(), change: 'Requests fulfilled', tone: 'emerald' },
      { label: 'Critical requests', value: criticalRequests.toString().padStart(2, '0'), change: 'Needs urgent action', tone: 'rose' },
      { label: 'Completed deliveries', value: deliveryRate, change: `${completedDeliveries} delivered`, tone: 'sky' },
    ],
    requests,
    inventory,
    deliveries,
    allocations,
  }
}
