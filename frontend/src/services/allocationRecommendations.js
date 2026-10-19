import { resourcesForNeed } from './resourceMapping.js'

const URGENCY_WEIGHT = { low: 10, medium: 25, high: 40, critical: 55 }
const INCIDENT_WEIGHT = { low: 0, moderate: 8, high: 15, critical: 20 }
const PRIORITY_LABELS = [
  [75, 'Critical'],
  [55, 'High'],
  [35, 'Medium'],
  [0, 'Low'],
]

const asNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function distanceKm(left, right) {
  if (left?.latitude == null || left?.longitude == null || right?.latitude == null || right?.longitude == null) {
    return null
  }
  const values = [left.latitude, left.longitude, right.latitude, right.longitude].map(Number)
  if (values.some((value) => !Number.isFinite(value))) return null

  const [latitude1, longitude1, latitude2, longitude2] = values.map((value) => value * Math.PI / 180)
  const latitudeDelta = latitude2 - latitude1
  const longitudeDelta = longitude2 - longitude1
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function rankRequest(request, now = Date.now()) {
  const urgency = String(request.priority || 'medium').toLowerCase()
  const severity = String(request.incident_severity || '').toLowerCase()
  const people = Math.max(0, asNumber(request.people_affected))
  const ageHours = Math.max(0, (now - Date.parse(request.created_at)) / 3600000 || 0)
  const urgencyPoints = URGENCY_WEIGHT[urgency] ?? URGENCY_WEIGHT.medium
  const incidentPoints = INCIDENT_WEIGHT[severity] ?? 0
  const peoplePoints = Math.min(15, Math.log2(people + 1) * 3)
  const waitingPoints = Math.min(10, ageHours / 24 * 2)
  const score = Math.min(100, Math.round(urgencyPoints + incidentPoints + peoplePoints + waitingPoints))
  const priority = PRIORITY_LABELS.find(([threshold]) => score >= threshold)?.[1] || 'Low'
  const reasons = [
    `${urgency.charAt(0).toUpperCase()}${urgency.slice(1)} request urgency (+${urgencyPoints})`,
    `${people.toLocaleString()} people affected (+${peoplePoints.toFixed(1)})`,
  ]
  if (request.incident_title && severity) {
    reasons.push(`${severity} incident: ${request.incident_title} (+${incidentPoints})`)
  }
  reasons.push(`Waiting ${ageHours.toFixed(1)} hours (+${waitingPoints.toFixed(1)})`)

  return { ...request, recommendationScore: score, recommendationPriority: priority, recommendationReasons: reasons }
}

export function requestedResourceLines(request) {
  const needs = request.needs?.length
    ? request.needs
    : [{ category: request.category, medical_type: request.medical_type, details: request.details }]
  const byResource = new Map()

  for (const need of needs) {
    const requestedItems = need.items || need.requested_items
    if (requestedItems?.length) {
      for (const item of requestedItems) {
        const resourceCode = item.resource_code || item.resourceCode
        const resourceId = item.resource_id || item.resourceId
        const key = resourceId || resourceCode
        if (!key || !resourceCode) continue
        const existing = byResource.get(key)
        const quantity = asNumber(item.requested_quantity ?? item.quantity)
        if (existing) existing.requestedQuantity += quantity
        else {
          byResource.set(key, {
            resourceId,
            resourceCode,
            name: item.name || resourceCode,
            unit: item.unit || 'units',
            requestedQuantity: quantity,
            quantityKnown: quantity > 0,
          })
        }
      }
      continue
    }

    for (const resource of resourcesForNeed(need)) {
      if (!byResource.has(resource.code)) {
        byResource.set(resource.code, {
          resourceCode: resource.code,
          name: resource.name,
          unit: resource.unit,
          requestedQuantity: null,
          quantityKnown: false,
        })
      }
    }
  }

  return [...byResource.values()]
}

function allocateFairly(lines, stock, scoreByRequest) {
  const results = new Map(lines.map((line) => [line, 0]))
  const remainingStock = Math.max(0, Math.floor(asNumber(stock) * 1000 + 1e-8))
  let remaining = remainingStock
  let active = lines.filter((line) => line.quantityKnown && line.requestedUnits > 0)

  while (remaining > 0 && active.length) {
    const totalWeight = active.reduce((sum, line) => sum + line.weight, 0)
    const capped = active.filter((line) =>
      remaining * line.weight / totalWeight >= line.requestedUnits - line.allocatedUnits
    )
    if (capped.length) {
      for (const line of capped) {
        const outstanding = line.requestedUnits - line.allocatedUnits
        line.allocatedUnits += outstanding
        results.set(line, line.allocatedUnits / 1000)
        remaining -= outstanding
      }
      const cappedSet = new Set(capped)
      active = active.filter((line) => !cappedSet.has(line))
      continue
    }

    const shares = active.map((line) => {
      const exact = remaining * line.weight / totalWeight
      return { line, floor: Math.floor(exact), remainder: exact - Math.floor(exact) }
    })
    let assigned = shares.reduce((sum, share) => sum + share.floor, 0)
    shares.sort((left, right) =>
      right.remainder - left.remainder
      || scoreByRequest.get(right.line.requestId) - scoreByRequest.get(left.line.requestId)
      || left.line.requestId.localeCompare(right.line.requestId)
    )
    for (const share of shares) {
      const leftToShare = remaining - assigned
      const units = share.floor + (leftToShare > 0 ? 1 : 0)
      share.line.allocatedUnits += units
      results.set(share.line, share.line.allocatedUnits / 1000)
      assigned += units - share.floor
    }
    remaining = 0
  }

  return results
}

export function buildRecommendations(requests, inventory, now = Date.now()) {
  const ranked = requests
    .filter((request) => ['submitted', 'acknowledged', 'assigned'].includes(request.status))
    .map((request) => rankRequest(request, now))
    .sort((left, right) => right.recommendationScore - left.recommendationScore
      || Date.parse(left.created_at) - Date.parse(right.created_at))
  const scoreByRequest = new Map(ranked.map((request) => [request.id, request.recommendationScore]))
  const inventoryByResource = new Map()
  for (const item of inventory) {
    const available = Math.max(0, asNumber(item.quantity) - asNumber(item.reserved_quantity))
    const current = inventoryByResource.get(item.resource_id)
    if (!current || available > current.available) {
      inventoryByResource.set(item.resource_id, {
        inventoryId: item.id,
        resourceId: item.resource_id,
        resourceCode: item.resource_code,
        name: item.name,
        unit: item.unit,
        available,
      })
    }
  }

  const requestsByResource = new Map()
  const linesByRequest = new Map()
  for (const request of ranked) {
    const lines = requestedResourceLines(request).map((requested) => {
      const stock = requested.resourceId ? inventoryByResource.get(requested.resourceId) : null
      const matches = stock && stock.resourceCode === requested.resourceCode && stock.unit === requested.unit
        ? stock
        : null
      const line = {
        ...requested,
        requestId: request.id,
        inventoryId: matches?.inventoryId || null,
        available: matches?.available || 0,
        requestedUnits: requested.quantityKnown ? Math.floor(requested.requestedQuantity * 1000 + 1e-8) : 0,
        allocatedUnits: 0,
        weight: Math.max(1, request.recommendationScore) * Math.sqrt(Math.max(1, request.people_affected)),
      }
      if (matches) {
        const group = requestsByResource.get(matches.resourceId) || []
        group.push(line)
        requestsByResource.set(matches.resourceId, group)
      }
      return line
    })
    linesByRequest.set(request.id, lines)
  }

  const recommendedByLine = new Map()
  for (const [resourceId, lines] of requestsByResource) {
    const stock = inventoryByResource.get(resourceId)
    const distribution = allocateFairly(lines, stock?.available || 0, scoreByRequest)
    for (const [line, quantity] of distribution) recommendedByLine.set(line, quantity)
  }

  return ranked.map((request) => ({
    ...request,
    recommendationItems: (linesByRequest.get(request.id) || []).map((line) => {
      const recommendedQuantity = recommendedByLine.get(line) || 0
      return {
        ...line,
        recommendedQuantity,
        shortage: line.quantityKnown ? Math.max(0, line.requestedQuantity - recommendedQuantity) : null,
      }
    }),
  }))
}
