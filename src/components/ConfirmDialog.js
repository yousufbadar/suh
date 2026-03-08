import React from 'react';
import './ConfirmDialog.css';
import { FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning', showCancel = true }) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle />;
      case 'info':
        return <FaInfoCircle />;
      case 'danger':
        return <FaTimesCircle />;
      case 'warning':
      default:
        return <FaExclamationTriangle />;
    }
  };

  const handleOverlayClick = (e) => {
    // Only close on overlay click if cancel is available, or if it's a success dialog
    if (showCancel || type === 'success') {
      if (onCancel) {
        onCancel();
      } else if (onConfirm && type === 'success') {
        // For success dialogs without cancel, clicking overlay should confirm/close
        onConfirm();
      }
    }
  };

  return (
    <div className="confirm-dialog-overlay" onClick={handleOverlayClick}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-dialog-icon ${type}`}>
          {getIcon()}
        </div>
        <h2 className="confirm-dialog-title">{title}</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          {showCancel && (
            <button
              onClick={onCancel}
              className="confirm-dialog-button cancel-button"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`confirm-dialog-button confirm-button ${type}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

