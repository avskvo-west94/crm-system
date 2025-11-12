import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi, usersApi } from '../services/api'
import { Plus, Search, Mail, Phone, Trash2, Edit } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newContact, setNewContact] = useState({
    company_name: '',
    contact_person: '',
    type: 'client',
    email: '',
    phone: '',
    website: '',
    address: '',
    notes: '',
    shared_user_ids: [] as number[],
  })
  const queryClient = useQueryClient()

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', searchQuery],
    queryFn: () => contactsApi.getContacts(searchQuery),
  })

  const createMutation = useMutation({
    mutationFn: contactsApi.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowCreateModal(false)
      setNewContact({
        company_name: '',
        contact_person: '',
        type: 'client',
        email: '',
        phone: '',
        website: '',
        address: '',
        notes: '',
        shared_user_ids: [],
      })
      toast.success('Контакт создан!')
    },
    onError: () => {
      toast.error('Ошибка при создании контакта')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: contactsApi.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Контакт удален')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newContact)
  }

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Удалить контакт "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: any = {
      client: 'Клиент',
      partner: 'Партнер',
      supplier: 'Поставщик',
      other: 'Другое',
    }
    return labels[type] || type
  }

  const getTypeBadgeColor = (type: string) => {
    const colors: any = {
      client: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      partner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      supplier: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    }
    return colors[type] || colors.other
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Контакты
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление клиентами и партнерами
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Добавить контакт
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск контактов..."
          className="input pl-10"
        />
      </div>

      {/* Contacts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map((contact: any) => (
          <div key={contact.id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                  {contact.company_name}
                </h3>
                {contact.contact_person && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {contact.contact_person}
                  </p>
                )}
                <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(contact.type)}`}>
                  {getTypeLabel(contact.type)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(contact.id, contact.company_name)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <Mail size={16} />
                  <span className="truncate">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <Phone size={16} />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>

            {contact.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 line-clamp-2">
                {contact.notes}
              </p>
            )}
          </div>
        ))}

        {contacts.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Контакты не найдены' : 'Нет контактов'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Новый контакт
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название компании *
                  </label>
                  <input
                    type="text"
                    value={newContact.company_name}
                    onChange={(e) => setNewContact({ ...newContact, company_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Контактное лицо
                  </label>
                  <input
                    type="text"
                    value={newContact.contact_person}
                    onChange={(e) => setNewContact({ ...newContact, contact_person: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип
                  </label>
                  <select
                    value={newContact.type}
                    onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                    className="input"
                  >
                    <option value="client">Клиент</option>
                    <option value="partner">Партнер</option>
                    <option value="supplier">Поставщик</option>
                    <option value="other">Другое</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Веб-сайт
                  </label>
                  <input
                    type="url"
                    value={newContact.website}
                    onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={newContact.address}
                  onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заметки
                </label>
                <textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Доступ пользователям
                </label>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 max-h-40 overflow-y-auto">
                  {allUsers.map((user: any) => (
                    <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={newContact.shared_user_ids.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewContact({ ...newContact, shared_user_ids: [...newContact.shared_user_ids, user.id] })
                          } else {
                            setNewContact({ ...newContact, shared_user_ids: newContact.shared_user_ids.filter((id: number) => id !== user.id) })
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.full_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({user.role === 'admin' ? 'Админ' : user.role === 'manager' ? 'Менеджер' : 'Исполнитель'})
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Выберите пользователей, которым будет доступен этот контакт
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createMutation.isPending ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

