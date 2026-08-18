import React from 'react';
import { getNonprofitIcon } from '../utils/nonprofitIcons';

function CustomLinkIcon({ icon, alt = '', className, style }) {
  const preset = getNonprofitIcon(icon);
  if (preset) {
    const Icon = preset.Icon;
    return (
      <Icon
        className={className}
        title={alt || preset.label}
        aria-label={alt || preset.label}
        style={{ color: preset.color, ...style }}
      />
    );
  }
  if (icon) {
    return <img src={icon} alt={alt} className={className} style={style} />;
  }
  return null;
}

export default CustomLinkIcon;
