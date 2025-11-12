import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'
import { LogIn, Shield, Info, X } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [adminExists, setAdminExists] = useState(true) // Начальное значение - считаем что есть
  const [isChecking, setIsChecking] = useState(true)
  const [forceShowCreate, setForceShowCreate] = useState(false) // Принудительно показать форму создания
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    full_name: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showTokenInfo, setShowTokenInfo] = useState(false)
  const [resetForm, setResetForm] = useState({
    security_token: '',
    new_password: '',
    confirm_password: '',
  })
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const result = await authApi.checkAdminExists()
      console.log('Admin check result:', result)
      setAdminExists(result.admin_exists || false)
    } catch (error: any) {
      console.error('Error checking admin:', error)
      // Если ошибка сети, показываем кнопку создания на всякий случай
      if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
        setAdminExists(false)
      } else {
        setAdminExists(true) // По умолчанию считаем что есть
      }
    } finally {
      setIsChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await login(email, password)
      toast.success('Вход выполнен успешно!')
      navigate('/')
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Ошибка входа'
      if (errorMsg.includes('не согласован')) {
        toast.error('Ваш аккаунт ожидает согласования администратором')
      } else {
        toast.error(errorMsg)
      }
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (resetForm.new_password !== resetForm.confirm_password) {
      toast.error('Пароли не совпадают')
      return
    }
    
    if (resetForm.new_password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }
    
    try {
      const response = await authApi.resetAdminPassword({
        security_token: resetForm.security_token,
        new_password: resetForm.new_password,
      })
      toast.success('Пароль администратора успешно сброшен!')
      setShowResetPassword(false)
      setResetForm({ security_token: '', new_password: '', confirm_password: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при сбросе пароля')
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (adminForm.password !== adminForm.passwordConfirm) {
      toast.error('Пароли не совпадают')
      return
    }
    
    if (adminForm.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов')
      return
    }
    
    setIsCreating(true)
    try {
      await authApi.createAdmin({
        email: adminForm.email,
        password: adminForm.password,
        full_name: adminForm.full_name,
      })
      toast.success('Администратор успешно создан!')
      setShowCreateAdmin(false)
      setForceShowCreate(false)
      setAdminExists(true)
      setAdminForm({ email: '', password: '', passwordConfirm: '', full_name: '' })
      
      // Автоматический вход после создания
      await login(adminForm.email, adminForm.password)
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании администратора')
    } finally {
      setIsCreating(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Проверка системы...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* Token Info Modal */}
      {showTokenInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                📍 Где взять токен?
              </h3>
              <button
                onClick={() => setShowTokenInfo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Токен хранится в файле на сервере:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-xs break-all">
                /home/user/crm-system/SECURITY_TOKEN.txt
              </code>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Текущий токен:
                </p>
                <code className="block bg-blue-100 dark:bg-blue-900 p-3 rounded-lg text-sm font-mono break-all">
                  admin_reset_token_2024
                </code>
              </div>
              <button
                onClick={() => setShowTokenInfo(false)}
                className="w-full btn btn-primary mt-4"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <LogIn className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            СУП
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
            Система управления проектами
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Войдите в свой аккаунт
          </p>
          {/* Всегда видимая ссылка для создания администратора */}
          {!showCreateAdmin && !forceShowCreate && (
            <button
              type="button"
              onClick={() => setForceShowCreate(true)}
              className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Нет аккаунта? Создать администратора
            </button>
          )}
        </div>

        {/* Create Admin Button (only if no admin exists) */}
        {!isChecking && !adminExists && !showCreateAdmin && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-start gap-3">
              <Shield className="text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 dark:text-yellow-200 mb-2">
                  Первый запуск системы
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                  Администратор не найден. Создайте первого администратора для начала работы.
                </p>
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Shield size={18} />
                  Создать администратора
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Admin Form */}
        {(showCreateAdmin || forceShowCreate) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Создание администратора
            </h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="input"
                  placeholder="admin@crm.local"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное имя *
                </label>
                <input
                  type="text"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  className="input"
                  placeholder="Администратор Системы"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пароль * (минимум 6 символов)
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подтвердите пароль *
                </label>
                <input
                  type="password"
                  value={adminForm.passwordConfirm}
                  onChange={(e) => setAdminForm({ ...adminForm, passwordConfirm: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAdmin(false)
                    setForceShowCreate(false)
                    setAdminForm({ email: '', password: '', passwordConfirm: '', full_name: '' })
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 btn btn-primary"
                >
                  {isCreating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Login form - показываем если администратор существует или после завершения проверки, но скрываем если открыта форма создания */}
        {!forceShowCreate && !showResetPassword && (adminExists || (!isChecking && !showCreateAdmin)) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="admin@crm.local"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary py-3 text-lg"
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
            </form>
            
            {/* Reset Password Link */}
            {!isChecking && adminExists && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Забыли пароль администратора?
                </button>
              </div>
            )}
            
            {/* Alternative Create Admin Button (если админа нет, показываем внизу формы) */}
            {!isChecking && !adminExists && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3 text-center">
                    Администратор не найден
                  </p>
                  <button
                    onClick={() => setShowCreateAdmin(true)}
                    className="w-full btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <Shield size={18} />
                    Создать администратора
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset Password Form */}
        {showResetPassword && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Сброс пароля администратора
            </h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Токен безопасности *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetForm.security_token}
                    onChange={(e) => setResetForm({ ...resetForm, security_token: e.target.value })}
                    className="input flex-1"
                    placeholder="admin_reset_token_2024"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenInfo(true)}
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
                    title="Где взять токен?"
                  >
                    <Info size={18} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Новый пароль * (минимум 6 символов)
                </label>
                <input
                  type="password"
                  value={resetForm.new_password}
                  onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подтвердите пароль *
                </label>
                <input
                  type="password"
                  value={resetForm.confirm_password}
                  onChange={(e) => setResetForm({ ...resetForm, confirm_password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false)
                    setResetForm({ security_token: '', new_password: '', confirm_password: '' })
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  Сбросить пароль
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
