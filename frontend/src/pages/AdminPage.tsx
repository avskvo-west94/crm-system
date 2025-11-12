import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Shield, UserPlus, Check, X, Edit, Trash2, AlertCircle, Search } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'executor',
  })
  const queryClient = useQueryClient()

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: () => usersApi.getUsers(),
  })

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['pending-users'],
    queryFn: () => usersApi.getPendingUsers(),
    enabled: user?.role === 'admin',
  })

  const filteredUsers = allUsers.filter((u: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      u.email.toLowerCase().includes(query) ||
      u.full_name.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    )
  })

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      setShowCreateModal(false)
      setNewUser({ email: '', full_name: '', password: '', role: 'executor' })
      toast.success('Пользователь создан и ожидает согласования')
    },
    onError: (error: any) => {
      // Обработка ошибок валидации Pydantic
      let errorMessage = 'Ошибка при создании пользователя'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      }
      toast.error(errorMessage)
    },
  })

  const approveMutation = useMutation({
    mutationFn: usersApi.approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      toast.success('Пользователь согласован')
    },
    onError: () => {
      toast.error('Ошибка при согласовании')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: usersApi.rejectUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      toast.success('Пользователь отклонен')
    },
    onError: () => {
      toast.error('Ошибка при отклонении')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      toast.success('Пользователь обновлен')
    },
    onError: (error: any) => {
      let errorMessage = 'Ошибка при обновлении'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      }
      toast.error(errorMessage)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Пользователь удален')
    },
    onError: (error: any) => {
      let errorMessage = 'Ошибка при удалении'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      }
      toast.error(errorMessage)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newUser)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const updateData: any = {
      full_name: editingUser.full_name,
      role: editingUser.role,
      is_active: editingUser.is_active,
    }
    if (editingUser.newPassword && editingUser.newPassword.length >= 6) {
      updateData.password = editingUser.newPassword
    }
    updateMutation.mutate({ id: editingUser.id, data: updateData })
  }

  const handleDelete = (id: number, email: string) => {
    if (confirm(`Удалить пользователя "${email}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: any = {
      admin: 'Администратор',
      manager: 'Менеджер',
      executor: 'Исполнитель',
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: any = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      executor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    }
    return colors[role] || colors.executor
  }

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <div className="card p-6 text-center">
          <AlertCircle className="mx-auto text-red-600 dark:text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Доступ запрещен
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            У вас нет прав для доступа к этой странице
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="text-primary-600 dark:text-primary-400" size={32} />
            Администрирование
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление пользователями системы
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <UserPlus size={20} />
          Создать пользователя
        </button>
      </div>

      {/* Pending Users Alert */}
      {pendingUsers.length > 0 && (
        <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={24} />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                  Ожидают согласования: {pendingUsers.length}
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Новые пользователи требуют вашего подтверждения
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск пользователей..."
          className="input pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {u.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {u.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        u.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {u.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                      {!u.is_approved && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Ожидает согласования
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {!u.is_approved && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(u.id)}
                            className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded transition-colors"
                            title="Согласовать"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(u.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                            title="Отклонить"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {u.is_approved && (
                        <button
                          onClick={() => setEditingUser({ ...u, newPassword: '' })}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded transition-colors"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Создать пользователя
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное имя *
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пароль * (минимум 6 символов)
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="input"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Роль *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="input"
                >
                  <option value="executor">Исполнитель</option>
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Редактировать пользователя
            </h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="input bg-gray-100 dark:bg-gray-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email нельзя изменить
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное имя *
                </label>
                <input
                  type="text"
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Роль *
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="input"
                >
                  <option value="executor">Исполнитель</option>
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Новый пароль (оставьте пустым, если не меняете)
                </label>
                <input
                  type="password"
                  value={editingUser.newPassword || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                  className="input"
                  minLength={6}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingUser.is_active}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                  Активен
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

