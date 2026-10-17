import { supabase } from './supabase'

const RECENT_WINDOW = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

async function queryRows(query, label) {
  const { data, error } = await query
  if (error) throw new Error(`Could not load ${label} notifications: ${error.message}`)
  return data || []
}

function makeNotification(type, rowId, timestamp, title, message, page) {
  return {
    id: `${type}:${rowId}:${timestamp}`,
    timestamp,
    title,
    message,
    page,
  }
}

function readable(value) {
  return String(value || '').replaceAll('_', ' ')
}

function changedAfterCreated(row) {
  return row.updated_at && row.created_at
    && new Date(row.updated_at).getTime() > new Date(row.created_at).getTime() + 1000
}

function addRequestNotifications(notifications, requests, page) {
  for (const request of requests) {
    notifications.push(makeNotification(
      'request-created',
      request.id,
      request.created_at,
      'New relief request',
      `${request.request_code} · ${request.category} · ${request.location_text || 'Location not provided'}`,
      page
    ))
    if (changedAfterCreated(request)) {
      notifications.push(makeNotification(
        'request-status',
        request.id,
        request.updated_at,
        `Request ${request.request_code} updated`,
        `Current status: ${readable(request.status)}.`,
        page
      ))
    }
  }
}

async function getCitizenNotifications(user) {
  const requests = await queryRows(
    supabase.from('assistance_requests')
      .select('id, request_code, category, location_text, status, created_at, updated_at')
      .eq('requester_id', user.id)
      .gte('updated_at', RECENT_WINDOW)
      .order('updated_at', { ascending: false })
      .limit(30),
    'your requests'
  )
  const notifications = []
  for (const request of requests) {
    notifications.push(makeNotification(
      'request-status',
      request.id,
      request.updated_at,
      `Request ${request.request_code}`,
      `${request.category} request · ${readable(request.status)}.`,
      'My Requests'
    ))
  }

  if (!requests.length) return notifications
  const requestIds = requests.map((request) => request.id)
  const assignments = await queryRows(
    supabase.from('request_assignments')
      .select('id, request_id, status, assigned_at, updated_at')
      .in('request_id', requestIds)
      .gte('updated_at', RECENT_WINDOW)
      .order('updated_at', { ascending: false })
      .limit(30),
    'request assignments'
  )
  for (const assignment of assignments) {
    const request = requests.find((item) => item.id === assignment.request_id)
    if (!request) continue
    notifications.push(makeNotification(
      'assignment',
      assignment.id,
      assignment.updated_at || assignment.assigned_at,
      `Request ${request.request_code} assigned`,
      `Relief coordination status: ${readable(assignment.status)}.`,
      'My Requests'
    ))
  }

  const allocations = await queryRows(
    supabase.from('allocations')
      .select('id, request_id')
      .in('request_id', requestIds),
    'your relief allocations'
  )
  if (!allocations.length) return notifications

  const deliveries = await queryRows(
    supabase.from('deliveries')
      .select('id, delivery_code, allocation_id, status, eta, created_at, updated_at')
      .in('allocation_id', allocations.map((allocation) => allocation.id))
      .gte('updated_at', RECENT_WINDOW)
      .order('updated_at', { ascending: false })
      .limit(30),
    'your deliveries'
  )
  for (const delivery of deliveries) {
    notifications.push(makeNotification(
      'delivery',
      delivery.id,
      delivery.updated_at || delivery.created_at,
      `Delivery ${delivery.delivery_code}`,
      `Delivery status: ${readable(delivery.status)}${delivery.eta ? ` · ETA ${new Date(delivery.eta).toLocaleString()}` : ''}.`,
      'My Requests'
    ))
  }

  if (deliveries.length) {
    const deliveryUpdates = await queryRows(
      supabase.from('delivery_updates')
        .select('id, delivery_id, message, created_at')
        .in('delivery_id', deliveries.map((delivery) => delivery.id))
        .gte('created_at', RECENT_WINDOW)
        .order('created_at', { ascending: false })
        .limit(30),
      'delivery updates'
    )
    const deliveryById = new Map(deliveries.map((delivery) => [delivery.id, delivery]))
    for (const update of deliveryUpdates) {
      const delivery = deliveryById.get(update.delivery_id)
      if (!delivery) continue
      notifications.push(makeNotification(
        'delivery-update',
        update.id,
        update.created_at,
        `Update for ${delivery.delivery_code}`,
        update.message,
        'My Requests'
      ))
    }
  }
  return notifications
}

async function getNgoNotifications(user) {
  const memberships = await queryRows(
    supabase.from('ngo_memberships')
      .select('partner_id')
      .eq('profile_id', user.id)
      .eq('status', 'active'),
    'your NGO membership'
  )
  const partnerIds = memberships.map((membership) => membership.partner_id)
  if (!partnerIds.length) return []

  const [assignments, deliveries, inventory] = await Promise.all([
    queryRows(
      supabase.from('request_assignments')
        .select('id, request_id, status, assigned_at, updated_at')
        .in('partner_id', partnerIds)
        .gte('updated_at', RECENT_WINDOW)
        .order('updated_at', { ascending: false })
        .limit(30),
      'assigned requests'
    ),
    queryRows(
      supabase.from('deliveries')
        .select('id, delivery_code, allocation_id, status, created_at, updated_at')
        .in('partner_id', partnerIds)
        .gte('updated_at', RECENT_WINDOW)
        .order('updated_at', { ascending: false })
        .limit(30),
      'your deliveries'
    ),
    queryRows(
      supabase.from('inventory')
        .select('id, quantity, reserved_quantity, updated_at, resource:resource_catalog(name, unit)')
        .in('partner_id', partnerIds)
        .gte('updated_at', RECENT_WINDOW)
        .order('updated_at', { ascending: false })
        .limit(100),
      'your inventory'
    ),
  ])
  const requestIds = [...new Set(assignments.map((assignment) => assignment.request_id))]
  const requests = requestIds.length
    ? await queryRows(
      supabase.from('assistance_requests')
        .select('id, request_code, category, location_text')
        .in('id', requestIds),
      'assigned request details'
    )
    : []
  const requestById = new Map(requests.map((request) => [request.id, request]))
  const notifications = []

  for (const assignment of assignments) {
    const request = requestById.get(assignment.request_id)
    notifications.push(makeNotification(
      'ngo-assignment',
      assignment.id,
      assignment.updated_at || assignment.assigned_at,
      request ? `Request ${request.request_code} assigned` : 'Request assignment updated',
      `${request?.category || 'Relief'} · ${request?.location_text || 'Location not provided'} · ${readable(assignment.status)}.`,
      'Requests'
    ))
  }
  for (const delivery of deliveries) {
    notifications.push(makeNotification(
      'ngo-delivery',
      delivery.id,
      delivery.updated_at || delivery.created_at,
      `Delivery ${delivery.delivery_code} updated`,
      `Current status: ${readable(delivery.status)}.`,
      'Deliveries'
    ))
  }
  for (const row of inventory) {
    const quantity = Number(row.quantity)
    const available = Math.max(0, quantity - Number(row.reserved_quantity))
    const resource = Array.isArray(row.resource) ? row.resource[0] : row.resource
    if (quantity <= 0 || available / quantity <= 0.15) {
      notifications.push(makeNotification(
        'ngo-inventory',
        row.id,
        row.updated_at,
        'Inventory running low',
        `${resource?.name || 'Resource'}: ${available} ${resource?.unit || 'units'} available.`,
        'Inventory'
      ))
    }
  }
  if (deliveries.length) {
    const updates = await queryRows(
      supabase.from('delivery_updates')
        .select('id, delivery_id, message, created_at')
        .in('delivery_id', deliveries.map((delivery) => delivery.id))
        .gte('created_at', RECENT_WINDOW)
        .order('created_at', { ascending: false })
        .limit(30),
      'delivery updates'
    )
    const deliveryById = new Map(deliveries.map((delivery) => [delivery.id, delivery]))
    for (const update of updates) {
      const delivery = deliveryById.get(update.delivery_id)
      if (!delivery) continue
      notifications.push(makeNotification(
        'ngo-delivery-update',
        update.id,
        update.created_at,
        `Update for ${delivery.delivery_code}`,
        update.message,
        'Deliveries'
      ))
    }
  }
  return notifications
}

async function getAdminNotifications() {
  const [requests, incidents, partners, memberships] = await Promise.all([
    queryRows(
      supabase.from('assistance_requests')
        .select('id, request_code, category, location_text, status, created_at, updated_at')
        .gte('created_at', RECENT_WINDOW)
        .order('created_at', { ascending: false })
        .limit(30),
      'new relief requests'
    ),
    queryRows(
      supabase.from('disaster_incidents')
        .select('id, title, hazard_type, area, severity, status, created_at, updated_at')
        .gte('updated_at', RECENT_WINDOW)
        .order('updated_at', { ascending: false })
        .limit(30),
      'incident updates'
    ),
    queryRows(
      supabase.from('ngo_partners')
        .select('id, name, status, created_at, updated_at')
        .gte('updated_at', RECENT_WINDOW)
        .order('updated_at', { ascending: false })
        .limit(20),
      'NGO partner updates'
    ),
    queryRows(
      supabase.from('ngo_memberships')
        .select('id, partner_id, profile_id, status, created_at, partner:ngo_partners(name)')
        .eq('status', 'pending')
        .gte('created_at', RECENT_WINDOW)
        .order('created_at', { ascending: false })
        .limit(20),
      'pending NGO membership requests'
    ),
  ])
  const notifications = []
  addRequestNotifications(notifications, requests, 'System Reports')
  for (const incident of incidents) {
    notifications.push(makeNotification(
      'incident',
      incident.id,
      incident.updated_at,
      changedAfterCreated(incident) ? `Incident updated: ${incident.title}` : `New incident: ${incident.title}`,
      `${incident.hazard_type} · ${incident.area} · ${readable(incident.status)} (${readable(incident.severity)}).`,
      'Incidents'
    ))
  }
  for (const partner of partners) {
    notifications.push(makeNotification(
      'ngo-partner',
      partner.id,
      partner.updated_at || partner.created_at,
      `NGO partner ${readable(partner.status)}`,
      partner.name,
      'NGO Partners'
    ))
  }
  for (const membership of memberships) {
    const partner = Array.isArray(membership.partner) ? membership.partner[0] : membership.partner
    notifications.push(makeNotification(
      'ngo-membership',
      membership.id,
      membership.created_at,
      'NGO member approval needed',
      `${partner?.name || 'NGO partner'} has a pending member request.`,
      'NGO Partners'
    ))
  }
  return notifications
}

export async function getNotifications(user) {
  let notifications
  if (user.role === 'citizen') notifications = await getCitizenNotifications(user)
  else if (user.role === 'ngo') notifications = await getNgoNotifications(user)
  else if (user.role === 'admin') notifications = await getAdminNotifications()
  else throw new Error(`Unsupported account role: ${user.role}`)

  return notifications
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 50)
}
