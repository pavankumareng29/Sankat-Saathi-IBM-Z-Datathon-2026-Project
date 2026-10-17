// Replace the mock implementations in this module with FastAPI calls when ready.
const dashboard = {
  stats: [
    { label: 'Open requests', value: '148', change: '+18 today', tone: 'amber' },
    { label: 'People reached', value: '2,840', change: '+12% this week', tone: 'emerald' },
    { label: 'Critical zones', value: '06', change: '2 need action now', tone: 'rose' },
    { label: 'On-time delivery', value: '94%', change: '+4.8% vs. last week', tone: 'sky' },
  ],
  requests: [
    { id: 'REQ-2481', area: 'Kalyan Nagar', need: 'Drinking water', people: 320, priority: 'Critical', time: '8 min ago' },
    { id: 'REQ-2478', area: 'Srinagar Colony', need: 'Medical kits', people: 85, priority: 'High', time: '14 min ago' },
    { id: 'REQ-2472', area: 'Riverbend Ward', need: 'Dry rations', people: 210, priority: 'High', time: '21 min ago' },
    { id: 'REQ-2469', area: 'East Lake', need: 'Shelter supplies', people: 64, priority: 'Medium', time: '32 min ago' },
  ],
  inventory: [
    { item: 'Drinking water', available: 4200, unit: 'litres', progress: 76, state: 'Healthy' },
    { item: 'Dry rations', available: 1860, unit: 'packs', progress: 54, state: 'Watch' },
    { item: 'Medical kits', available: 340, unit: 'kits', progress: 28, state: 'Low' },
    { item: 'Tarpaulins', available: 680, unit: 'units', progress: 62, state: 'Healthy' },
  ],
  deliveries: [
    { id: 'DLV-908', destination: 'Kalyan Nagar Relief Camp', eta: '12 min', status: 'En route', progress: 72 },
    { id: 'DLV-904', destination: 'Srinagar Colony Hub', eta: 'Arrived', status: 'Delivered', progress: 100 },
    { id: 'DLV-899', destination: 'Riverbend Ward', eta: '28 min', status: 'Loading', progress: 24 },
  ],
  allocations: [
    { zone: 'Kalyan Nagar', confidence: 98, action: 'Send 1,200L water + 80 ration packs', reason: 'High density, water stock projected to run out in 6 hrs' },
    { zone: 'Srinagar Colony', confidence: 94, action: 'Dispatch 25 medical kits', reason: 'Two health alerts with no nearby medical supply' },
    { zone: 'Riverbend Ward', confidence: 89, action: 'Assign vehicle Z-12', reason: 'Best route avoids two reported road closures' },
  ],
}

export async function getDashboardData() {
  // Example later: return fetch(`${import.meta.env.VITE_API_URL}/dashboard`).then(r => r.json())
  return dashboard
}
