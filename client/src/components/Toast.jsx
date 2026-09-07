import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.err ? 'toast-err' : ''}`}>
      {toast.msg}
    </div>
  );
}
