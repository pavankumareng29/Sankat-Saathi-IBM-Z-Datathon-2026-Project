import AdminOverviewPage from './admin/AdminOverviewPage'
import IncidentsPage from './admin/IncidentsPage'
import NgoPartnersPage from './admin/NgoPartnersPage'
import AdminReliefCentresPage from './admin/AdminReliefCentresPage'
import SystemReportsPage from './admin/SystemReportsPage'

const ADMIN_PAGES = {
  Overview: AdminOverviewPage,
  Incidents: IncidentsPage,
  'NGO Partners': NgoPartnersPage,
  'Relief Centres': AdminReliefCentresPage,
  'System Reports': SystemReportsPage,
}

export default function AdminPortal({ active = 'Overview', data, notify = () => {} }) {
  const Page = ADMIN_PAGES[active] || AdminOverviewPage
  return (
    <div className="-m-4 min-h-[calc(100vh-64px)] bg-slate-50 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <Page data={data} notify={notify} />
    </div>
  )
}
