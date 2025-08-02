// Content refresh utilities for keeping the main website in sync with admin changes

export class ContentRefresh {
  private static refreshCallbacks: (() => void)[] = []
  
  // Register a callback to be called when content is updated
  static onContentUpdate(callback: () => void) {
    this.refreshCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.refreshCallbacks.indexOf(callback)
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1)
      }
    }
  }
  
  // Trigger all registered callbacks
  static triggerRefresh() {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in content refresh callback:', error)
      }
    })
  }
  
  // Helper to notify other tabs/windows about content changes
  static notifyContentChange() {
    if (typeof window !== 'undefined') {
      // Use localStorage to communicate between tabs
      localStorage.setItem('literary-content-updated', Date.now().toString())
      
      // Also trigger local refresh
      this.triggerRefresh()
    }
  }
  
  // Listen for content changes from other tabs
  static listenForChanges(callback: () => void) {
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'literary-content-updated') {
          callback()
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      
      // Return cleanup function
      return () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
    
    return () => {}
  }
}