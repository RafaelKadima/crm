import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { motion } from 'framer-motion'
import { Plus, Search, Phone, Mail, Building2, MoreHorizontal, Loader2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { formatPhone } from '@/lib/utils'
import { useContacts } from '@/hooks/useContacts'
import { ContactModal } from './ContactModal'
import type { Contact } from '@/types'

export function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [page, setPage] = useState(1)

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const { data: contactsData, isLoading } = useContacts({
    search: searchQuery || undefined,
    page,
    per_page: 30
  })

  const contacts = contactsData?.data || []

  const handleNewContact = () => {
    setSelectedContact(null)
    setIsModalOpen(true)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Contatos"
        subtitle={`${contactsData?.total || 0} contatos cadastrados`}
        actions={
          <Button onClick={handleNewContact}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contato
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contatos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contacts Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {contacts.map((contact: Contact, index: number) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="hover:shadow-lg hover:border-blue-500/50 transition-all cursor-pointer group"
              onClick={() => handleEditContact(contact)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar fallback={contact.name} size="lg" />
                    <div>
                      <h3 className="font-semibold group-hover:text-blue-400 transition-colors">
                        {contact.name}
                      </h3>
                      {contact.company && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3" />
                          {contact.company}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditContact(contact)
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{formatPhone(contact.phone)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {contacts.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Tente buscar por outro termo'
              : 'Comece adicionando seu primeiro contato'
            }
          </p>
          {!searchQuery && (
            <Button onClick={handleNewContact}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Contato
            </Button>
          )}
        </motion.div>
      )}

      {/* Pagination */}
      {contactsData && contactsData.last_page > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Mostrando {contactsData.from || 0} - {contactsData.to || 0} de {contactsData.total || 0} contatos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Página {page} de {contactsData.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(contactsData.last_page, p + 1))}
              disabled={page === contactsData.last_page}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contact={selectedContact}
      />
    </div>
  )
}
