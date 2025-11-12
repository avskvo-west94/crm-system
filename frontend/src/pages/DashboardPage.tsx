import { useQuery } from '@tanstack/react-query'
import { cardsApi, boardsApi, notificationsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Trello, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: myCards = [] } = useQuery({
    queryKey: ['my-cards'],
    queryFn: () => cardsApi.getCards({ assigned_to_me: true }),
  })

  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardsApi.getBoards(),
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(true),
  })

  const completedCards = myCards.filter((card: any) => card.completed).length
  const activeCards = myCards.filter((card: any) => !card.completed).length
  const overdueCards = myCards.filter((card: any) => {
    if (!card.due_date || card.completed) return false
    return new Date(card.due_date) < new Date()
  }).length

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Добро пожаловать, {user?.full_name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Вот обзор вашей работы
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(user?.role === 'admin' || user?.role === 'manager') ? (
          <>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Всего проектов</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {boards.length}
                  </p>
                </div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Trello className="text-primary-600 dark:text-primary-400" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Активные проекты</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {boards.filter((b: any) => {
                      const status = b.status?.toUpperCase?.() || b.status
                      return status === 'IN_PROGRESS' || status === 'PLANNING' || status === 'in_progress' || status === 'planning'
                    }).length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Завершено</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {boards.filter((b: any) => {
                      const status = b.status?.toUpperCase?.() || b.status
                      return status === 'COMPLETED' || status === 'completed'
                    }).length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Мои задачи</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {myCards.length}
                  </p>
                </div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Trello className="text-primary-600 dark:text-primary-400" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Активные задачи</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {activeCards}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
              </div>
            </div>
          </>
        )}

        {(user?.role === 'admin' || user?.role === 'manager') ? (
          <>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Завершено</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {boards.filter((b: any) => {
                      const status = b.status?.toUpperCase?.() || b.status
                      return status === 'COMPLETED' || status === 'completed'
                    }).length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Отменено</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {boards.filter((b: any) => {
                      const status = b.status?.toUpperCase?.() || b.status
                      return status === 'CANCELLED' || status === 'FAILED' || status === 'cancelled' || status === 'failed'
                    }).length}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Завершено</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {completedCards}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Просрочено</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {overdueCards}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Мои задачи
          </h2>
          <div className="space-y-3">
            {myCards.slice(0, 5).map((card: any) => (
              <div key={card.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={card.completed}
                  readOnly
                  className="w-5 h-5 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${card.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    {card.title}
                  </p>
                  {card.due_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Срок: {new Date(card.due_date).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {myCards.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                У вас пока нет задач
              </p>
            )}
          </div>
          {myCards.length > 5 && (
            <Link to="/boards" className="block text-center text-primary-600 dark:text-primary-400 text-sm font-medium mt-4 hover:underline">
              Показать все задачи
            </Link>
          )}
        </div>

        {/* Recent Boards */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Доски проектов
          </h2>
          <div className="space-y-3">
            {boards.slice(0, 5).map((board: any) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: board.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {board.title}
                    </p>
                    {board.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {board.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {boards.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Нет досок для отображения
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

