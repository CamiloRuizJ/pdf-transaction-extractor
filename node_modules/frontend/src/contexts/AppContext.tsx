import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { UIState, UploadedFile, ProcessingResult } from '../types';

// Application State Interface
interface AppState {
  // UI State
  ui: UIState;
  
  // File Management
  files: UploadedFile[];
  isUploading: boolean;
  
  // Processing State
  processingResults: ProcessingResult[];
  currentProcessing: string | null;
  
  // System Status
  isOnline: boolean;
  aiServiceStatus: {
    configured: boolean;
    model?: string;
    status: 'connected' | 'disconnected' | 'error';
  };
}

// Action Types
type AppAction =
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_FILES'; payload: UploadedFile[] }
  | { type: 'ADD_FILE'; payload: UploadedFile }
  | { type: 'UPDATE_FILE'; payload: { id: string; updates: Partial<UploadedFile> } }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'ADD_PROCESSING_RESULT'; payload: ProcessingResult }
  | { type: 'UPDATE_PROCESSING_RESULT'; payload: { id: string; updates: Partial<ProcessingResult> } }
  | { type: 'SET_CURRENT_PROCESSING'; payload: string | null }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_AI_SERVICE_STATUS'; payload: AppState['aiServiceStatus'] }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: AppState = {
  ui: {
    selectedFiles: [],
    viewMode: 'grid',
    sortBy: 'date',
    sortOrder: 'desc',
    filterBy: 'all',
  },
  files: [],
  isUploading: false,
  processingResults: [],
  currentProcessing: null,
  isOnline: true,
  aiServiceStatus: {
    configured: false,
    status: 'disconnected',
  },
};

// Reducer Function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };

    case 'SET_FILES':
      return {
        ...state,
        files: action.payload,
      };

    case 'ADD_FILE':
      return {
        ...state,
        files: [...state.files, action.payload],
      };

    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(file =>
          file.id === action.payload.id
            ? { ...file, ...action.payload.updates }
            : file
        ),
      };

    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(file => file.id !== action.payload),
        ui: {
          ...state.ui,
          selectedFiles: state.ui.selectedFiles.filter(id => id !== action.payload),
        },
      };

    case 'SET_UPLOADING':
      return {
        ...state,
        isUploading: action.payload,
      };

    case 'ADD_PROCESSING_RESULT':
      return {
        ...state,
        processingResults: [...state.processingResults, action.payload],
      };

    case 'UPDATE_PROCESSING_RESULT':
      return {
        ...state,
        processingResults: state.processingResults.map(result =>
          result.id === action.payload.id
            ? { ...result, ...action.payload.updates }
            : result
        ),
      };

    case 'SET_CURRENT_PROCESSING':
      return {
        ...state,
        currentProcessing: action.payload,
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };

    case 'SET_AI_SERVICE_STATUS':
      return {
        ...state,
        aiServiceStatus: action.payload,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context Creation
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider Component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom Hook for using App Context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Selector Hooks for specific state slices
export function useFiles() {
  const { state } = useApp();
  return state.files;
}

export function useUIState() {
  const { state, dispatch } = useApp();
  return {
    ui: state.ui,
    updateUI: (updates: Partial<UIState>) =>
      dispatch({ type: 'SET_UI_STATE', payload: updates }),
  };
}

export function useProcessingResults() {
  const { state } = useApp();
  return state.processingResults;
}

export function useSystemStatus() {
  const { state } = useApp();
  return {
    isOnline: state.isOnline,
    aiServiceStatus: state.aiServiceStatus,
    currentProcessing: state.currentProcessing,
  };
}