import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Plus, Search, Phone, Mail, Building2, MoreHorizontal, Loader2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { formatPhone } from '@/lib/utils'
import { useContacts } from '@/hooks/useContacts'
import { ContactModal } from './ContactModal'
import type { Contact } from '@/types'

export function ContactsPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const { data: contactsData, isLoading } = useContacts({
    search: searchQuery || undefined,
    page,
    per_page: 30,
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
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-bold-ink)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="eyebrow">CRM · BASE DE CONTATOS</p>
          <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
            {t('contacts.title')}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            <span className="font-display text-[16px] leading-none tracking-[-0.015em]">
              {contactsData?.total || 0}
            </span>{' '}
            {t('contacts.registered')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="bold" size="sm" onClick={handleNewContact}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('contacts.newContact')}
          </Button>
        </div>
      </motion.div>

      {/* ═══════════ SEARCH ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('contacts.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 rounded-[10px] pl-10 text-[13.5px]"
        />
      </motion.div>

      {/* ═══════════ CONTACTS GRID ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {contacts.map((contact: Contact, index: number) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.4, ease: [0.21, 0.87, 0.35, 1] }}
          >
            <div
              onClick={() => handleEditContact(contact)}
              className="group relative cursor-pointer overflow-hidden rounded-[14px] border p-5 transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              style={{
                background: 'var(--color-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar fallback={contact.name} size="lg" />
                  <div className="min-w-0">
                    <h3 className="font-display text-[20px] leading-[1.1] tracking-[-0.015em] truncate">
                      {contact.name}
                    </h3>
                    {contact.company && (
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditContact(contact)
                  }}
                  className="rounded-[8px] p-1.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div
                className="mt-4 space-y-2 border-t pt-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {contact.email && (
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate" style={{ color: 'var(--color-foreground)' }}>
                      {contact.email}
                    </span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-[12px]" style={{ color: 'var(--color-foreground)' }}>
                      {formatPhone(contact.phone)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state */}
      {contacts.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-20 text-center"
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--color-secondary)' }}
          >
            <UserPlus className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="eyebrow mb-2">NENHUM RESULTADO</p>
          <h3 className="font-display text-[26px] leading-[1.1] tracking-[-0.015em]">
            {searchQuery ? t('empty.noContactsFound') : t('empty.noContactsRegistered')}
          </h3>
          <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] text-muted-foreground">
            {searchQuery ? t('empty.tryAnotherSearch') : t('empty.startAddingFirstContact')}
          </p>
          {!searchQuery && (
            <div className="mt-5">
              <Button variant="bold" onClick={handleNewContact}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('contacts.addContact')}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Pagination */}
      {contactsData && contactsData.last_page > 1 && (
        <div
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-[12px] text-muted-foreground">
            {t('pagination.showing')}{' '}
            <span className="font-medium text-foreground">{contactsData.from || 0}</span>–
            <span className="font-medium text-foreground">{contactsData.to || 0}</span>{' '}
            {t('pagination.of')}{' '}
            <span className="font-medium text-foreground">{contactsData.total || 0}</span>{' '}
            {t('contacts.contactsLabel')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('common.previous')}
            </Button>
            <span className="px-2 text-[12px] text-muted-foreground">
              {t('pagination.page')}{' '}
              <span className="font-medium text-foreground">{page}</span>{' '}
              {t('pagination.of')}{' '}
              <span className="font-medium text-foreground">{contactsData.last_page}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(contactsData.last_page, p + 1))}
              disabled={page === contactsData.last_page}
            >
              {t('pagination.next')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contact={selectedContact}
      />
    </div>
  )
}
