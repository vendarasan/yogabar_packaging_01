import React from 'react';

const ICONS = {
  success: '✅',
  error: '⚠️',
};

export default function Toast({ toast }) {
  if (!toast) return null;

  const isErr = toast.err;
  const icon = isErr ? ICONS.error : ICONS.success;

  return (
    <div className={`toast${isErr ? ' toast-err' : ''}`}>
      <span style={{ fontSize: '15px', flexShrink: 0 }}>{icon}</span>
      <span>{toast.msg}</span>
    </div>
  );
}
