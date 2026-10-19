export const RESOURCE_OPTIONS = [
  { code: 'drinking_water', name: 'Drinking water', unit: 'litres', categories: ['Water'] },
  { code: 'bottled_water', name: 'Bottled water', unit: 'litres', categories: ['Water'] },
  { code: 'dry_rations', name: 'Dry rations', unit: 'packs', categories: ['Food'] },
  { code: 'baby_food', name: 'Baby food', unit: 'packs', categories: ['Food'] },
  { code: 'ready_to_eat_meals', name: 'Ready-to-eat meals', unit: 'meals', categories: ['Food'] },
  { code: 'medical_kits', name: 'Medical kits', unit: 'kits', categories: ['Medical', 'Other'] },
  { code: 'bandages', name: 'Bandages', unit: 'rolls', categories: ['Medical', 'Other'] },
  { code: 'medicines', name: 'Medicines', unit: 'doses', categories: ['Medical', 'Other'] },
  { code: 'first_aid_kits', name: 'First-aid kits', unit: 'kits', categories: ['Medical', 'Other'] },
  { code: 'tarpaulins', name: 'Tarpaulins', unit: 'units', categories: ['Other'] },
]

const MEDICAL_RESOURCES = {
  'Tablets / Medicines': ['medicines'],
  'Bandages / First Aid': ['bandages', 'first_aid_kits'],
  Both: ['medicines', 'bandages', 'first_aid_kits', 'medical_kits'],
  'Other Medical Supplies': ['medical_kits'],
}

export function resourcesForNeed(need) {
  const category = need?.category
  const requestedItems = need?.items || need?.requested_items
  if (requestedItems?.length) {
    const requestedCodes = new Set(requestedItems.map((item) => item.resource_code || item.resourceCode))
    return RESOURCE_OPTIONS.filter((resource) => requestedCodes.has(resource.code))
  }

  if (category === 'Water') return RESOURCE_OPTIONS.filter((resource) => resource.categories.includes('Water'))
  if (category === 'Food') {
    const text = `${need?.details || ''} ${need?.medical_type || ''}`.toLowerCase()
    const preferred = []
    if (/baby|infant|formula/.test(text)) preferred.push('baby_food')
    if (/ration|dry food|packet/.test(text)) preferred.push('dry_rations')
    if (/meal|ready.to.eat|prepared food/.test(text)) preferred.push('ready_to_eat_meals')
    const codes = preferred.length ? new Set(preferred) : null
    return RESOURCE_OPTIONS.filter((resource) =>
      resource.categories.includes('Food') && (!codes || codes.has(resource.code))
    )
  }
  if (category === 'Medical') {
    const codes = MEDICAL_RESOURCES[need?.medical_type] || ['medical_kits']
    return RESOURCE_OPTIONS.filter((resource) => codes.includes(resource.code))
  }
  if (category === 'Other') {
    const text = `${need?.details || ''}`.toLowerCase()
    return RESOURCE_OPTIONS.filter((resource) => {
      const words = resource.name.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3)
      return words.some((word) => text.includes(word))
    })
  }
  return []
}

export function allowedResourceCodesForNeed(need) {
  return new Set(resourcesForNeed(need).map((resource) => resource.code))
}

export function requestedItemsForNeed(need) {
  return (need?.items || need?.requested_items || []).map((item) => ({
    resourceCode: item.resource_code || item.resourceCode,
    quantity: Number(item.requested_quantity ?? item.quantity),
    unit: item.unit,
  }))
}
