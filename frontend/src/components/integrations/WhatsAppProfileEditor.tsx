import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Camera,
  Loader2,
  Save,
  User,
  MapPin,
  Mail,
  Globe,
  FileText,
  Building2,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useMetaProfile,
  useUpdateMetaProfile,
  useUploadMetaProfilePhoto,
  useMetaProfileCategories,
  type UpdateProfileData,
} from '@/hooks/useMetaProfile'

interface WhatsAppProfileEditorProps {
  integrationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WhatsAppProfileEditor({
  integrationId,
  open,
  onOpenChange,
}: WhatsAppProfileEditorProps) {
  const { data: profile, isLoading: loadingProfile } = useMetaProfile(integrationId)
  const { data: categories } = useMetaProfileCategories()
  const updateMutation = useUpdateMetaProfile()
  const uploadPhotoMutation = useUploadMetaProfilePhoto()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState<UpdateProfileData>({
    about: '',
    address: '',
    description: '',
    email: '',
    websites: [],
    vertical: '',
  })
  const [newWebsite, setNewWebsite] = useState('')

  // Sync profile data with form
  useEffect(() => {
    if (profile) {
      setFormData({
        about: profile.about || '',
        address: profile.address || '',
        description: profile.description || '',
        email: profile.email || '',
        websites: profile.websites || [],
        vertical: profile.vertical || '',
      })
    }
  }, [profile])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddWebsite = () => {
    if (!newWebsite) return

    // Validate URL
    try {
      new URL(newWebsite)
    } catch {
      toast.error('URL invalida')
      return
    }

    if ((formData.websites?.length || 0) >= 2) {
      toast.error('Maximo de 2 websites permitidos')
      return
    }

    setFormData((prev) => ({
      ...prev,
      websites: [...(prev.websites || []), newWebsite],
    }))
    setNewWebsite('')
  }

  const handleRemoveWebsite = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      websites: prev.websites?.filter((_, i) => i !== index) || [],
    }))
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Apenas JPEG e PNG sao permitidos')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter menos de 5MB')
      return
    }

    try {
      await uploadPhotoMutation.mutateAsync({
        integrationId,
        file,
      })
      toast.success('Foto de perfil atualizada')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar foto')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Build update data - only include changed fields
    const updateData: UpdateProfileData = {}

    if (formData.about !== profile?.about) {
      updateData.about = formData.about
    }
    if (formData.address !== profile?.address) {
      updateData.address = formData.address
    }
    if (formData.description !== profile?.description) {
      updateData.description = formData.description
    }
    if (formData.email !== profile?.email) {
      updateData.email = formData.email
    }
    if (formData.vertical !== profile?.vertical) {
      updateData.vertical = formData.vertical
    }
    if (JSON.stringify(formData.websites) !== JSON.stringify(profile?.websites)) {
      updateData.websites = formData.websites
    }

    if (Object.keys(updateData).length === 0) {
      toast.info('Nenhuma alteracao para salvar')
      return
    }

    try {
      await updateMutation.mutateAsync({
        integrationId,
        data: updateData,
      })
      toast.success('Perfil atualizado com sucesso')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil')
    }
  }

  const isLoading = loadingProfile
  const isSaving = updateMutation.isPending || uploadPhotoMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Perfil do WhatsApp Business</DialogTitle>
          <DialogDescription>
            Atualize as informacoes do seu perfil comercial no WhatsApp
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogBody className="max-h-[60vh] overflow-y-auto space-y-6">
              {/* Foto de perfil */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {profile?.profile_picture_url ? (
                      <img
                        src={profile.profile_picture_url}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    className="absolute -bottom-1 -right-1 p-2 bg-green-600 hover:bg-green-500 rounded-full transition-colors disabled:opacity-50"
                  >
                    {uploadPhotoMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Foto de Perfil</p>
                  <p className="text-xs text-gray-400">JPEG ou PNG, max 5MB</p>
                </div>
              </div>

              {/* About */}
              <div className="space-y-2">
                <Label htmlFor="about" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Status (Sobre)
                </Label>
                <Input
                  id="about"
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  maxLength={139}
                  placeholder="Ex: Atendimento 24h"
                />
                <p className="text-xs text-gray-500 text-right">
                  {formData.about?.length || 0}/139
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descricao
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength={512}
                  rows={3}
                  placeholder="Descreva seu negocio..."
                />
                <p className="text-xs text-gray-500 text-right">
                  {formData.description?.length || 0}/512
                </p>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereco
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  maxLength={256}
                  placeholder="Rua, numero, cidade..."
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  maxLength={128}
                  placeholder="contato@empresa.com"
                />
              </div>

              {/* Websites */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Websites (max 2)
                </Label>
                <div className="space-y-2">
                  {formData.websites?.map((website, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={website}
                        readOnly
                        className="flex-1 bg-gray-700/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWebsite(index)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(formData.websites?.length || 0) < 2 && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newWebsite}
                        onChange={(e) => setNewWebsite(e.target.value)}
                        placeholder="https://www.seusite.com"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddWebsite()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddWebsite}
                        className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="vertical" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Categoria do Negocio
                </Label>
                <select
                  id="vertical"
                  name="vertical"
                  value={formData.vertical}
                  onChange={handleInputChange}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories &&
                    Object.entries(categories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>
            </DialogBody>

            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
