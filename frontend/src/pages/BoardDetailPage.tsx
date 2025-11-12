import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsApi, cardsApi, usersApi, filesApi } from '../services/api'
import { Plus, X, Calendar, Users, AlertCircle, FileText, Upload, Clock, CheckCircle, XCircle, Maximize2, Minimize2, Download, Trash2, Lock, FileDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function BoardDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCardModal, setShowCardModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null)
  const [editingCard, setEditingCard] = useState<any>(null)
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [isModalExpanded, setIsModalExpanded] = useState(false)
  const [newCard, setNewCard] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium',
    due_date: '',
    assignee_ids: [] as number[]
  })

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', id],
    queryFn: () => boardsApi.getBoard(Number(id)),
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })

  const createCardMutation = useMutation({
    mutationFn: cardsApi.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] })
      setShowCardModal(false)
      setNewCard({ title: '', description: '', priority: 'medium', due_date: '', assignee_ids: [] })
      toast.success('Карточка создана!')
    },
  })

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }: any) => cardsApi.updateCard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] })
      setShowEditModal(false)
      setEditingCard(null)
    },
  })

  const deleteCardMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => cardsApi.deleteCardWithConfirm(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] })
      setShowDeleteConfirm(false)
      setDeletePassword('')
      setDeleteCardId(null)
      toast.success('Карточка удалена')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка при удалении')
    },
  })

  const uploadFileMutation = useMutation({
    mutationFn: ({ file, cardId, retentionDays }: any) => filesApi.uploadFile(file, cardId, retentionDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] })
      toast.success('Файл загружен!')
    },
    onError: () => {
      toast.error('Ошибка при загрузке файла')
    },
  })

  const updateBoardMutation = useMutation({
    mutationFn: ({ boardId, data }: any) => boardsApi.updateBoard(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', id] })
      toast.success('Статус проекта обновлен')
    },
    onError: () => {
      toast.error('Ошибка при обновлении статуса')
    },
  })

  const handleArchiveBoard = async () => {
    try {
      const blob = await boardsApi.archiveBoard(Number(id))
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${board?.title}_files.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Архив скачан')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании архива')
    }
  }

  const handleExportPdf = async () => {
    try {
      const blob = await boardsApi.exportPdf(Number(id))
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${board?.title}_archive.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF архив скачан')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании PDF')
    }
  }

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedColumn) return

    createCardMutation.mutate({
      title: newCard.title,
      description: newCard.description || undefined,
      column_id: selectedColumn,
      position: 0,
      priority: newCard.priority,
      due_date: newCard.due_date || undefined,
      assignee_ids: newCard.assignee_ids,
    })
  }

  const handleToggleComplete = (card: any) => {
    updateCardMutation.mutate({
      id: card.id,
      data: { completed: !card.completed },
    })
  }

  const handleOpenCard = (card: any) => {
    setEditingCard(card)
    setShowEditModal(true)
  }

  const handleDeleteCard = (cardId: number) => {
    setDeleteCardId(cardId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteCardId) return
    deleteCardMutation.mutate({ id: deleteCardId, password: deletePassword })
  }

  const handleUpdateCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCard) return

    updateCardMutation.mutate({
      id: editingCard.id,
      data: {
        title: editingCard.title,
        description: editingCard.description,
        priority: editingCard.priority,
        due_date: editingCard.due_date,
        assignee_ids: editingCard.assignee_ids || [],
      },
    })
  }

  const handleFileUpload = async (file: File, cardId: number, retentionDays?: number) => {
    uploadFileMutation.mutate({ file, cardId, retentionDays })
  }

  const handleUpdateBoardStatus = (status: string) => {
    if (!id) return
    updateBoardMutation.mutate({ boardId: Number(id), data: { status } })
  }

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[priority] || colors.medium
  }

  const getPriorityLabel = (priority: string) => {
    const labels: any = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      urgent: 'Срочный',
    }
    return labels[priority] || priority
  }

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-8 h-8 rounded-lg"
          style={{ backgroundColor: board?.color }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {board?.title}
            </h1>
            {board?.status && (user?.role === 'admin' || user?.role === 'manager') && (
              <select
                value={board.status}
                onChange={(e) => handleUpdateBoardStatus(e.target.value)}
                className="text-sm px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="PLANNING">Планирование</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="ON_HOLD">Приостановлен</option>
                <option value="COMPLETED">Завершен</option>
                <option value="CANCELLED">Отменен</option>
                <option value="FAILED">Неудачный</option>
              </select>
            )}
            {board?.status && (user?.role !== 'admin' && user?.role !== 'manager') && (
              <span className="text-sm px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {board.status === 'PLANNING' && 'Планирование'}
                {board.status === 'IN_PROGRESS' && 'В работе'}
                {board.status === 'ON_HOLD' && 'Приостановлен'}
                {board.status === 'COMPLETED' && 'Завершен'}
                {board.status === 'CANCELLED' && 'Отменен'}
                {board.status === 'FAILED' && 'Неудачный'}
              </span>
            )}
          </div>
          {board?.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {board.description}
            </p>
          )}
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="flex gap-2">
            <button
              onClick={handleArchiveBoard}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Скачать архив файлов
            </button>
            {board?.status && ['COMPLETED', 'CANCELLED', 'FAILED'].includes(board.status) && (
              <button
                onClick={handleExportPdf}
                className="btn btn-primary flex items-center gap-2"
              >
                <FileDown size={18} />
                Экспорт PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {board?.columns?.map((column: any) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 card p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {column.title}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {column.cards?.length || 0}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedColumn(column.id)
                  setShowCardModal(true)
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="Добавить карточку"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {column.cards?.map((card: any) => {
                const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !card.completed
                return (
                  <div
                    key={card.id}
                    className={`bg-white dark:bg-gray-700 p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                      isOverdue 
                        ? 'border-red-500 dark:border-red-400' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={card.completed}
                        onChange={() => handleToggleComplete(card)}
                        className="mt-1 w-4 h-4 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 
                          className={`font-medium text-gray-900 dark:text-white cursor-pointer ${card.completed ? 'line-through' : ''}`}
                          onClick={() => handleOpenCard(card)}
                        >
                          {card.title}
                        </h4>
                      </div>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCard(card.id)
                          }}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                          title="Удалить задачу"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {card.description && (
                      <p 
                        className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 cursor-pointer"
                        onClick={() => handleOpenCard(card)}
                      >
                        {card.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {card.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(card.priority)}`}>
                          {getPriorityLabel(card.priority)}
                        </span>
                      )}
                      {card.due_date && (
                        <span className={`text-xs flex items-center gap-1 ${
                          isOverdue 
                            ? 'text-red-600 dark:text-red-400 font-semibold' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <Calendar size={12} />
                          {new Date(card.due_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertCircle size={12} />
                          Просрочено!
                        </span>
                      )}
                    </div>

                    {card.assignees?.length > 0 && (
                      <div className="flex -space-x-2 mt-3">
                        {card.assignees.map((user: any) => (
                          <div
                            key={user.id}
                            className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center border-2 border-white dark:border-gray-700"
                            title={user.full_name}
                          >
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {(!board?.columns || board.columns.length === 0) && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            Нет колонок
          </div>
        )}
      </div>

      {/* Create Card Modal */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className={`modal ${isModalExpanded ? 'max-w-4xl' : 'max-w-lg'} transition-all duration-300`} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Создать карточку
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsModalExpanded(!isModalExpanded)
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title={isModalExpanded ? 'Уменьшить' : 'Увеличить'}
                  >
                    {isModalExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  </button>
                  <button
                    onClick={() => setShowCardModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateCard} className="space-y-3 pb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={newCard.title}
                    onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                    className="input"
                    placeholder="Название задачи"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={newCard.description}
                    onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Описание задачи (необязательно)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Приоритет
                    </label>
                    <select
                      value={newCard.priority}
                      onChange={(e) => setNewCard({ ...newCard, priority: e.target.value })}
                      className="input"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                      <option value="urgent">Срочный</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Дедлайн
                    </label>
                    <input
                      type="datetime-local"
                      value={newCard.due_date}
                      onChange={(e) => setNewCard({ ...newCard, due_date: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Исполнители
                  </label>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {allUsers.map((user: any) => (
                      <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded">
                        <input
                          type="checkbox"
                          checked={newCard.assignee_ids.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCard({ ...newCard, assignee_ids: [...newCard.assignee_ids, user.id] })
                            } else {
                              setNewCard({ ...newCard, assignee_ids: newCard.assignee_ids.filter((id: number) => id !== user.id) })
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
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Файлы (загрузка после создания карточки)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Файлы можно загрузить после создания карточки
                  </p>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowCardModal(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={createCardMutation.isPending}
                    className="flex-1 btn btn-primary"
                  >
                    {createCardMutation.isPending ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                    Подтверждение удаления
                  </h2>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 pb-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    Внимание!
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    Вы собираетесь удалить задачу со всеми связанными данными:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-300 mt-2 space-y-1">
                    <li>Все комментарии к задаче</li>
                    <li>Все файлы, прикрепленные к задаче</li>
                    <li>Чек-листы и элементы чек-листов</li>
                    <li>Назначения исполнителей</li>
                  </ul>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200 mt-3">
                    Это действие нельзя отменить!
                  </p>
                </div>

                <form onSubmit={handleConfirmDelete} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Lock size={16} />
                      Введите ваш пароль для подтверждения *
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="input"
                      placeholder="Ваш пароль"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 btn btn-secondary"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={deleteCardMutation.isPending}
                      className="flex-1 btn btn-danger"
                    >
                      {deleteCardMutation.isPending ? 'Удаление...' : 'Подтвердить удаление'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {showEditModal && editingCard && (
        <EditCardModal
          card={editingCard}
          board={board}
          allUsers={allUsers}
          onClose={() => {
            setShowEditModal(false)
            setEditingCard(null)
          }}
          onSave={handleUpdateCard}
          onFileUpload={handleFileUpload}
          uploadLoading={uploadFileMutation.isPending}
        />
      )}
    </div>
  )
}

// Separate component for Edit Card Modal
function EditCardModal({ card, board, allUsers, onClose, onSave, onFileUpload, uploadLoading }: any) {
  const { user } = useAuthStore()
  const [exportPdfLoading, setExportPdfLoading] = useState(false)
  
  const [editCard, setEditCard] = useState<any>({
    ...card,
    due_date: card.due_date ? new Date(card.due_date).toISOString().slice(0, 16) : '',
    assignee_ids: card.assignees?.map((a: any) => a.id) || []
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [retentionDays, setRetentionDays] = useState<number>(180) // По умолчанию 180 дней (полгода)
  const [showRetentionOptions, setShowRetentionOptions] = useState(false)
  const [isModalExpanded, setIsModalExpanded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const queryClient = useQueryClient()

  // Update editCard when card prop changes (e.g., after file upload)
  useEffect(() => {
    setEditCard({
      ...card,
      due_date: card.due_date ? new Date(card.due_date).toISOString().slice(0, 16) : '',
      assignee_ids: card.assignees?.map((a: any) => a.id) || []
    })
  }, [card])

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', card.id],
    queryFn: () => cardsApi.getComments(card.id),
    enabled: !!card.id
  })

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => cardsApi.createComment({ card_id: card.id, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', card.id] })
      queryClient.invalidateQueries({ queryKey: ['board'] })
      setNewComment('')
      toast.success('Комментарий добавлен')
    },
    onError: () => {
      toast.error('Ошибка при добавлении комментария')
    }
  })

  const updateCommentStatusMutation = useMutation({
    mutationFn: ({ commentId, status, reason }: { commentId: number, status: string, reason?: string }) =>
      cardsApi.updateCommentStatus(commentId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', card.id] })
      toast.success('Статус комментария обновлен')
    },
    onError: () => {
      toast.error('Ошибка при обновлении статуса')
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setRetentionDays(180) // Устанавливаем полгода по умолчанию
      setShowRetentionOptions(true)
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    await onFileUpload(selectedFile, card.id, retentionDays)
    setSelectedFile(null)
    setShowRetentionOptions(false)
  }

  const handleExportPdf = async () => {
    if (!board?.id) return
    setExportPdfLoading(true)
    try {
      const blob = await boardsApi.exportPdf(board.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${board.title}_отчет.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF отчет скачан')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании PDF')
    } finally {
      setExportPdfLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${isModalExpanded ? 'max-w-4xl' : 'max-w-lg'} transition-all duration-300`} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Редактировать карточку
            </h2>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsModalExpanded(!isModalExpanded)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title={isModalExpanded ? 'Уменьшить' : 'Увеличить'}
              >
                {isModalExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={onSave} className="space-y-3 pb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Название *
              </label>
              <input
                type="text"
                value={editCard.title}
                onChange={(e) => setEditCard({ ...editCard, title: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Описание
              </label>
              <textarea
                value={editCard.description || ''}
                onChange={(e) => setEditCard({ ...editCard, description: e.target.value })}
                className="input"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Приоритет
                </label>
                <select
                  value={editCard.priority}
                  onChange={(e) => setEditCard({ ...editCard, priority: e.target.value })}
                  className="input"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="urgent">Срочный</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дедлайн
                </label>
                <input
                  type="datetime-local"
                  value={editCard.due_date}
                  onChange={(e) => setEditCard({ ...editCard, due_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Исполнители
              </label>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 max-h-32 overflow-y-auto">
                {allUsers.map((user: any) => (
                  <label key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={editCard.assignee_ids.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditCard({ ...editCard, assignee_ids: [...editCard.assignee_ids, user.id] })
                        } else {
                          setEditCard({ ...editCard, assignee_ids: editCard.assignee_ids.filter((id: number) => id !== user.id) })
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
            </div>

            {/* File Upload Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Файлы
              </h3>
              
              {card.files && card.files.length > 0 && (
                <div className="space-y-1 mb-3">
                  {card.files.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-900 dark:text-white truncate">{file.original_filename}</span>
                        {file.expires_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            ({new Date(file.expires_at).toLocaleDateString('ru-RU')})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const blob = await filesApi.downloadFile(file.id)
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = file.original_filename
                            document.body.appendChild(a)
                            a.click()
                            window.URL.revokeObjectURL(url)
                            document.body.removeChild(a)
                          } catch (error: any) {
                            toast.error(error.response?.data?.detail || 'Ошибка при скачивании')
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex-shrink-0"
                      >
                        Скачать
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Загрузить файл
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white dark:text-gray-400 focus:outline-none dark:border-gray-600 dark:placeholder-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700"
                />
                
                {showRetentionOptions && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-200">
                      Срок хранения файла
                    </label>
                    <select
                      value={retentionDays || 180}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      className="input"
                    >
                      <option value="1">1 день</option>
                      <option value="3">3 дня</option>
                      <option value="7">7 дней</option>
                      <option value="30">1 месяц</option>
                      <option value="180">Полгода (максимальный срок)</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleFileSubmit}
                        disabled={uploadLoading}
                        className="btn btn-primary text-sm py-1"
                      >
                        {uploadLoading ? 'Загрузка...' : 'Загрузить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null)
                          setShowRetentionOptions(false)
                        }}
                        className="btn btn-secondary text-sm py-1"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Примечания ({comments.length})
              </h3>
              
              {/* List of comments */}
              {comments.length > 0 && (
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                            {comment.author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {comment.author?.full_name || 'Неизвестный'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(comment.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      {comment.status && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          {comment.status === 'accepted' && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle size={12} /> Принят
                            </span>
                          )}
                          {comment.status === 'rejected' && (
                            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                              <XCircle size={12} /> Отклонен
                              {comment.status_reason && <span>: {comment.status_reason}</span>}
                            </span>
                          )}
                        </div>
                      )}
                      {!comment.status && allUsers.some((u: any) => u.role === 'manager' || u.role === 'admin') && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => updateCommentStatusMutation.mutate({ commentId: comment.id, status: 'accepted' })}
                            className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                          >
                            Принять
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Причина отклонения:')
                              if (reason) {
                                updateCommentStatusMutation.mutate({ commentId: comment.id, status: 'rejected', reason })
                              }
                            }}
                            className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                          >
                            Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment form */}
              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Напишите примечание..."
                  className="input text-sm"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newComment.trim()) {
                      createCommentMutation.mutate(newComment.trim())
                    }
                  }}
                  disabled={createCommentMutation.isPending || !newComment.trim()}
                  className="btn btn-primary text-sm w-full"
                >
                  {createCommentMutation.isPending ? 'Отправка...' : 'Добавить примечание'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn btn-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary"
              >
                Сохранить
              </button>
            </div>
            
            {/* PDF Export button - only for completed/cancelled/failed projects */}
            {board?.status && (() => {
              const status = board.status?.toUpperCase?.() || board.status
              const isCompleted = status === 'COMPLETED' || status === 'completed'
              const isCancelled = status === 'CANCELLED' || status === 'cancelled'
              const isFailed = status === 'FAILED' || status === 'failed'
              const isAllowed = isCompleted || isCancelled || isFailed
              const hasPermission = user?.role === 'admin' || user?.role === 'manager'
              return isAllowed && hasPermission
            })() && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exportPdfLoading}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2"
                >
                  <FileDown size={18} />
                  {exportPdfLoading ? 'Создание PDF...' : 'Экспорт PDF проекта'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
