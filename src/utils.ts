import { Dataset, Company, TimelineEvent } from './types';
import { DEFAULT_WL } from './constants';

export const isExactDefaultWl = (list?: string[] | null): boolean => {
  if (!list || list.length !== DEFAULT_WL.length) return false;
  const s = new Set(list);
  return s.size === DEFAULT_WL.length && DEFAULT_WL.every((code) => s.has(code));
};

export const fmt = (n: number | string): string => {
  return Number(n).toLocaleString('zh-TW');
};

export const zhang = (n: number): string => {
  return fmt(Math.round(Math.abs(n) / 1000));
};

export const md = (d?: string): string => {
  if (!d) return '';
  return `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
};

export const ago = (d: string | undefined, today: string): string => {
  if (!d) return '';
  const diff = Math.round((new Date(today).getTime() - new Date(d).getTime()) / 864e5);
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff} 天前`;
  if (diff < 60) return `${Math.round(diff / 7)} 週前`;
  return md(d) + (d.slice(0, 4) !== today.slice(0, 4) ? ` · ${d.slice(0, 4)}` : '');
};

export const short = (s: string, n: number): string => {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n) + '…' : str;
};

export const IND = (c: Company): string => {
  if (c.i === '金融業') return '金融保險業';
  return c.i || '其他';
};

export function getTimelineBounds(todayStr: string) {
  const t1 = new Date(todayStr + 'T00:00:00');
  const t0 = new Date(t1);
  t0.setFullYear(t0.getFullYear() - 1);
  const span = t1.getTime() - t0.getTime();
  return { t0, t1, span };
}

export function calcXp(dateStr: string, t0: Date, span: number): number {
  const t = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.min(100, ((t.getTime() - t0.getTime()) / span) * 100));
}

export function isWithinWindow(dateStr: string, t0: Date): boolean {
  return new Date(dateStr + 'T00:00:00') >= t0;
}

export function getRecentCutoffDate(todayStr: string): string {
  const t = new Date(todayStr + 'T00:00:00');
  t.setDate(t.getDate() - 8);
  return t.toISOString().slice(0, 10);
}

export function getCompanyEvents(code: string, data: Dataset): TimelineEvent[] {
  const c = data.cos.find((item) => item.c === code);
  if (!c) return [];
  const events: TimelineEvent[] = [];

  // Insider selling
  data.insider
    .filter((e) => e.c === code)
    .forEach((e) => {
      const parts = e.period.split('～');
      events.push({
        k: 'insider',
        d: e.d,
        from: parts[0],
        to: parts[1],
        x: `${e.who}${e.name} 申報轉讓 ${zhang(e.sell)} 張（持股 ${((e.sell / e.hold) * 100).toFixed(1)}%），期間 ${e.period}`,
      });
    });

  // Control changes
  data.control
    .filter((e) => e.c === code)
    .forEach((e) => {
      events.push({
        k: 'control',
        d: e.d,
        x: `經營權異動（${e.t}）`,
        full: e.x,
      });
    });

  // Weekly pledge changes
  const w = data.weekly.find((x) => x.c === code);
  if (w && w.dv >= 1e6) {
    events.push({
      k: 'pledgeUp',
      d: data.weekDate,
      x: `這週設質增加 ${zhang(w.dv)} 張${w.r != null ? `（${w.r > 0 ? '+' : ''}${w.r}%）` : ''}`,
    });
  }

  // Disposals
  data.disp
    .filter((e) => e.c === code)
    .forEach((e) => {
      events.push({
        k: 'disposal',
        d: e.d,
        from: e.from,
        to: e.to,
        x: `處置 ${e.from}～${e.to}（${e.why}）`,
      });
    });

  // Fines
  data.fines
    .filter((f) => f.c === code)
    .forEach((f) => {
      events.push({
        k: 'fined',
        d: f.d,
        x: `${f.src}罰 ${f.amt ? f.amt + ' 萬' : '處分'}：${short(f.why, 60)}`,
      });
    });

  // Trading status changes
  data.trade
    .filter((t) => t.c === code)
    .forEach((t) => {
      events.push({
        k: 'trade',
        d: data.today,
        x: `交易方式變更：${t.k}`,
      });
    });

  return events.sort((a, b) => b.d.localeCompare(a.d));
}
