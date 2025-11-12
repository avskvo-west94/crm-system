import { useState, useEffect } from 'react'
import { reportsApi } from '../services/api'
import { BarChart3, TrendingUp, Users, CheckCircle, Clock, Calendar, Award, Target, GanttChartSquare, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [tasksStats, setTasksStats] = useState<any>(null)
  const [usersStats, setUsersStats] = useState<any>(null)
  const [performanceStats, setPerformanceStats] = useState<any>(null)
  const [managerEfficiency, setManagerEfficiency] = useState<any[]>([])
  const [employeeContribution, setEmployeeContribution] = useState<any[]>([])
  const [ganttData, setGanttData] = useState<any[]>([])
  const [flexibleSummary, setFlexibleSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(30)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadStats()
  }, [selectedPeriod])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [dashboard, tasks, users, performance] = await Promise.all([
        reportsApi.getDashboardStats(),
        reportsApi.getTasksStats(),
        reportsApi.getUsersStats(),
        reportsApi.getPerformanceStats(selectedPeriod)
      ])
      
      setDashboardStats(dashboard)
      setTasksStats(tasks)
      setUsersStats(users)
      setPerformanceStats(performance)
      
      // Загружаем дополнительные отчеты
      if (activeTab === 'efficiency' || activeTab === 'overview') {
        const [efficiency, contribution, gantt] = await Promise.all([
          reportsApi.getManagerEfficiency(),
          reportsApi.getEmployeeContribution(selectedPeriod),
          reportsApi.getGanttData()
        ])
        setManagerEfficiency(efficiency)
        setEmployeeContribution(contribution)
        setGanttData(gantt)
      }
      
      if (activeTab === 'summary' || activeTab === 'overview') {
        const summary = await reportsApi.getFlexibleSummary({ days: selectedPeriod })
        setFlexibleSummary(summary)
      }
    } catch (error: any) {
      toast.error('Ошибка загрузки отчетов')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadStats()
  }, [selectedPeriod, activeTab])

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-${color}-100 dark:bg-${color}-900 rounded-xl`}>
          <Icon className={`text-${color}-600 dark:text-${color}-400`} size={24} />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value || 0}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>}
    </div>
  )

  const SimpleBarChart = ({ data, title, color = 'blue' }: any) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Нет данных для отображения
          </div>
        </div>
      )
    }

    // Переводим ключи на русский язык
    const translations: { [key: string]: string } = {
      // Роли
      'admin': 'Администратор',
      'manager': 'Руководитель',
      'executor': 'Исполнитель',
      'executors': 'Исполнители',
      'managers': 'Руководители',
      'admins': 'Администраторы',
      // Приоритеты
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий',
      'urgent': 'Срочный',
      // Статусы
      'in_progress': 'Прогресс выполнения',
      'completed': 'Завершено',
      'pending': 'Ожидание',
      // Дедлайн
      'deadline': 'Срок исполнения',
      'overdue': 'Просрочено'
    }

    const translatedData = Object.entries(data).reduce((acc, [key, value]) => {
      const translatedKey = translations[key.toLowerCase()] || key
      acc[translatedKey] = value as any
      return acc
    }, {} as Record<string, any>)

    const maxValue = Math.max(...Object.values(translatedData) as number[])
    const entries = Object.entries(translatedData)

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{title}</h3>
        <div className="space-y-4">
          {entries.map(([label, value]: [string, any]) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">
                {label}
              </div>
              <div className="flex-1">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div
                    className={`h-full bg-${color}-600 dark:bg-${color}-500 transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  >
                    <span className="text-white text-xs font-semibold">{value}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка отчетов...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Обзор', icon: BarChart3 },
    { id: 'efficiency', name: 'Эффективность', icon: Award },
    { id: 'contribution', name: 'Вклад сотрудников', icon: Target },
    { id: 'gantt', name: 'График Ганта', icon: GanttChartSquare },
    { id: 'summary', name: 'Гибкая сводка', icon: Filter },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 size={32} className="text-primary-600" />
            Отчеты и аналитика
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Обзор статистики и производительности системы
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === days
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {days} дн.
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            <tab.icon size={18} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Всего досок"
              value={dashboardStats?.overview?.total_boards}
              icon={BarChart3}
              color="blue"
            />
            <StatCard
              title="Всего задач"
              value={dashboardStats?.overview?.total_cards}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Активных пользователей"
              value={dashboardStats?.overview?.total_users}
              icon={Users}
              color="purple"
            />
            <StatCard
              title="Контактов"
              value={dashboardStats?.overview?.total_contacts}
              icon={Users}
              color="orange"
            />
          </div>

          {/* Performance Stats */}
          {performanceStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Новые доски"
                value={performanceStats.new_boards}
                icon={BarChart3}
                color="blue"
                subtitle={`за ${selectedPeriod} дн.`}
              />
              <StatCard
                title="Завершено задач"
                value={performanceStats.completed_cards}
                icon={CheckCircle}
                color="green"
                subtitle={`за ${selectedPeriod} дн.`}
              />
              <StatCard
                title="Создано задач"
                value={performanceStats.created_cards}
                icon={Clock}
                color="yellow"
                subtitle={`за ${selectedPeriod} дн.`}
              />
              <StatCard
                title="Процент выполнения"
                value={`${performanceStats.completion_rate || 0}%`}
                icon={TrendingUp}
                color="purple"
                subtitle={`за ${selectedPeriod} дн.`}
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleBarChart
              title="Задачи по статусам"
              data={tasksStats?.by_status}
              color="blue"
            />
            <SimpleBarChart
              title="Задачи по приоритетам"
              data={tasksStats?.by_priority}
              color="red"
            />
            <SimpleBarChart
              title="Пользователи по ролям"
              data={usersStats?.by_role}
              color="purple"
            />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Статистика пользователей</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Активных</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {usersStats?.active || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Неактивных</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {usersStats?.inactive || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Согласованных</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {usersStats?.approved || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ожидающих согласования</span>
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {usersStats?.pending || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          {tasksStats?.by_date && tasksStats.by_date.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Активность за последние 7 дней
              </h3>
              <div className="flex items-end gap-2 h-64">
                {tasksStats.by_date.map((item: any, index: number) => {
                  const maxValue = Math.max(...tasksStats.by_date.map((d: any) => d.count))
                  const height = (item.count / maxValue) * 100
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full" style={{ height: '200px' }}>
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2"
                          style={{ height: `${height}%` }}
                        >
                          <span className="text-white text-xs font-semibold">{item.count}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap transform -rotate-45 origin-bottom-left">
                        {new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'efficiency' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Award size={20} className="text-primary-600" />
              Рейтинг эффективности менеджеров
            </h3>
            {managerEfficiency.length > 0 ? (
              <div className="space-y-4">
                {managerEfficiency.map((manager, index) => (
                  <div key={manager.manager_id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{manager.manager_name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{manager.owned_boards} проектов</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{manager.efficiency_score}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Рейтинг</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Всего задач</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{manager.total_tasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Выполнено</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{manager.completed_tasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Просрочено</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{manager.overdue_tasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Сред. задержка</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{manager.avg_delay_days} дн.</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: `${manager.completion_rate}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Процент выполнения: {manager.completion_rate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">Нет данных о менеджерах</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contribution' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Target size={20} className="text-primary-600" />
              Вклад сотрудников в общий результат
            </h3>
            {employeeContribution.length > 0 ? (
              <div className="space-y-4">
                {employeeContribution.map((employee, index) => (
                  <div key={employee.employee_id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{employee.employee_name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Исполнитель</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{employee.contribution_score}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Баллы вклада</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Назначено</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{employee.assigned_tasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Выполнено</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{employee.completed_tasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">В работе</p>
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{employee.in_progress_tasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Комментарии</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{employee.comments_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Файлы</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{employee.files_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">Нет данных о сотрудниках</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gantt' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <GanttChartSquare size={20} className="text-primary-600" />
              Диаграмма Ганта - Визуализация сроков и прогресса
            </h3>
            {ganttData.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ganttData.map((task) => (
                  <div key={task.task_id} className={`p-4 border-l-4 rounded-lg ${task.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : task.overdue ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{task.task_name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${task.completed ? 'bg-green-100 text-green-800' : task.overdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {task.completed ? 'Завершено' : task.overdue ? 'Просрочено' : 'В работе'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Проект:</p>
                        <p className="font-medium text-gray-900 dark:text-white">{task.board_name}</p>
                      </div>
                      {task.start_date && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Начало:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{new Date(task.start_date).toLocaleDateString('ru-RU')}</p>
                        </div>
                      )}
                      {task.end_date && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Дедлайн:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{new Date(task.end_date).toLocaleDateString('ru-RU')}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={`h-2 rounded-full ${task.completed ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${task.progress}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{task.progress}%</span>
                    </div>
                    {task.assignees && task.assignees.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Исполнители: {task.assignees.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">Нет данных для отображения</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summary' && flexibleSummary && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Filter size={20} className="text-primary-600" />
              Гибкая сводка - Настраиваемые фильтры
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SimpleBarChart
                title="По статусу"
                data={flexibleSummary.by_status}
                color="blue"
              />
              <SimpleBarChart
                title="По приоритету"
                data={flexibleSummary.by_priority}
                color="red"
              />
              <SimpleBarChart
                title="По проектам"
                data={flexibleSummary.by_board}
                color="purple"
              />
              <SimpleBarChart
                title="По исполнителям"
                data={flexibleSummary.by_assignee}
                color="green"
              />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Детальный список задач ({flexibleSummary.total_tasks})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {flexibleSummary.tasks.map((task: any) => (
                  <div key={task.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900 dark:text-white">{task.title}</h5>
                      <span className={`text-xs px-2 py-1 rounded-full ${task.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {task.completed ? 'Завершено' : task.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>Проект: {task.board}</span>
                      <span>Приоритет: {task.priority}</span>
                      {task.assignees && task.assignees.length > 0 && <span>Исп.: {task.assignees.join(', ')}</span>}
                      {task.due_date && <span>Срок: {new Date(task.due_date).toLocaleDateString('ru-RU')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

