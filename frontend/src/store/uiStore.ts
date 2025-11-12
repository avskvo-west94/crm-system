import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  searchOpen: boolean
  toggleSidebar: () => void
  openSearch: () => void
  closeSearch: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}))

