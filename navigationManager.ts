/**
 * Navigation and Back Button Manager for Android & Web
 * SMP Islam At-Toyib 45
 */

export type BackInterceptor = () => boolean | 'handled' | 'prevent';

interface RegisteredInterceptor {
  id: string;
  priority: number; // Higher number executed first
  handler: BackInterceptor;
}

class NavigationManagerClass {
  private interceptors: RegisteredInterceptor[] = [];
  private historyStack: string[] = ['beranda'];
  private lastBackPressTime: number = 0;
  private onScreenChangeListener: ((screen: string) => void) | null = null;
  private onExitToastTrigger: ((show: boolean) => void) | null = null;
  private onExitModalTrigger: ((show: boolean) => void) | null = null;
  private onUnsavedPromptTrigger:
    | ((prompt: {
        isOpen: boolean;
        title?: string;
        message?: string;
        onConfirm: () => void;
        onCancel: () => void;
      } | null) => void)
    | null = null;

  private isInitialized: boolean = false;

  public init(initialScreen: string = 'beranda') {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.historyStack = [initialScreen];

    // Initialize browser history entry if available
    try {
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({ screen: initialScreen, index: 0, app: 'attoyib45' }, '');
        // Push a buffer entry so that the first back press is caught by popstate without exiting immediately
        window.history.pushState({ screen: initialScreen, index: 1, app: 'attoyib45' }, '');

        window.addEventListener('popstate', this.handlePopState);
      }
    } catch (e) {
      console.warn('NavigationManager: History API initialization skipped', e);
    }
  }

  public setOnScreenChange(listener: (screen: string) => void) {
    this.onScreenChangeListener = listener;
  }

  public setOnExitToastTrigger(listener: (show: boolean) => void) {
    this.onExitToastTrigger = listener;
  }

  public setOnExitModalTrigger(listener: (show: boolean) => void) {
    this.onExitModalTrigger = listener;
  }

  public setOnUnsavedPromptTrigger(
    listener: (prompt: {
      isOpen: boolean;
      title?: string;
      message?: string;
      onConfirm: () => void;
      onCancel: () => void;
    } | null) => void
  ) {
    this.onUnsavedPromptTrigger = listener;
  }

  /**
   * Register a custom back interceptor (for modals, dialogs, or unsaved forms).
   * Returns a cleanup function.
   */
  public registerInterceptor(id: string, priority: number, handler: BackInterceptor): () => void {
    // Remove if already exists
    this.interceptors = this.interceptors.filter((i) => i.id !== id);
    this.interceptors.push({ id, priority, handler });
    // Sort descending by priority
    this.interceptors.sort((a, b) => b.priority - a.priority);

    return () => {
      this.unregisterInterceptor(id);
    };
  }

  public unregisterInterceptor(id: string) {
    this.interceptors = this.interceptors.filter((i) => i.id !== id);
  }

  /**
   * Show unsaved changes confirmation dialog
   */
  public promptUnsavedChanges(options: {
    title?: string;
    message?: string;
    onDiscard: () => void;
    onKeepEditing?: () => void;
  }) {
    if (this.onUnsavedPromptTrigger) {
      this.onUnsavedPromptTrigger({
        isOpen: true,
        title: options.title || 'Perubahan Belum Disimpan',
        message:
          options.message ||
          'Terdapat data formulir yang belum disimpan. Apakah Anda yakin ingin membatalkan perubahan dan meninggalkan halaman ini?',
        onConfirm: () => {
          if (this.onUnsavedPromptTrigger) this.onUnsavedPromptTrigger(null);
          options.onDiscard();
        },
        onCancel: () => {
          if (this.onUnsavedPromptTrigger) this.onUnsavedPromptTrigger(null);
          if (options.onKeepEditing) options.onKeepEditing();
        },
      });
    } else {
      // Fallback
      if (
        window.confirm(
          options.message ||
            'Terdapat data formulir yang belum disimpan. Apakah Anda yakin ingin membatalkan perubahan dan meninggalkan halaman ini?'
        )
      ) {
        options.onDiscard();
      } else if (options.onKeepEditing) {
        options.onKeepEditing();
      }
    }
  }

  /**
   * Navigate forward to a new screen
   */
  public navigate(screen: string, replace: boolean = false) {
    const current = this.getCurrentScreen();
    if (current === screen) return;

    if (replace) {
      if (this.historyStack.length > 0) {
        this.historyStack[this.historyStack.length - 1] = screen;
      } else {
        this.historyStack = [screen];
      }
    } else {
      this.historyStack.push(screen);
    }

    try {
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(
          { screen, index: this.historyStack.length, app: 'attoyib45' },
          ''
        );
      }
    } catch {
      // ignore
    }

    if (this.onScreenChangeListener) {
      this.onScreenChangeListener(screen);
    }
  }

  /**
   * Reset navigation stack (used on login, logout, etc.)
   */
  public reset(screen: string = 'beranda') {
    this.historyStack = [screen];
    this.interceptors = [];
    try {
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({ screen, index: 0, app: 'attoyib45' }, '');
        window.history.pushState({ screen, index: 1, app: 'attoyib45' }, '');
      }
    } catch {
      // ignore
    }
    if (this.onScreenChangeListener) {
      this.onScreenChangeListener(screen);
    }
  }

  public getCurrentScreen(): string {
    return this.historyStack[this.historyStack.length - 1] || 'beranda';
  }

  public getHistoryStack(): string[] {
    return [...this.historyStack];
  }

  /**
   * Handle the Back action from any source (Hardware button, gesture, in-app button)
   */
  public handleBack(): boolean {
    // 1. Check registered interceptors (modals, dialogs, unsaved changes)
    for (const item of this.interceptors) {
      try {
        const result = item.handler();
        if (result === true || result === 'handled' || result === 'prevent') {
          // Re-push history entry if needed so browser history remains aligned
          try {
            if (typeof window !== 'undefined' && window.history) {
              window.history.pushState(
                { screen: this.getCurrentScreen(), index: this.historyStack.length, app: 'attoyib45' },
                ''
              );
            }
          } catch {
            // ignore
          }
          return true; // Intercepted and handled
        }
      } catch (err) {
        console.error(`Error in back interceptor ${item.id}:`, err);
      }
    }

    // 2. If stack has more than 1 screen, pop back to previous screen
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      const prevScreen = this.historyStack[this.historyStack.length - 1];

      if (this.onScreenChangeListener) {
        this.onScreenChangeListener(prevScreen);
      }
      return true;
    }

    // 3. User is at root screen (Dashboard 'beranda' or Login)
    const currentScreen = this.getCurrentScreen();
    if (currentScreen === 'beranda') {
      const now = Date.now();
      const timeDiff = now - this.lastBackPressTime;

      // Ensure history buffer remains so browser does not close tab unexpectedly
      try {
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState(
            { screen: 'beranda', index: 1, app: 'attoyib45' },
            ''
          );
        }
      } catch {
        // ignore
      }

      if (timeDiff < 2500) {
        // Double-back pressed within 2.5 seconds -> show Exit Confirmation Modal
        if (this.onExitModalTrigger) {
          this.onExitModalTrigger(true);
        }
      } else {
        // First back press on dashboard -> show Android Toast
        this.lastBackPressTime = now;
        if (this.onExitToastTrigger) {
          this.onExitToastTrigger(true);
        }
      }
      return true;
    }

    return false;
  }

  private handlePopState = (event: PopStateEvent) => {
    // Android hardware back button or swipe gesture triggered popstate
    this.handleBack();
  };

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.handlePopState);
    }
    this.isInitialized = false;
  }
}

export const NavigationManager = new NavigationManagerClass();
