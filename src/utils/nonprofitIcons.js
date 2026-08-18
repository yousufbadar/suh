import {
  FaHandHoldingHeart,
  FaHandsHelping,
  FaIdCard,
  FaCalendarAlt,
  FaHandHoldingUsd,
  FaUtensils,
  FaHome,
  FaGraduationCap,
  FaHeartbeat,
  FaChild,
  FaPaw,
  FaLeaf,
  FaPrayingHands,
  FaBullhorn,
  FaShoppingBag,
  FaEnvelope,
  FaHeadset,
  FaUsers,
  FaPalette,
  FaTint,
} from 'react-icons/fa';

export const PRESET_ICON_PREFIX = 'preset:';

export const NONPROFIT_ICONS = [
  { id: 'donate', label: 'Donate', Icon: FaHandHoldingHeart, color: '#e74c3c' },
  { id: 'volunteer', label: 'Volunteer', Icon: FaHandsHelping, color: '#27ae60' },
  { id: 'membership', label: 'Membership', Icon: FaIdCard, color: '#2980b9' },
  { id: 'events', label: 'Events', Icon: FaCalendarAlt, color: '#8e44ad' },
  { id: 'fundraise', label: 'Fundraise', Icon: FaHandHoldingUsd, color: '#16a085' },
  { id: 'food', label: 'Food & Meals', Icon: FaUtensils, color: '#e67e22' },
  { id: 'shelter', label: 'Shelter', Icon: FaHome, color: '#1abc9c' },
  { id: 'education', label: 'Education', Icon: FaGraduationCap, color: '#34495e' },
  { id: 'health', label: 'Health', Icon: FaHeartbeat, color: '#e91e63' },
  { id: 'youth', label: 'Youth', Icon: FaChild, color: '#f39c12' },
  { id: 'animals', label: 'Animals', Icon: FaPaw, color: '#795548' },
  { id: 'environment', label: 'Environment', Icon: FaLeaf, color: '#2ecc71' },
  { id: 'faith', label: 'Faith', Icon: FaPrayingHands, color: '#5c6bc0' },
  { id: 'advocacy', label: 'Advocacy', Icon: FaBullhorn, color: '#d35400' },
  { id: 'shop', label: 'Shop', Icon: FaShoppingBag, color: '#607d8b' },
  { id: 'newsletter', label: 'Newsletter', Icon: FaEnvelope, color: '#3498db' },
  { id: 'helpline', label: 'Helpline', Icon: FaHeadset, color: '#009688' },
  { id: 'community', label: 'Community', Icon: FaUsers, color: '#9b59b6' },
  { id: 'arts', label: 'Arts & Culture', Icon: FaPalette, color: '#c2185b' },
  { id: 'water', label: 'Water', Icon: FaTint, color: '#03a9f4' },
];

export function toPresetIconValue(id) {
  return `${PRESET_ICON_PREFIX}${id}`;
}

export function getNonprofitIcon(iconValue) {
  if (typeof iconValue !== 'string' || !iconValue.startsWith(PRESET_ICON_PREFIX)) return null;
  const id = iconValue.slice(PRESET_ICON_PREFIX.length);
  return NONPROFIT_ICONS.find((preset) => preset.id === id) || null;
}

export function isPresetIcon(iconValue) {
  return Boolean(getNonprofitIcon(iconValue));
}

export function sanitizeCustomLinkIcon(iconValue) {
  if (!iconValue || typeof iconValue !== 'string') return null;
  if (iconValue.startsWith(PRESET_ICON_PREFIX)) {
    return getNonprofitIcon(iconValue) ? iconValue : null;
  }
  if (iconValue.startsWith('data:image/')) return iconValue;
  return null;
}
