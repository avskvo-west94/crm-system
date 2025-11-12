import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { chatApi, usersApi, cardsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { MessageCircle, Send, Plus, CheckCircle, XCircle, Link2, UserPlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ChatPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [showLinkCard, setShowLinkCard] = useState(false)
  const [linkedCardId, setLinkedCardId] = useState<number | null>(null)
  const [myCards, setMyCards] = useState<any[]>([])

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => chatApi.getConversations(),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  })

  const { data: conversation, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-conversation', selectedConversation],
    queryFn: () => selectedConversation ? chatApi.getConversation(selectedConversation) : null,
    enabled: !!selectedConversation,
  })

  const { data: cards = [] } = useQuery({
    queryKey: ['my-cards'],
    queryFn: () => cardsApi.getCards({ assigned_to_me: true }),
    enabled: showLinkCard,
  })

  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; linked_card_id?: number }) => 
      chatApi.sendMessage(selectedConversation!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation', selectedConversation] })
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      setNewMessage('')
      setLinkedCardId(null)
    },
    onError: () => {
      toast.error('Ошибка при отправке сообщения')
    },
  })

  const createConversationMutation = useMutation({
    mutationFn: (data: { type: string; participant_ids: number[] }) => 
      chatApi.createConversation(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      setSelectedConversation(data.id)
      setShowNewChat(false)
      setSelectedUsers([])
      toast.success('Чат создан')
    },
    onError: () => {
      toast.error('Ошибка при создании чата')
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => chatApi.markAllRead(selectedConversation!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation', selectedConversation] })
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })

  const deleteConversationMutation = useMutation({
    mutationFn: () => chatApi.deleteConversation(selectedConversation!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
      setSelectedConversation(null)
      toast.success('Чат удален')
    },
    onError: () => {
      toast.error('Ошибка при удалении чата')
    },
  })

  const handleSend = () => {
    if (!newMessage.trim()) return
    
    sendMessageMutation.mutate({
      content: newMessage,
      linked_card_id: linkedCardId || undefined,
    })
  }

  const handleCreateChat = () => {
    if (selectedUsers.length === 0) {
      toast.error('Выберите пользователей для чата')
      return
    }
    
    createConversationMutation.mutate({
      type: selectedUsers.length === 1 ? 'direct' : 'group',
      participant_ids: selectedUsers,
    })
  }

  const handleDeleteChat = () => {
    if (confirm('Удалить этот чат?')) {
      deleteConversationMutation.mutate()
    }
  }

  const getConversationTitle = (conv: any) => {
    if (conv.type === 'group' && conv.title) return conv.title
    const otherParticipants = conv.participants?.filter((p: any) => p.id !== user?.id) || []
    if (otherParticipants.length === 1) return otherParticipants[0].full_name
    return otherParticipants.map((p: any) => p.full_name).join(', ')
  }

  const getUnreadBadge = (count: number) => {
    if (!count) return null
    return (
      <span className="ml-auto bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
        {count}
      </span>
    )
  }

  return (
    <div className="h-screen flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="text-primary-600" size={24} />
            Чаты
          </h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 text-center text-gray-500">
              Загрузка...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Нет чатов. Нажмите + чтобы создать новый
            </div>
          ) : (
            conversations.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv.id)
                  markAllReadMutation.mutate()
                }}
                className={`w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 ${
                  selectedConversation === conv.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {getConversationTitle(conv).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {getConversationTitle(conv)}
                  </p>
                  {conv.last_message && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
                {getUnreadBadge(conv.unread_count)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {conversation ? getConversationTitle(conversation).charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {conversation ? getConversationTitle(conversation) : 'Загрузка...'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {conversation?.participants?.length || 0} участников
                  </p>
                </div>
              </div>
              <button
                onClick={handleDeleteChat}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="text-center text-gray-500">Загрузка сообщений...</div>
              ) : conversation?.messages?.length === 0 ? (
                <div className="text-center text-gray-500">Нет сообщений. Начните беседу!</div>
              ) : (
                conversation?.messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                        msg.sender_id === user?.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {msg.sender_id !== user?.id && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {msg.sender.full_name}
                        </p>
                      )}
                      
                      {/* Linked Card */}
                      {msg.linked_card_id && (
                        <div className="mb-2 p-2 bg-white/10 dark:bg-gray-800/50 rounded flex items-center gap-2 text-xs">
                          <Link2 size={14} />
                          <a
                            href={`/boards/${msg.linked_card?.board_id}/card/${msg.linked_card_id}`}
                            className="underline hover:no-underline"
                            onClick={(e) => {
                              e.preventDefault()
                              window.open(`/boards/${msg.linked_card?.board_id}/card/${msg.linked_card_id}`, '_blank')
                            }}
                          >
                            📋 Поручение: {msg.linked_card?.title || `#${msg.linked_card_id}`}
                          </a>
                        </div>
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ru })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {/* Link Card Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLinkCard(!showLinkCard)}
                  className={`p-2 rounded-lg flex items-center gap-2 text-sm ${
                    linkedCardId
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Link2 size={16} />
                  {linkedCardId ? 'Звязано' : 'Привязать поручение'}
                </button>
                {linkedCardId && (
                  <button
                    onClick={() => setLinkedCardId(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle size={18} />
                  </button>
                )}
              </div>

              {/* Card Selector */}
              {showLinkCard && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-40 overflow-y-auto">
                  {cards.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">Нет поручений</p>
                  ) : (
                    cards.map((card: any) => (
                      <button
                        key={card.id}
                        onClick={() => {
                          setLinkedCardId(card.id)
                          setShowLinkCard(false)
                        }}
                        className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                      >
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-sm">{card.title}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Введите сообщение..."
                  className="flex-1 input"
                />
                <button
                  onClick={handleSend}
                  disabled={sendMessageMutation.isPending}
                  className="btn btn-primary"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Выберите чат или создайте новый
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowNewChat(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Новый чат
            </h2>
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {users
                  .filter((u: any) => u.id !== user?.id)
                  .map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        if (selectedUsers.includes(u.id)) {
                          setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                        } else {
                          setSelectedUsers([...selectedUsers, u.id])
                        }
                      }}
                      className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 ${
                        selectedUsers.includes(u.id)
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {u.full_name}
                      </span>
                      {selectedUsers.includes(u.id) && (
                        <CheckCircle size={20} className="ml-auto text-primary-600" />
                      )}
                    </button>
                  ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewChat(false)
                    setSelectedUsers([])
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateChat}
                  disabled={createConversationMutation.isPending || selectedUsers.length === 0}
                  className="flex-1 btn btn-primary"
                >
                  {createConversationMutation.isPending ? 'Создание...' : 'Создать чат'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

