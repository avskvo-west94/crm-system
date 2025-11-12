import { useAuthStore } from '../store/authStore'
import { usersApi } from '../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Moon, Sun, Mail, UserCircle, Shield } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, setTheme, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateUser(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Профиль обновлен!')
    },
    onError: () => {
      toast.error('Ошибка при обновлении профиля')
    },
  })

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(profileData)
  }

  const getRoleLabel = (role: string) => {
    const labels: any = {
      admin: 'Администратор',
      manager: 'Менеджер',
      executor: 'Исполнитель',
    }
    return labels[role] || role
  }

  const getRoleIcon = (role: string) => {
    if (role === 'admin') {
      return <Shield className="text-red-600 dark:text-red-400" size={20} />
    }
    return <User className="text-blue-600 dark:text-blue-400" size={20} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Настройки
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Управление профилем и настройками системы
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <UserCircle className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Профиль
              </h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное имя
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="input"
                  disabled
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email нельзя изменить
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="btn btn-primary"
                >
                  {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>

          {/* Account Info */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Информация об аккаунте
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  {getRoleIcon(user?.role || 'executor')}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Роль</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getRoleLabel(user?.role || 'executor')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-600 dark:text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Appearance */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                {user?.theme === 'dark' ? (
                  <Moon className="text-purple-600 dark:text-purple-400" size={24} />
                ) : (
                  <Sun className="text-purple-600 dark:text-purple-400" size={24} />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Внешний вид
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Тема оформления
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      user?.theme === 'light'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Sun className="mx-auto mb-2 text-yellow-600" size={24} />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Светлая
                    </p>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      user?.theme === 'dark'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Moon className="mx-auto mb-2 text-blue-600" size={24} />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Темная
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-2 border-red-200 dark:border-red-900/50">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              Опасная зона
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Выйти из аккаунта
            </p>
            <button
              onClick={() => {
                if (confirm('Вы уверены, что хотите выйти?')) {
                  logout()
                }
              }}
              className="btn btn-danger w-full"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

