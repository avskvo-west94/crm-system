import axios from 'axios'

// Используем относительный путь для API через Nginx
const API_URL = ''

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)
    
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },
  
  checkAdminExists: async () => {
    const response = await api.get('/auth/check-admin')
    return response.data
  },
  
  createAdmin: async (data: { email: string; password: string; full_name: string }) => {
    const response = await api.post('/auth/create-admin', data)
    return response.data
  },
  
  resetAdminPassword: async (data: { security_token: string; new_password: string }) => {
    const response = await api.post('/auth/reset-admin-password', data)
    return response.data
  },
}

// Users API
export const usersApi = {
  getUsers: async () => {
    const response = await api.get('/users/')
    return response.data
  },
  
  createUser: async (data: any) => {
    const response = await api.post('/users/', data)
    return response.data
  },
  
  updateUser: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },
  
  deleteUser: async (id: number) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },
  
  approveUser: async (id: number) => {
    const response = await api.post(`/users/${id}/approve`)
    return response.data
  },
  
  rejectUser: async (id: number) => {
    const response = await api.post(`/users/${id}/reject`)
    return response.data
  },
  
  getPendingUsers: async () => {
    const response = await api.get('/users/pending/')
    return response.data
  },
}

// Boards API
export const boardsApi = {
  getBoards: async (includeArchived = false) => {
    const response = await api.get('/boards/', { params: { include_archived: includeArchived } })
    return response.data
  },
  
  getBoard: async (id: number) => {
    const response = await api.get(`/boards/${id}`)
    return response.data
  },
  
  createBoard: async (data: any) => {
    const response = await api.post('/boards/', data)
    return response.data
  },
  
  updateBoard: async (id: number, data: any) => {
    const response = await api.put(`/boards/${id}`, data)
    return response.data
  },
  
  deleteBoard: async (id: number) => {
    const response = await api.delete(`/boards/${id}`)
    return response.data
  },
  
  createColumn: async (data: any) => {
    const response = await api.post('/boards/columns', data)
    return response.data
  },
  
  updateColumn: async (id: number, data: any) => {
    const response = await api.put(`/boards/columns/${id}`, data)
    return response.data
  },
  
  deleteColumn: async (id: number) => {
    const response = await api.delete(`/boards/columns/${id}`)
    return response.data
  },
  
  archiveBoard: async (id: number) => {
    const response = await api.get(`/boards/${id}/archive`, { responseType: 'blob' })
    return response.data
  },

  exportPdf: async (id: number) => {
    const response = await api.get(`/boards/${id}/export-pdf`, { responseType: 'blob' })
    return response.data
  },
}

// Cards API
export const cardsApi = {
  getCards: async (params?: any) => {
    const response = await api.get('/cards/', { params })
    return response.data
  },
  
  getCard: async (id: number) => {
    const response = await api.get(`/cards/${id}`)
    return response.data
  },
  
  createCard: async (data: any) => {
    const response = await api.post('/cards/', data)
    return response.data
  },
  
  updateCard: async (id: number, data: any) => {
    const response = await api.put(`/cards/${id}`, data)
    return response.data
  },
  
  moveCard: async (id: number, data: any) => {
    const response = await api.post(`/cards/${id}/move`, data)
    return response.data
  },
  
  deleteCard: async (id: number) => {
    const response = await api.delete(`/cards/${id}`)
    return response.data
  },
  
  getComments: async (cardId: number) => {
    const response = await api.get(`/cards/${cardId}/comments`)
    return response.data
  },
  
  createComment: async (data: any) => {
    const response = await api.post('/cards/comments', data)
    return response.data
  },
  
  updateCommentStatus: async (commentId: number, status: string, reason?: string) => {
    const response = await api.put(`/cards/comments/${commentId}/status`, { status, reason })
    return response.data
  },
  
  deleteCardWithConfirm: async (id: number, password: string) => {
    const response = await api.post(`/cards/${id}/delete`, { password })
    return response.data
  },
}

// Contacts API
export const contactsApi = {
  getContacts: async (search?: string) => {
    const response = await api.get('/contacts/', { params: { search } })
    return response.data
  },
  
  getContact: async (id: number) => {
    const response = await api.get(`/contacts/${id}`)
    return response.data
  },
  
  createContact: async (data: any) => {
    const response = await api.post('/contacts/', data)
    return response.data
  },
  
  updateContact: async (id: number, data: any) => {
    const response = await api.put(`/contacts/${id}`, data)
    return response.data
  },
  
  deleteContact: async (id: number) => {
    const response = await api.delete(`/contacts/${id}`)
    return response.data
  },
}

// Notifications API
export const notificationsApi = {
  getNotifications: async (unreadOnly = false) => {
    const response = await api.get('/notifications/', { params: { unread_only: unreadOnly } })
    return response.data
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count')
    return response.data
  },
  
  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}`)
    return response.data
  },
  
  markAllAsRead: async () => {
    const response = await api.post('/notifications/mark-all-read')
    return response.data
  },
}

// Calendar API
export const calendarApi = {
  getEvents: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/calendar/', { params: { start_date: startDate, end_date: endDate } })
    return response.data
  },
  
  createEvent: async (data: any) => {
    const response = await api.post('/calendar/', data)
    return response.data
  },
  
  updateEvent: async (id: number, data: any) => {
    const response = await api.put(`/calendar/${id}`, data)
    return response.data
  },
  
  deleteEvent: async (id: number) => {
    const response = await api.delete(`/calendar/${id}`)
    return response.data
  },
}

// Files API
export const filesApi = {
  uploadFile: async (file: File, cardId?: number, retentionDays?: number) => {
    const formData = new FormData()
    formData.append('file', file)
    if (cardId) {
      formData.append('card_id', cardId.toString())
    }
    if (retentionDays !== undefined) {
      formData.append('retention_days', retentionDays.toString())
    }
    
    const response = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  downloadFile: async (id: number) => {
    const response = await api.get(`/files/${id}/download`, { responseType: 'blob' })
    return response.data
  },
  
  deleteFile: async (id: number) => {
    const response = await api.delete(`/files/${id}`)
    return response.data
  },
}

// Search API
export const searchApi = {
  globalSearch: async (query: string) => {
    const response = await api.get('/search/', { params: { q: query } })
    return response.data
  },
}

// Chat API
export const chatApi = {
  getConversations: async () => {
    const response = await api.get('/chat/conversations')
    return response.data
  },
  
  getConversation: async (id: number) => {
    const response = await api.get(`/chat/conversations/${id}`)
    return response.data
  },
  
  createConversation: async (data: { type: string; title?: string; participant_ids: number[] }) => {
    const response = await api.post('/chat/conversations', data)
    return response.data
  },
  
  sendMessage: async (conversationId: number, data: { content: string; linked_card_id?: number }) => {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, data)
    return response.data
  },
  
  markMessageRead: async (messageId: number) => {
    const response = await api.post(`/chat/messages/${messageId}/read`)
    return response.data
  },
  
  markAllRead: async (conversationId: number) => {
    const response = await api.post(`/chat/conversations/${conversationId}/read-all`)
    return response.data
  },
  
  deleteConversation: async (id: number) => {
    const response = await api.delete(`/chat/conversations/${id}`)
    return response.data
  },
}

// Reports API
export const reportsApi = {
  getDashboardStats: async () => {
    const response = await api.get('/reports/dashboard')
    return response.data
  },
  
  getTasksStats: async () => {
    const response = await api.get('/reports/tasks')
    return response.data
  },
  
  getUsersStats: async () => {
    const response = await api.get('/reports/users')
    return response.data
  },
  
  getPerformanceStats: async (days: number = 30) => {
    const response = await api.get(`/reports/performance?days=${days}`)
    return response.data
  },
  
  getManagerEfficiency: async () => {
    const response = await api.get('/reports/manager-efficiency')
    return response.data
  },
  
  getEmployeeContribution: async (days: number = 30) => {
    const response = await api.get(`/reports/employee-contribution?days=${days}`)
    return response.data
  },
  
  getGanttData: async (boardId?: number) => {
    const params = boardId ? { board_id: boardId } : {}
    const response = await api.get('/reports/gantt-chart', { params })
    return response.data
  },
  
  getFlexibleSummary: async (params: any) => {
    const response = await api.get('/reports/flexible-summary', { params })
    return response.data
  },
}

