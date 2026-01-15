import { useReducer, useCallback } from 'react';

export type ViewSettings = {
  showGrid: boolean;
  zoomLevel: number;
  showLabels: boolean;
};

export type UIState = {
  activeTool: string;
  activeMenu: string;
  showExportDialog: boolean;
  filterActive: boolean;
  showPreview: boolean;
  loading: boolean;
  viewSettings: ViewSettings;
  layoutMode: string;
};

export type UIAction =
  | { type: 'SET_ACTIVE_TOOL'; payload: string }
  | { type: 'SET_ACTIVE_MENU'; payload: string }
  | { type: 'TOGGLE_EXPORT_DIALOG' }
  | { type: 'SET_FILTER_ACTIVE'; payload: boolean }
  | { type: 'SET_SHOW_PREVIEW'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VIEW_SETTINGS'; payload: Partial<ViewSettings> }
  | { type: 'SET_LAYOUT_MODE'; payload: string };

const initialState: UIState = {
  activeTool: 'hand',
  activeMenu: 'board',
  showExportDialog: false,
  filterActive: false,
  showPreview: false,
  loading: false,
  viewSettings: {
    showGrid: true,
    zoomLevel: 1,
    showLabels: true,
  },
  layoutMode: 'horizontal',
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };
    case 'SET_ACTIVE_MENU':
      return { ...state, activeMenu: action.payload };
    case 'TOGGLE_EXPORT_DIALOG':
      return { ...state, showExportDialog: !state.showExportDialog };
    case 'SET_FILTER_ACTIVE':
      return { ...state, filterActive: action.payload };
    case 'SET_SHOW_PREVIEW':
      return { ...state, showPreview: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_VIEW_SETTINGS':
      return {
        ...state,
        viewSettings: { ...state.viewSettings, ...action.payload },
      };
    case 'SET_LAYOUT_MODE':
      return {...state, layoutMode: action.payload};
    default:
      return state;
  }
}

export function useUIState() {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const setActiveTool = useCallback(
    (tool: string) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool }),
    []
  );
  const setActiveMenu = useCallback(
    (menu: string) => dispatch({ type: 'SET_ACTIVE_MENU', payload: menu }),
    []
  );
  const toggleExportDialog = useCallback(
    () => dispatch({ type: 'TOGGLE_EXPORT_DIALOG' }),
    []
  );
  const setFilterActive = useCallback(
    (flag: boolean) => dispatch({ type: 'SET_FILTER_ACTIVE', payload: flag }),
    []
  );
  const setShowPreview = useCallback(
    (flag: boolean) => dispatch({ type: 'SET_SHOW_PREVIEW', payload: flag }),
    []
  );
  const setLoading = useCallback(
    (flag: boolean) => dispatch({ type: 'SET_LOADING', payload: flag }),
    []
  );
  const setViewSettings = useCallback(
    (settings: Partial<ViewSettings>) =>
      dispatch({ type: 'SET_VIEW_SETTINGS', payload: settings }),
    []
  );
  const setLayoutMode = useCallback(
    (mode: string) => dispatch({ type: 'SET_LAYOUT_MODE', payload: mode}),
    []
  );

  return {
    ...state,
    setActiveTool,
    setActiveMenu,
    toggleExportDialog,
    setFilterActive,
    setShowPreview,
    setLoading,
    setViewSettings,
    setLayoutMode,
  } as const;
}
