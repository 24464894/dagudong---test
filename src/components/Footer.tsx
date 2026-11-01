import React from 'react';
import { FOOTER_DISCLAIMER } from '../constants';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <p style={{ margin: 0 }}>{FOOTER_DISCLAIMER}</p>
      <div style={{ marginTop: 8, fontSize: 13 }}>
        <a href="#privacy" style={{ color: 'var(--muted)', textDecoration: 'none' }}>隱私權政策</a>
        <span style={{ margin: '0 8px', color: 'var(--line)' }}>｜</span>
        <a href="#terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>使用條款</a>
      </div>
    </footer>
  );
};
