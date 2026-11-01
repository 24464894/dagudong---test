import React from 'react';
import { Company, Dataset } from '../types';
import { KIND } from '../constants';
import { IND, calcXp, isWithinWindow, getRecentCutoffDate, getCompanyEvents } from '../utils';
import { useToast } from './Toast';

interface TimelineRowProps {
  company: Company;
  data: Dataset;
  t0: Date;
  span: number;
  removable?: boolean;
  onRemove?: (code: string) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  company,
  data,
  t0,
  span,
  removable = false,
  onRemove,
}) => {
  const { showToast } = useToast();
  const events = getCompanyEvents(company.c, data);
  const recentDate = getRecentCutoffDate(data.today);
  const isFresh = events.some((e) => e.d >= recentDate);

  // Month markers for grid
  const monthStarts: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const d = new Date(t0.getFullYear(), t0.getMonth() + m, 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    monthStarts.push(s);
  }

  const earlyEvents = events.filter((e) => !isWithinWindow(e.d, t0) && !e.to);

  return (
    <div className={`tl-row ${isFresh ? 'new' : ''}`}>
      <a className="tl-name" href={`#co-${company.c}`}>
        <span className="av co" aria-hidden="true" style={{ width: 36, height: 36, fontSize: 14 }}>
          {company.n.slice(0, 1)}
        </span>
        <span style={{ minWidth: 0 }}>
          <b>{company.n}</b>{' '}
          <span className="mono muted" style={{ fontSize: 13 }}>
            {company.c}
          </span>
          <span className="note">
            {IND(company)}・{events.length ? `${events.length} 筆紀錄` : '一年內沒有動靜'}
            {isFresh && <b style={{ color: 'var(--hi-fg)' }}>・最近有新紀錄</b>}
          </span>
        </span>
      </a>

      <div className="track">
        {monthStarts.map((s) => (
          <i key={s} className="tick" style={{ left: `${calcXp(s, t0, span)}%` }} />
        ))}

        {earlyEvents.length > 0 && (
          <span
            className="early"
            title={earlyEvents.map((e) => `${e.d} ${e.x}`).join('\n')}
            onClick={() => showToast(`${earlyEvents[0].d} ${earlyEvents[0].x}`)}
          >
            ◀ {earlyEvents[0].d.slice(0, 4)} {KIND[earlyEvents[0].k]?.[0] || earlyEvents[0].k}
          </span>
        )}

        {events.map((e, i) => {
          if (e.to && (isWithinWindow(e.to, t0) || e.to > data.today)) {
            const a = calcXp(e.from || e.d, t0, span);
            const b = Math.max(calcXp(e.to, t0, span), a + 1.2);
            const over = e.to > data.today;
            const widthPct = (over ? 100 : b) - a;

            return (
              <React.Fragment key={`rng-${i}`}>
                <button
                  type="button"
                  className={`rng ${e.k === 'insider' ? 'ins' : ''}`}
                  style={{ left: `${a}%`, width: `${widthPct}%` }}
                  title={e.x}
                  aria-label={e.x}
                  onClick={() => showToast(e.x)}
                />
                {e.k === 'insider' && (
                  <button
                    type="button"
                    className="mk insider"
                    style={{ left: `${calcXp(e.d, t0, span)}%` }}
                    title={`${e.d} ${e.x}`}
                    aria-label={e.x}
                    onClick={() => showToast(`${e.d} ${e.x}`)}
                  />
                )}
              </React.Fragment>
            );
          }

          if (!isWithinWindow(e.d, t0)) return null;

          return (
            <button
              key={`mk-${i}`}
              type="button"
              className={`mk ${e.k}`}
              style={{ left: `${calcXp(e.d, t0, span)}%` }}
              title={`${e.d} ${e.x}`}
              aria-label={`${e.d} ${e.x}`}
              onClick={() => showToast(`${e.d} ${e.x}`)}
            />
          );
        })}

        <span className="today" aria-hidden="true" />
      </div>

      <div className="pl">
        {company.p != null ? `${company.p.toFixed(1)}%` : '—'}
        <div className="bar" style={{ color: (company.p || 0) >= 50 ? 'var(--hi)' : 'var(--muted)' }}>
          <i style={{ width: `${Math.min(100, company.p || 0)}%` }} />
        </div>
        {removable && onRemove && (
          <button type="button" className="rmbtn" onClick={() => onRemove(company.c)}>
            移除
          </button>
        )}
      </div>
    </div>
  );
};
