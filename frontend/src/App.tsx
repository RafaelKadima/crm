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
import { ActivityEffectivenessPage } from '@/pages/reports/ActivityEffectivenessPage'
import { SettingsPage } from '@/pages/settings/Settings'
import { GroupsPage } from '@/pages/group/Groups'
import { IntegrationsPage } from '@/pages/integrations/Integrations'
import { ProductsPage } from '@/pages/products/Products'
import { LandingPagesPage } from '@/pages/landing-pages/LandingPages'
import { PublicLandingPage } from '@/pages/landing-pages/PublicLandingPage'
import { LandingPageBuilder } from '@/pages/landing-pages/LandingPageBuilder'
import { ChannelsPage } from '@/pages/channels/Channels'
import { ConnectChannelsPage } from '@/pages/channels/ConnectChannelsPage'
import { QueuesPage } from '@/pages/queues'
import { SdrHubPage, SdrAgentConfig } from '@/pages/sdr'
import { AppointmentsPage, ScheduleConfigPage } from '@/pages/appointments'
import { DetectedQuestionsPage, AgentLearningDashboard } from '@/pages/learning'
import { SuperAdminDashboard, TenantsPage, CreateTenantPage, TenantDetailsPage, GroupsPage as SuperAdminGroupsPage, GroupDetailsPage, SupportAgentPage } from '@/pages/super-admin'
import SupportHistory from '@/pages/support/SupportHistory'
import { WhatsAppTemplatesPage } from '@/pages/whatsapp-templates'
import { WhatsAppProfilePage } from '@/pages/whatsapp/WhatsAppProfilePage'
import { GtmSettingsPage } from '@/pages/settings/GtmSettingsPage'
import { GtmScript } from '@/components/GtmScript'
import { BrandingProvider } from '@/components/BrandingProvider'
import { AdsDashboard, AdsAccounts, AdsCampaigns, AdsInsights, AdsAutomation, AdsAgent, CreativeUpload, AdsAgentChat, AdsKnowledgeBase, AdsGuardrails } from '@/pages/ads'
import { BIDashboard, ActionApprovalQueue, AIAnalystChat, ReportsPage as BIReportsPage, BISettings } from '@/pages/bi'
import { ContentDashboard, ContentAgentChat, ContentCreators, ViralVideoSearch, BrandSettings, AnalyzeVideo, GenerateScript, AutoDiscover } from '@/pages/content'
import { GoalsDashboard, GoalForm } from '@/pages/goals'
import { QuickRepliesPage } from '@/pages/quick-replies/QuickRepliesPage'
import { ConversasPage } from '@/pages/conversas/ConversasPage'
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage'
import { TermsOfUsePage } from '@/pages/legal/TermsOfUsePage'
import { PrivacyPolicyEnPage } from '@/pages/legal/PrivacyPolicyEnPage'
import { TermsOfUseEnPage } from '@/pages/legal/TermsOfUseEnPage'

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

  return <div className="fixed inset-0 overflow-y-auto">{children}</div>
}

function AppRoutes() {
  useTheme() // Initialize theme

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Public Routes - Legal Pages */}
      <Route path="/lp/:slug" element={<PublicLandingPage />} />
      {/* Privacy Policy - Portuguese */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/politica-privacidade" element={<PrivacyPolicyPage />} />
      {/* Privacy Policy - English (for Meta App Review) */}
      <Route path="/privacy-en" element={<PrivacyPolicyEnPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyEnPage />} />
      {/* Terms of Use - Portuguese */}
      <Route path="/terms" element={<TermsOfUsePage />} />
      <Route path="/termos-de-uso" element={<TermsOfUsePage />} />
      {/* Terms of Use - English (for Meta App Review) */}
      <Route path="/terms-en" element={<TermsOfUseEnPage />} />
      <Route path="/terms-of-use" element={<TermsOfUseEnPage />} />

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
        path="/super-admin/groups"
        element={
          <SuperAdminRoute>
            <SuperAdminGroupsPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/groups/:groupId"
        element={
          <SuperAdminRoute>
            <GroupDetailsPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/support"
        element={
          <SuperAdminRoute>
            <SupportAgentPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/support-history"
        element={
          <SuperAdminRoute>
            <SupportHistory />
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
        <Route path="conversas" element={<ConversasPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="quick-replies" element={<QuickRepliesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/activity-effectiveness" element={<ActivityEffectivenessPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="connect-channels" element={<ConnectChannelsPage />} />
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
        <Route path="whatsapp-profile" element={<WhatsAppProfilePage />} />
        <Route path="gtm" element={<GtmSettingsPage />} />
        
        {/* Ads Intelligence */}
        <Route path="ads" element={<AdsDashboard />} />
        <Route path="ads/accounts" element={<AdsAccounts />} />
        <Route path="ads/campaigns" element={<AdsCampaigns />} />
        <Route path="ads/insights" element={<AdsInsights />} />
        <Route path="ads/automation" element={<AdsAutomation />} />
        <Route path="ads/agent" element={<AdsAgent />} />
        <Route path="ads/creatives" element={<CreativeUpload />} />
        <Route path="ads/chat" element={<AdsAgentChat />} />
        <Route path="ads/knowledge" element={<AdsKnowledgeBase />} />
        <Route path="ads/guardrails" element={<AdsGuardrails />} />
        
        {/* BI Agent */}
        <Route path="bi" element={<BIDashboard />} />
        <Route path="bi/actions" element={<ActionApprovalQueue />} />
        <Route path="bi/analyst" element={<AIAnalystChat />} />
        <Route path="bi/reports" element={<BIReportsPage />} />
        <Route path="bi/settings" element={<BISettings />} />

        {/* Goals / KPR / KPI */}
        <Route path="goals" element={<GoalsDashboard />} />
        <Route path="goals/new" element={<GoalForm />} />
        <Route path="goals/:id" element={<GoalForm />} />

        {/* Content Creator */}
        <Route path="content" element={<ContentDashboard />} />
        <Route path="content/chat" element={<ContentAgentChat />} />
        <Route path="content/creators" element={<ContentCreators />} />
        <Route path="content/viral-search" element={<ViralVideoSearch />} />
        <Route path="content/brand-settings" element={<BrandSettings />} />
        {/* Rotas legadas */}
        <Route path="content/analyze" element={<AnalyzeVideo />} />
        <Route path="content/generate" element={<GenerateScript />} />
        <Route path="content/discover" element={<AutoDiscover />} />
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
            toastOptions={{
              unstyled: false,
              classNames: {
                toast: 'futuristic-toast',
                title: 'futuristic-toast-title',
                description: 'futuristic-toast-description',
                success: 'futuristic-toast-success',
                error: 'futuristic-toast-error',
                warning: 'futuristic-toast-warning',
                info: 'futuristic-toast-info',
                closeButton: 'futuristic-toast-close',
              },
            }}
            expand={true}
            visibleToasts={5}
            duration={4000}
          />
        </BrandingProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
