import React from 'react';
import './ThemeSelector.css';
import { FaPalette, FaSun, FaHeart, FaFire } from 'react-icons/fa';
import { themes } from '../utils/theme';

const themeIcons = {
  'yellow-green': FaSun,
  'pink-blue': FaHeart,
  'orange-red': FaFire,
  'purple-pink': FaPalette,
};

function ThemeSelector({ currentTheme, onThemeChange }) {
  return (
    <div className="theme-selector">
      <div className="theme-selector-label">
        <FaPalette className="theme-icon" />
        <span>Theme</span>
      </div>
      <div className="theme-options">
        {Object.keys(themes).map((themeId) => {
          const theme = themes[themeId];
          const Icon = themeIcons[themeId] || FaPalette;
          const isActive = currentTheme === themeId;
          return (
            <button
              key={themeId}
              className={`theme-option ${isActive ? 'active' : ''}`}
              onClick={() => onThemeChange(themeId)}
              title={theme.name}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`
                  : 'transparent',
                borderColor: isActive ? theme.colors.primary : '#e0e0e0',
              }}
            >
              <Icon
                className="theme-option-icon"
                style={{
                  color: isActive ? 'white' : theme.colors.primary,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSelector;

