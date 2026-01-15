// Centralized color theme configuration
// Change colors here to update the entire application
//
// IMPORTANT: Tailwind CSS requires full class names to be present in the source
// for proper CSS generation. Do not use template literals or string concatenation.

export const theme = {
  // Primary color - used for active states, selections, focus rings
  // Dark blue for a deeper, more professional look
  primary: {
    bg50: 'bg-blue-50',
    bg100: 'bg-blue-100',
    bg400: 'bg-blue-300',
    bg500: 'bg-blue-400',
    bg600: 'bg-blue-500',
    bg700: 'bg-blue-600',
    text600: 'text-blue-600',
    text800: 'text-blue-700',
    border400: 'border-blue-300',
    border500: 'border-blue-400',
    border600: 'border-blue-500',
    ring500: 'ring-blue-400',
    focusRing: 'focus:ring-blue-400',
    hoverBg50: 'hover:bg-blue-50',
    hoverBg600: 'hover:bg-blue-500',
    hoverBg700: 'hover:bg-blue-600',
    hoverText600: 'hover:text-blue-600',
  },
  // Accent color - used for primary actions, CTAs
  // Pinky orange (rose) for a warmer, softer accent
  accent: {
    bg50: 'bg-rose-50',
    bg500: 'bg-rose-300',
    bg600: 'bg-rose-400',
    text500: 'text-rose-500',
    borderL600: 'border-l-rose-400',
    border600: 'border-rose-400',
    hoverBg50: 'hover:bg-rose-50',
    hoverBg600: 'hover:bg-rose-400',
    hoverText500: 'hover:text-rose-500',
  },
} as const;

// Pre-composed class strings for common patterns
export const styles = {
  // Primary action buttons (Create, Export, Add) - pinky orange
  buttonPrimary: 'bg-rose-300 text-gray-900 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonPrimaryFull: 'w-full py-2 px-4 bg-rose-300 text-gray-900 font-medium rounded-md hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',

  // Secondary action buttons - dark blue
  buttonSecondary: 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSecondarySmall: 'h-7 px-2 text-xs rounded transition-colors bg-blue-700 text-white hover:bg-blue-800',

  // Small primary button (Confirm All, etc)
  buttonPrimarySmall: 'bg-blue-700 text-white hover:bg-blue-800',

  // Active state for primary buttons (toggle on, segment selected)
  buttonPrimaryActive: 'bg-blue-800 text-white',

  // Save/confirm button in forms
  buttonSave: 'px-4 py-2 text-sm font-medium text-white bg-blue-700 border border-transparent rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500',

  // Toggle button (drawing mode, etc)
  toggleActive: 'text-blue-700 bg-blue-100',
  toggleActiveLight: 'bg-blue-100 text-blue-700',
  toggleInactive: 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed',

  // Tab styles
  tabActive: 'text-blue-700 border-b-2 border-blue-600',
  tabActiveWithBg: 'text-blue-700 border-b-2 border-blue-600 bg-blue-50',
  tabInactive: 'text-gray-500 hover:text-gray-700',
  tabInactiveWithHover: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',

  // Segmented control / toggle group
  segmentActive: 'bg-blue-700 text-white',
  segmentInactive: 'text-gray-700 hover:bg-gray-300',

  // Page tab (selected page indicator)
  pageTabActive: 'bg-blue-700 text-white',
  pageTabInactive: 'bg-gray-200 text-gray-700 hover:bg-gray-300',

  // Panel toggle button
  panelToggleActive: 'bg-blue-100 text-blue-700',
  panelToggleInactive: 'hover:bg-gray-100',

  // Info/highlight panels
  infoPanel: 'bg-blue-50 text-blue-800',
  alertInfo: 'bg-blue-50 text-blue-800',

  // Focus ring for inputs
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500',

  // Approved/confirmed state
  approvedBorder: 'border-blue-300 bg-blue-50',
  approvedCheckbox: 'border-blue-700 bg-blue-700',
  unapprovedCheckbox: 'border-gray-300 bg-white',

  // Selected/hovered change card states
  selectedCard: 'ring-2 ring-rose-200 border-rose-200 bg-rose-50',
  hoveredCard: 'bg-rose-50 border-rose-100',

  // Icon button hover states
  iconHoverAccent: 'text-gray-400 hover:text-rose-500 hover:bg-rose-50',
  iconHoverPrimary: 'text-gray-400 hover:text-blue-700 hover:bg-blue-50',

  // Toast backgrounds
  toastSuccess: 'bg-rose-300 text-gray-900',
  toastInfo: 'bg-blue-800 text-white',

  // Status indicator (checkmark, etc)
  statusLoaded: 'text-green-600',  // Keep green for success indicators in file upload
  statusError: 'text-red-600',
} as const;
