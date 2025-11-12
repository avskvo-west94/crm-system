import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Trello, 
  Users, 
  Calendar, 
  Settings,
  Shield,
  MessageCircle,
  BarChart3,
  X
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user } = useAuthStore()

  const navigation = [
    { name: 'Панель управления', href: '/', icon: LayoutDashboard },
    { name: 'Доски', href: '/boards', icon: Trello },
    { name: 'Контакты', href: '/contacts', icon: Users },
    { name: 'Календарь', href: '/calendar', icon: Calendar },
    { name: 'Чат', href: '/chat', icon: MessageCircle },
    ...(user?.role === 'admin' || user?.role === 'manager' ? [{ name: 'Отчеты', href: '/reports', icon: BarChart3 }] : []),
    ...(user?.role === 'admin' ? [{ name: 'Администрирование', href: '/admin', icon: Shield }] : []),
    { name: 'Настройки', href: '/settings', icon: Settings },
  ]

  if (!sidebarOpen) return null

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 flex flex-col">
        {/* Header */}
        <div className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                СУП
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                Система управления проектами
              </p>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-primary-600 dark:text-primary-400' : ''} />
                  <span className="font-medium">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.full_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.role === 'admin' ? 'Администратор' : user?.role === 'manager' ? 'Менеджер' : 'Исполнитель'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

