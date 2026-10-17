import { Badge, Card } from '../components/ui'

export default function MyRequestsPage({ requests, goTo }) {
  return (
    <Card>
      {requests.length === 0 ? (
        <div>
          <p className="mb-4 text-slate-500">You have not made any requests yet.</p>
          <button onClick={() => goTo('Request Assistance')} className="rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white">Request help</button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold text-slate-900">{r.type} <span className="font-normal text-slate-400">· {r.id}</span></p>
                <p className="text-sm text-slate-500">{r.location} · {r.time}</p>
              </div>
              <Badge value={r.status} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}