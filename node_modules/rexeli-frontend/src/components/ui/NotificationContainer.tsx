import React from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useNotifications, type NotificationType } from '../../contexts/NotificationContext';
import { cn } from '../../utils/cn';

const iconMap: Record<NotificationType, React.ComponentType<any>> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap: Record<NotificationType, string> = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error: 'bg-error-50 border-error-200 text-error-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info: 'bg-primary-50 border-primary-200 text-primary-800',
};

const iconColorMap: Record<NotificationType, string> = {
  success: 'text-success-500',
  error: 'text-error-500',
  warning: 'text-warning-500',
  info: 'text-primary-500',
};

interface NotificationItemProps {
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    action?: {
      label: string;
      handler: () => void;
    };
  };
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const Icon = iconMap[notification.type];

  return (
    <div
      className={cn(
        'max-w-sm w-full border rounded-lg shadow-lg p-4 transition-all duration-300 transform',
        colorMap[notification.type]
      )}
      style={{
        animation: 'slideInRight 0.3s ease-out, fadeIn 0.3s ease-out',
      }}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={cn('h-6 w-6', iconColorMap[notification.type])} />
        </div>
        
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">
            {notification.title}
          </p>
          {notification.message && (
            <p className="mt-1 text-sm opacity-90">
              {notification.message}
            </p>
          )}
          
          {notification.action && (
            <div className="mt-3">
              <button
                onClick={notification.action.handler}
                className={cn(
                  'text-sm font-medium underline hover:no-underline transition-all',
                  notification.type === 'success' && 'text-success-700 hover:text-success-800',
                  notification.type === 'error' && 'text-error-700 hover:text-error-800',
                  notification.type === 'warning' && 'text-warning-700 hover:text-warning-800',
                  notification.type === 'info' && 'text-primary-700 hover:text-primary-800'
                )}
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={() => onRemove(notification.id)}
            className="inline-flex text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>,
    document.body
  );
}

// Add keyframes to index.css if not already present
/* 
@keyframes slideInRight {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}
*/