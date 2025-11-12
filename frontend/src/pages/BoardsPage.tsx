import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsApi } from '../services/api'
import { Plus, Trash2, Edit, FileDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function BoardsPage() {
  const { user } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportPdfLoading, setExportPdfLoading] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null)
  const [newBoard, setNewBoard] = useState({ title: '', description: '', color: '#3B82F6' })
  const queryClient = useQueryClient()

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardsApi.getBoards(),
  })

  const createMutation = useMutation({
    mutationFn: boardsApi.createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setShowCreateModal(false)
      setNewBoard({ title: '', description: '', color: '#3B82F6' })
      toast.success('Доска создана успешно!')
    },
    onError: () => {
      toast.error('Ошибка при создании доски')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: boardsApi.deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast.success('Доска удалена')
    },
    onError: () => {
      toast.error('Ошибка при удалении доски')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(newBoard)
  }

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Удалить доску "${title}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleExportPdf = async () => {
    if (!selectedBoardId) {
      toast.error('Выберите проект для экспорта')
      return
    }

    setExportPdfLoading(true)
    try {
      const blob = await boardsApi.exportPdf(selectedBoardId)
      const selectedBoard = boards.find((b: any) => b.id === selectedBoardId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedBoard?.title || 'проект'}_отчет.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF отчет скачан')
      setShowExportModal(false)
      setSelectedBoardId(null)
    } catch (error: any) {
      console.error('PDF export error:', error)
      toast.error(error.response?.data?.detail || 'Ошибка при создании PDF')
    } finally {
      setExportPdfLoading(false)
    }
  }

  // Filter boards that can be exported (completed, cancelled, failed)
  const exportableBoards = boards.filter((board: any) => {
    const status = board.status?.toUpperCase?.() || board.status
    return status === 'COMPLETED' || status === 'CANCELLED' || status === 'FAILED' || 
           status === 'completed' || status === 'cancelled' || status === 'failed'
  })

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Доски проектов
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление проектами и задачами
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === 'admin' || user?.role === 'manager') && exportableBoards.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FileDown size={20} />
              Экспорт PDF проекта
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Создать доску
          </button>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {boards.map((board: any) => (
          <div key={board.id} className="card p-6 hover:shadow-lg transition-shadow">
            <Link to={`/boards/${board.id}`} className="block">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-4 h-4 rounded flex-shrink-0 mt-1"
                  style={{ backgroundColor: board.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                    {board.title}
                  </h3>
                  {board.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(board.created_at).toLocaleDateString('ru-RU')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(board.id, board.title)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Нет досок. Создайте первую доску!
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Создать новую доску
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                  className="input"
                  placeholder="Название доски"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Описание доски (необязательно)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цвет
                </label>
                <div className="flex gap-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewBoard({ ...newBoard, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        newBoard.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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

      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Экспорт PDF проекта
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Выберите проект для экспорта
                </label>
                {exportableBoards.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    Нет проектов для экспорта. Экспорт доступен только для завершенных, отмененных или неудачных проектов.
                  </p>
                ) : (
                  <select
                    value={selectedBoardId || ''}
                    onChange={(e) => setSelectedBoardId(Number(e.target.value) || null)}
                    className="input w-full"
                  >
                    <option value="">-- Выберите проект --</option>
                    {exportableBoards.map((board: any) => {
                      const status = board.status?.toUpperCase?.() || board.status
                      const statusText = 
                        status === 'COMPLETED' || status === 'completed' ? 'Завершен' :
                        status === 'CANCELLED' || status === 'cancelled' ? 'Отменен' :
                        status === 'FAILED' || status === 'failed' ? 'Неудачный' : board.status
                      return (
                        <option key={board.id} value={board.id}>
                          {board.title} ({statusText})
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false)
                    setSelectedBoardId(null)
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={!selectedBoardId || exportPdfLoading}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  <FileDown size={18} />
                  {exportPdfLoading ? 'Создание PDF...' : 'Экспортировать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

