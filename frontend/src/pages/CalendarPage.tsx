import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarApi, cardsApi, usersApi } from '../services/api'
import { Calendar, Plus, Clock, CheckCircle2, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    all_day: false,
    color: '#3B82F6',
    shared_user_ids: [] as number[],
  })
  const queryClient = useQueryClient()

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { locale: ru })
  const calendarEnd = endOfWeek(monthEnd, { locale: ru })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd')],
    queryFn: () => calendarApi.getEvents(format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd')),
  })

  const { data: cards = [] } = useQuery({
    queryKey: ['calendar-cards', format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd')],
    queryFn: () => cardsApi.getCards(),
  })

  const createEventMutation = useMutation({
    mutationFn: calendarApi.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setShowCreateModal(false)
      setNewEvent({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        all_day: false,
        color: '#3B82F6',
        shared_user_ids: [],
      })
      toast.success('Событие создано!')
    },
    onError: () => {
      toast.error('Ошибка при создании события')
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: any) => calendarApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setShowEditModal(false)
      setEditingEvent(null)
      toast.success('Событие обновлено!')
    },
    onError: () => {
      toast.error('Ошибка при обновлении события')
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => calendarApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      toast.success('Событие удалено!')
    },
    onError: () => {
      toast.error('Ошибка при удалении события')
    },
  })

  const handleDateClick = (date: Date) => {
    if (!isSameMonth(date, currentDate)) {
      setCurrentDate(date)
      return
    }
    setSelectedDate(date)
    setNewEvent({
      ...newEvent,
      start_date: format(date, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(date, "yyyy-MM-dd'T'HH:mm"),
    })
    setShowCreateModal(true)
  }

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault()
    createEventMutation.mutate(newEvent)
  }

  const handleEventClick = (event: any) => {
    setEditingEvent({
      ...event,
      start_date: event.start_date ? format(parseISO(event.start_date), "yyyy-MM-dd'T'HH:mm") : '',
      end_date: event.end_date ? format(parseISO(event.end_date), "yyyy-MM-dd'T'HH:mm") : '',
      shared_user_ids: event.shared_with_users?.map((u: any) => u.id) || []
    })
    setShowEditModal(true)
  }

  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return
    const { id, created_by, created_at, updated_at, ...eventData } = editingEvent
    updateEventMutation.mutate({ id, data: eventData })
  }

  const getEventsForDate = (date: Date) => {
    const dayEvents = events.filter((event: any) => {
      const eventDate = parseISO(event.start_date)
      return isSameDay(eventDate, date)
    })
    
    const dayCards = cards.filter((card: any) => {
      if (!card.due_date) return false
      const cardDate = parseISO(card.due_date)
      return isSameDay(cardDate, date)
    })

    return { events: dayEvents, cards: dayCards }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Календарь
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Планирование и отслеживание задач
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              День
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedDate(new Date())
              setShowCreateModal(true)
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Создать событие
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between card p-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="btn btn-secondary"
        >
          ← Предыдущий
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy', { locale: ru })}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="btn btn-secondary"
        >
          Следующий →
        </button>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <div className="card overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const { events: dayEvents, cards: dayCards } = getEventsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[100px] p-2 border-r border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : ''
                  } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isCurrentMonth
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-600'
                    } ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event: any) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                        className="text-xs px-1 py-0.5 rounded truncate cursor-pointer"
                        style={{
                          backgroundColor: `${event.color}20`,
                          color: event.color,
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayCards.slice(0, 2).map((card: any) => (
                      <div
                        key={card.id}
                        className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${
                          card.completed
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : card.priority === 'urgent'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                        }`}
                      >
                        {card.completed ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <Clock size={10} />
                        )}
                        {card.title}
                      </div>
                    ))}
                    {(dayEvents.length > 3 || dayCards.length > 2) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayEvents.length - 3 + Math.max(0, dayCards.length - 2)} ещё
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Создать событие
            </h2>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Начало *
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    className="input"
                    required
                    disabled={newEvent.all_day}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Конец
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    className="input"
                    disabled={newEvent.all_day}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={newEvent.all_day}
                  onChange={(e) => setNewEvent({ ...newEvent, all_day: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="all_day" className="text-sm text-gray-700 dark:text-gray-300">
                  Весь день
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цвет
                </label>
                <input
                  type="color"
                  value={newEvent.color}
                  onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Уведомить пользователей
                </label>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 max-h-40 overflow-y-auto">
                  {allUsers.map((user: any) => (
                    <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={newEvent.shared_user_ids.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewEvent({ ...newEvent, shared_user_ids: [...newEvent.shared_user_ids, user.id] })
                          } else {
                            setNewEvent({ ...newEvent, shared_user_ids: newEvent.shared_user_ids.filter((id: number) => id !== user.id) })
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
                  Выберите пользователей, которым будет доступно это событие
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
                  disabled={createEventMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createEventMutation.isPending ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Редактировать событие
            </h2>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Начало *
                  </label>
                  <input
                    type="datetime-local"
                    value={editingEvent.start_date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                    className="input"
                    required
                    disabled={editingEvent.all_day}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Конец
                  </label>
                  <input
                    type="datetime-local"
                    value={editingEvent.end_date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                    className="input"
                    disabled={editingEvent.all_day}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_all_day"
                  checked={editingEvent.all_day}
                  onChange={(e) => setEditingEvent({ ...editingEvent, all_day: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="edit_all_day" className="text-sm text-gray-700 dark:text-gray-300">
                  Весь день
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цвет
                </label>
                <input
                  type="color"
                  value={editingEvent.color}
                  onChange={(e) => setEditingEvent({ ...editingEvent, color: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Уведомить пользователей
                </label>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 max-h-40 overflow-y-auto">
                  {allUsers.map((user: any) => (
                    <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={editingEvent.shared_user_ids.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingEvent({ ...editingEvent, shared_user_ids: [...editingEvent.shared_user_ids, user.id] })
                          } else {
                            setEditingEvent({ ...editingEvent, shared_user_ids: editingEvent.shared_user_ids.filter((id: number) => id !== user.id) })
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
                  Выберите пользователей, которым будет доступно это событие
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Вы уверены, что хотите удалить это событие?')) {
                      deleteEventMutation.mutate(editingEvent.id)
                      setShowEditModal(false)
                    }
                  }}
                  className="flex-1 btn btn-danger"
                >
                  <Trash2 size={16} className="inline mr-2" />
                  Удалить
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={updateEventMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {updateEventMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

