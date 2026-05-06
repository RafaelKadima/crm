import { CompanySettingsPage } from '@/pages/settings/CompanySettingsPage'

/**
 * Wrapper do `CompanySettingsPage` existente — preserva 100% do
 * comportamento atual, apenas relocaliza a rota pra
 * `/settings/company/details` dentro do SettingsLayout novo.
 *
 * Refactor pra ConfigPage virá em sprint futuro quando o backend
 * de tenant settings for consolidado (hoje a page tem ~327 linhas
 * com integração Linx misturada — vai sair da Sprint S6 Integrações).
 */
export { CompanySettingsPage as DetailsPage }
