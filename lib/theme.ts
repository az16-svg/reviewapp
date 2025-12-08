// Centralized color theme configuration
// Change colors here to update the entire application
//
// IMPORTANT: Tailwind CSS requires full class names to be present in the source
// for proper CSS generation. Do not use template literals or string concatenation.

export const theme = {
  // Primary color - used for active states, selections, focus rings
  // Using slate (navy-like blue-gray) for a darker, more professional look
  primary: {
    bg50: 'bg-slate-50',
    bg100: 'bg-slate-100',
    bg400: 'bg-slate-300',
    bg500: 'bg-slate-400',
    bg600: 'bg-slate-500',
    bg700: 'bg-slate-600',
    text600: 'text-slate-600',
    text800: 'text-slate-700',
    border400: 'border-slate-300',
    border500: 'border-slate-400',
    border600: 'border-slate-500',
    ring500: 'ring-slate-400',
    focusRing: 'focus:ring-slate-400',
    hoverBg50: 'hover:bg-slate-50',
    hoverBg600: 'hover:bg-slate-500',
    hoverBg700: 'hover:bg-slate-600',
    hoverText600: 'hover:text-slate-600',
  },
  // Accent color - used for primary actions, CTAs
  // Using muted orange shades (200-400 range) for subtle appearance
  accent: {
    bg50: 'bg-orange-50',
    bg500: 'bg-orange-300',
    bg600: 'bg-orange-400',
    text500: 'text-orange-500',
    borderL600: 'border-l-orange-400',
    border600: 'border-orange-400',
    hoverBg50: 'hover:bg-orange-50',
    hoverBg600: 'hover:bg-orange-400',
    hoverText500: 'hover:text-orange-500',
  },
} as const;

// Pre-composed class strings for common patterns
export const styles = {
  // Primary action buttons (Create, Export, Add) - muted orange
  buttonPrimary: 'bg-orange-300 text-gray-800 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonPrimaryFull: 'w-full py-2 px-4 bg-orange-300 text-gray-800 font-medium rounded-md hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',

  // Secondary action buttons - slate/navy
  buttonSecondary: 'bg-slate-400 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSecondarySmall: 'h-7 px-2 text-xs rounded transition-colors bg-slate-400 text-white hover:bg-slate-500',

  // Small primary button (Confirm All, etc)
  buttonPrimarySmall: 'bg-slate-400 text-white hover:bg-slate-500',

  // Active state for primary buttons (toggle on, segment selected)
  buttonPrimaryActive: 'bg-slate-500 text-white',

  // Save/confirm button in forms
  buttonSave: 'px-4 py-2 text-sm font-medium text-white bg-slate-500 border border-transparent rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400',

  // Toggle button (drawing mode, etc)
  toggleActive: 'text-slate-600 bg-slate-100',
  toggleActiveLight: 'bg-slate-100 text-slate-600',
  toggleInactive: 'bg-slate-400 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed',

  // Tab styles
  tabActive: 'text-slate-600 border-b-2 border-slate-500',
  tabActiveWithBg: 'text-slate-600 border-b-2 border-slate-500 bg-slate-50',
  tabInactive: 'text-gray-500 hover:text-gray-700',
  tabInactiveWithHover: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',

  // Segmented control / toggle group
  segmentActive: 'bg-slate-500 text-white',
  segmentInactive: 'text-gray-700 hover:bg-gray-300',

  // Page tab (selected page indicator)
  pageTabActive: 'bg-slate-500 text-white',
  pageTabInactive: 'bg-gray-200 text-gray-700 hover:bg-gray-300',

  // Panel toggle button
  panelToggleActive: 'bg-slate-100 text-slate-600',
  panelToggleInactive: 'hover:bg-gray-100',

  // Info/highlight panels
  infoPanel: 'bg-slate-50 text-slate-700',
  alertInfo: 'bg-slate-50 text-slate-700',

  // Focus ring for inputs
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-slate-400',

  // Approved/confirmed state
  approvedBorder: 'border-slate-300 bg-slate-50',
  approvedCheckbox: 'border-slate-500 bg-slate-500',
  unapprovedCheckbox: 'border-gray-300 bg-white',

  // Selected/hovered change card states
  selectedCard: 'ring-2 ring-orange-200 border-orange-200 bg-orange-50',
  hoveredCard: 'bg-orange-50 border-orange-100',

  // Icon button hover states
  iconHoverAccent: 'text-gray-400 hover:text-orange-500 hover:bg-orange-50',
  iconHoverPrimary: 'text-gray-400 hover:text-slate-600 hover:bg-slate-50',

  // Toast backgrounds
  toastSuccess: 'bg-orange-300 text-gray-800',
  toastInfo: 'bg-slate-500 text-white',

  // Status indicator (checkmark, etc)
  statusLoaded: 'text-green-600',  // Keep green for success indicators in file upload
  statusError: 'text-red-600',
} as const;
