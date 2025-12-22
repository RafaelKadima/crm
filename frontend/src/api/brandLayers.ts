import api from './axios'

// =====================
// TYPES - Brand Editorial Profile (Camada 1)
// =====================

export interface BrandVoice {
  personality_traits?: string[]
  tone_descriptors?: string[]
  vocabulary_style?: string
}

export interface BrandIdentity {
  mission?: string
  values?: string[]
  unique_proposition?: string
}

export interface BeliefsAndEnemies {
  core_beliefs?: string[]
  industry_enemies?: string[]
  contrarian_views?: string[]
}

export interface ContentPillar {
  name: string
  description: string
  example_topics?: string[]
}

export interface BrandEditorialProfile {
  id: string
  name: string
  brand_voice: BrandVoice
  brand_identity: BrandIdentity
  beliefs_and_enemies: BeliefsAndEnemies
  content_pillars: ContentPillar[]
  created_at: string
  updated_at: string
}

// =====================
// TYPES - Audience Profile (Camada 2)
// =====================

export interface Demographics {
  age_range?: string
  gender?: string
  location?: string
  income_level?: string
  education?: string
}

export interface Psychographics {
  pains?: string[]
  desires?: string[]
  fears?: string[]
  dreams?: string[]
}

export interface Objections {
  common_objections?: string[]
  trust_barriers?: string[]
}

export interface LanguagePatterns {
  slang_terms?: string[]
  phrases_they_use?: string[]
  tone_preference?: string
}

export interface AudienceProfile {
  id: string
  name: string
  demographics: Demographics
  psychographics: Psychographics
  objections: Objections
  language_patterns: LanguagePatterns
  created_at: string
  updated_at: string
}

// =====================
// TYPES - Product Positioning (Camada 3)
// =====================

export interface Transformation {
  before_state?: string
  after_state?: string
  journey_description?: string
}

export interface Mechanism {
  how_it_works?: string
  unique_method?: string
  differentiator?: string
}

export interface Promises {
  main_promise?: string
  secondary_promises?: string[]
  proof_points?: string[]
}

export interface ObjectionHandler {
  objection: string
  response: string
  proof?: string
}

export interface ProductPositioning {
  id: string
  name: string
  transformation: Transformation
  mechanism: Mechanism
  promises: Promises
  objection_handling: ObjectionHandler[]
  created_at: string
  updated_at: string
}

// =====================
// TYPES - Layer Selector
// =====================

export interface LayerOption {
  id: string
  name: string
}

export interface AllLayersResponse {
  brand_profiles: LayerOption[]
  audience_profiles: LayerOption[]
  product_positionings: LayerOption[]
}

// =====================
// API ENDPOINTS
// =====================

export const brandLayersApi = {
  getAllLayers: () =>
    api.get<AllLayersResponse>('/brand-layers/all'),

  listBrandProfiles: () =>
    api.get<{ profiles: BrandEditorialProfile[] }>('/brand-layers/brand-profiles'),

  getBrandProfile: (id: string) =>
    api.get<{ profile: BrandEditorialProfile }>(`/brand-layers/brand-profiles/${id}`),

  createBrandProfile: (data: {
    name: string
    brand_voice?: BrandVoice
    brand_identity?: BrandIdentity
    beliefs_and_enemies?: BeliefsAndEnemies
    content_pillars?: ContentPillar[]
  }) =>
    api.post<{ profile: BrandEditorialProfile }>('/brand-layers/brand-profiles', data),

  updateBrandProfile: (id: string, data: Partial<{
    name: string
    brand_voice: BrandVoice
    brand_identity: BrandIdentity
    beliefs_and_enemies: BeliefsAndEnemies
    content_pillars: ContentPillar[]
  }>) =>
    api.put<{ profile: BrandEditorialProfile }>(`/brand-layers/brand-profiles/${id}`, data),

  deleteBrandProfile: (id: string) =>
    api.delete<{ message: string }>(`/brand-layers/brand-profiles/${id}`),

  listAudienceProfiles: () =>
    api.get<{ profiles: AudienceProfile[] }>('/brand-layers/audience-profiles'),

  getAudienceProfile: (id: string) =>
    api.get<{ profile: AudienceProfile }>(`/brand-layers/audience-profiles/${id}`),

  createAudienceProfile: (data: {
    name: string
    demographics?: Demographics
    psychographics?: Psychographics
    objections?: Objections
    language_patterns?: LanguagePatterns
  }) =>
    api.post<{ profile: AudienceProfile }>('/brand-layers/audience-profiles', data),

  updateAudienceProfile: (id: string, data: Partial<{
    name: string
    demographics: Demographics
    psychographics: Psychographics
    objections: Objections
    language_patterns: LanguagePatterns
  }>) =>
    api.put<{ profile: AudienceProfile }>(`/brand-layers/audience-profiles/${id}`, data),

  deleteAudienceProfile: (id: string) =>
    api.delete<{ message: string }>(`/brand-layers/audience-profiles/${id}`),

  listProductPositionings: () =>
    api.get<{ positionings: ProductPositioning[] }>('/brand-layers/product-positionings'),

  getProductPositioning: (id: string) =>
    api.get<{ positioning: ProductPositioning }>(`/brand-layers/product-positionings/${id}`),

  createProductPositioning: (data: {
    name: string
    transformation?: Transformation
    mechanism?: Mechanism
    promises?: Promises
    objection_handling?: ObjectionHandler[]
  }) =>
    api.post<{ positioning: ProductPositioning }>('/brand-layers/product-positionings', data),

  updateProductPositioning: (id: string, data: Partial<{
    name: string
    transformation: Transformation
    mechanism: Mechanism
    promises: Promises
    objection_handling: ObjectionHandler[]
  }>) =>
    api.put<{ positioning: ProductPositioning }>(`/brand-layers/product-positionings/${id}`, data),

  deleteProductPositioning: (id: string) =>
    api.delete<{ message: string }>(`/brand-layers/product-positionings/${id}`),
}

export default brandLayersApi
