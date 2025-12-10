import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoginPage } from '@/pages/auth/Login'
import { DashboardPage } from '@/pages/dashboard/Dashboard'
import { LeadsKanbanPage } from '@/pages/leads/LeadsKanban'
import { ContactsPage } from '@/pages/contacts/Contacts'
import { TicketsPage } from '@/pages/tickets/Tickets'
import { TasksPage } from '@/pages/tasks/Tasks'
import { ReportsPage } from '@/pages/reports/Reports'
import { SettingsPage } from '@/pages/settings/Settings'
import { GroupsPage } from '@/pages/group/Groups'
import { IntegrationsPage } from '@/pages/integrations/Integrations'
import { ProductsPage } from '@/pages/products/Products'
import { LandingPagesPage } from '@/pages/landing-pages/LandingPages'
import { PublicLandingPage } from '@/pages/landing-pages/PublicLandingPage'
import { LandingPageBuilder } from '@/pages/landing-pages/LandingPageBuilder'
import { ChannelsPage } from '@/pages/channels/Channels'
import { QueuesPage } from '@/pages/queues'
import { SdrHubPage, SdrAgentConfig } from '@/pages/sdr'
import { AppointmentsPage, ScheduleConfigPage } from '@/pages/appointments'
import { DetectedQuestionsPage, AgentLearningDashboard } from '@/pages/learning'
import { SuperAdminDashboard, TenantsPage, CreateTenantPage, TenantDetailsPage } from '@/pages/super-admin'
import { WhatsAppTemplatesPage } from '@/pages/whatsapp-templates'
import { GtmSettingsPage } from '@/pages/settings/GtmSettingsPage'
import { GtmScript } from '@/components/GtmScript'
import { BrandingProvider } from '@/components/BrandingProvider'
import { AdsDashboard, AdsAccounts, AdsCampaigns, AdsInsights, AdsAutomation, AdsAgent } from '@/pages/ads'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // TODO: Verificar se é super admin
  // if (!user?.is_super_admin) {
  //   return <Navigate to="/" replace />
  // }
  
  return <>{children}</>
}

function AppRoutes() {
  useTheme() // Initialize theme

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rota pública da Landing Page */}
      <Route path="/lp/:slug" element={<PublicLandingPage />} />
      
      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/tenants"
        element={
          <SuperAdminRoute>
            <TenantsPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/tenants/new"
        element={
          <SuperAdminRoute>
            <CreateTenantPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/tenants/:tenantId"
        element={
          <SuperAdminRoute>
            <TenantDetailsPage />
          </SuperAdminRoute>
        }
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<LeadsKanbanPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="queues" element={<QueuesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="landing-pages" element={<LandingPagesPage />} />
        <Route path="landing-pages/:id/edit" element={<LandingPageBuilder />} />
        <Route path="sdr" element={<SdrHubPage />} />
        <Route path="sdr/create" element={<SdrAgentConfig />} />
        <Route path="sdr/:agentId/config" element={<SdrAgentConfig />} />
        <Route path="sdr/:agentId/learning" element={<AgentLearningDashboard />} />
        <Route path="sdr/:agentId/questions" element={<DetectedQuestionsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="schedule" element={<ScheduleConfigPage />} />
        <Route path="whatsapp-templates" element={<WhatsAppTemplatesPage />} />
        <Route path="gtm" element={<GtmSettingsPage />} />
        
        {/* Ads Intelligence */}
        <Route path="ads" element={<AdsDashboard />} />
        <Route path="ads/accounts" element={<AdsAccounts />} />
        <Route path="ads/campaigns" element={<AdsCampaigns />} />
        <Route path="ads/insights" element={<AdsInsights />} />
        <Route path="ads/automation" element={<AdsAutomation />} />
        <Route path="ads/agent" element={<AdsAgent />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BrandingProvider>
          <GtmScript />
          <AppRoutes />
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            theme="dark"
          />
        </BrandingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
