import { useEffect } from 'react';
import { NavigationManager, BackInterceptor } from '../services/navigationManager';

/**
 * Custom React hook to intercept Android hardware back button and swipe back gesture
 * for modals, dialogs, drawers, and forms with unsaved changes.
 *
 * @param id Unique identifier for this interceptor
 * @param priority Higher priority handlers are executed first (e.g. nested modals)
 * @param handler Callback returning true/'handled'/'prevent' if handled, or false to continue
 * @param active Whether this interceptor is currently active (e.g. isModalOpen)
 */
export const useBackHandler = (
  id: string,
  priority: number,
  handler: BackInterceptor,
  active: boolean = true
) => {
  useEffect(() => {
    if (!active) return;

    const unregister = NavigationManager.registerInterceptor(id, priority, handler);
    return () => {
      unregister();
    };
  }, [id, priority, handler, active]);
};
