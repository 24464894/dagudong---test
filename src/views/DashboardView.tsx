import React, { useState } from 'react';
import { Dataset, Company, DiffData, DiffItem } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { SearchNavIcon } from '../components/Icons';
import { DEFAULT_WL } from '../constants';
import { getTimelineBounds, getRecentCutoffDate, getCompanyEvents, calcXp, zhang, md } from '../utils';
import { EventDetailTarget } from '../components/EventDetail';
import { ExpandableList } from '../components/ExpandableList';

interface DashboardViewProps {
  data: Dataset;
  diff: DiffData | null;
  watchlist: string[];
  isExampleWatchlist: boolean;
  dailySummary?: string;
  onAddWatchlist: (code: string) => void;
  onRemoveWatchlist: (code: string) => void;
  onSelectEvent?: (target: EventDetailTarget) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  diff,
  watchlist,
  isExampleWatchlist,
  dailySummary,
  onAddWatchlist,
  onRemoveWatchlist,
  onSelectEvent,
}) => {
  const [addQuery, setAddQuery] = useState('');
  const [showExamplePreview, setShowExamplePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'yesterday' | 'week'>('yesterday');
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const { t0, span } = getTimelineBounds(data.today);
  const recentDate = getRecentCutoffDate(data.today);

  // Month labels for the axis (every 2 months)
  const monthLabels: { label: string; dateStr: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    if (m % 2 === 0) {
      const d = new Date(t0.getFullYear(), t0.getMonth() + m, 1);
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const label = `${d.getMonth() === 0 ? d.getFullYear() + '/' : ''}${d.getMonth() + 1}月`;
      monthLabels.push({ label, dateStr: s });
    }
  }

  // Determine which companies to display in timeline
  const isPreviewing = watchlist.length === 0 && showExamplePreview;
  const activeCodes = isPreviewing ? DEFAULT_WL : watchlist;

  const mineCompanies = activeCodes
    .map((c) => data.cos.find((item) => item.c === c))
    .filter((c): c is Company => Boolean(c));

  const hotCount = mineCompanies.filter((c) =>
    getCompanyEvents(c.c, data).some((e) => e.d >= recentDate)
  ).length;

  // Multi-signal companies (>= 2 signals)
  const multiCompanies = data.cos
    .filter((c) => c.k.length >= 2)
    .sort((a, b) => b.k.length - a.k.length || (b.p || 0) - (a.p || 0));

  // Recent diff breakdown (Weekly data)
  const outInsider: [string, string, string][] = [];
  data.insider.forEach((e) => outInsider.push([e.c, e.n, `${zhang(e.sell)} 張`]));

  const outDisposal: [string, string, string][] = [];
  data.disp
    .filter((e) => e.d >= recentDate)
    .forEach((e) => outDisposal.push([e.c, e.n, `${md(e.from)}～${md(e.to)}`]));

  const outPledgeUp: [string, string, string][] = [];
  data.weekly
    .filter((w) => w.dv >= 1e6)
    .forEach((w) => outPledgeUp.push([w.c, w.n, `+${zhang(w.dv)} 張`]));

  const dnWeekly = data.weekly.filter((w) => w.dv <= -1e6);
  const outPledgeDown: [string, string, string][] = dnWeekly.map((w) => [
    w.c,
    w.n,
    `−${zhang(w.dv)} 張`,
  ]);

  const outFined: [string, string, string][] = [];
  data.fines
    .filter((f) => f.d >= recentDate && f.c)
    .forEach((f) => outFined.push([f.c, f.n, f.amt ? `${f.amt} 萬` : '處分']));

  // Add suggestions search
  const trimmedQ = addQuery.trim();
  const searchSuggestions = trimmedQ
    ? data.cos
        .filter(
          (c) =>
            (c.c.startsWith(trimmedQ) || c.n.includes(trimmedQ)) &&
            !watchlist.includes(c.c)
        )
        .slice(0, 8)
    : [];

  const handleSelectAdd = (code: string) => {
    onAddWatchlist(code);
    setAddQuery('');
    if (showExamplePreview) setShowExamplePreview(false);
  };

  const toggleBlock = (title: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderDiffBlock = (
    title: string,
    items: [string, string, string][],
    color?: string
  ) => {
    const isExpanded = expandedBlocks[title];
    const displayedItems = isExpanded ? items : items.slice(0, 6);

    return (
      <div key={title}>
        <h3>
          <span>{title}</span>
          <span className="mono muted">{items.length}</span>
        </h3>
        <ul>
          {items.length > 0 ? (
            displayedItems.map(([c, n, v], idx) => (
              <li key={c + v + idx}>
                <button
                  type="button"
                  className="ht"
                  onClick={() => {
                    const kindMap: Record<string, any> = {
                      '大股東申報賣股': 'insider',
                      '新的處置': 'disposal',
                      '這週多押千張以上': 'pledgeUp',
                      '這週贖回千張以上': 'pledgeUp', // Or pledgeDown if we had it mapped
                      '新的罰款': 'fined'
                    };
                    onSelectEvent?.({
                      code: c,
                      kind: kindMap[title] || 'insider',
                      date: '',
                    });
                  }}
                >
                  {n}
                </button>
                <a href={`#co-${c}`} className="mono muted" style={{ fontWeight: 400, marginLeft: 6 }}>{c}</a>
                <span className="mono" style={{ color: color || 'var(--ink)', marginLeft: 6 }}>
                  {v}
                </span>
              </li>
            ))
          ) : (
            <li className="muted">沒有</li>
          )}
          {items.length > 6 && (
            <li style={{ borderBottom: 0 }}>
              <button type="button" className="ht" onClick={() => toggleBlock(title)}>
                {isExpanded ? '收合' : `還有 ${items.length - 6} 筆`}
              </button>
            </li>
          )}
        </ul>
      </div>
    );
  };

  const legendElement = (
    <div className="legend">
      <span>
        <i className="mk insider" style={{ position: 'static', transform: 'rotate(45deg)' }} />
        大股東申報賣股
      </span>
      <span>
        <i className="mk control" style={{ position: 'static', transform: 'none' }} />
        經營權易主
      </span>
      <span>
        <i className="mk pledgeUp" style={{ position: 'static', transform: 'none' }} />
        本週多押
      </span>
      <span>
        <i className="rng" style={{ position: 'static', transform: 'none', width: 22, display: 'inline-block' }} />
        處置期間
      </span>
      <span>
        <i className="mk fined" style={{ position: 'static', transform: 'none' }} />
        被罰
      </span>
      <span>
        <i className="mk trade" style={{ position: 'static', transform: 'none' }} />
        全額交割
      </span>
    </div>
  );

  const firstSentence = dailySummary
    ? (() => {
        const trimmed = dailySummary.trim();
        const m = trimmed.match(/^[^。！？\n]+[。！？]?/);
        return m ? m[0] : trimmed;
      })()
    : '';

  const diffItems = diff?.items || [];
  const mineDiffs = diffItems.filter((i) => watchlist.includes(i.c));
  const otherDiffs = diffItems.filter((i) => !watchlist.includes(i.c));

  return (
    <div>
      {dailySummary && firstSentence && (
        <div
          style={{
            margin: '14px 24px 0',
            padding: '12px 16px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span style={{ fontSize: 18 }} aria-hidden="true">📰</span>
            <span>{firstSentence}</span>
          </div>
          <a
            href="#daily"
            style={{
              fontWeight: 700,
              color: 'var(--on-hl)',
              background: 'var(--hl)',
              textDecoration: 'none',
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            看白話日報 →
          </a>
        </div>
      )}

      <div className="dhead">
        <div>
          <h1>我的儀表板</h1>
          <p>
            資料日 {data.today}・
            {watchlist.length > 0 ? (
              <>
                追蹤 {mineCompanies.length} 家，其中{' '}
                <b style={{ color: 'var(--ink)' }}>{hotCount}</b> 家最近一週有新紀錄
              </>
            ) : isPreviewing ? (
              '預覽範例清單中（10 家示範公司）'
            ) : (
              '還沒有追蹤任何公司'
            )}
          </p>
        </div>
        {isExampleWatchlist && !isPreviewing && watchlist.length > 0 && (
          <span className="ex">目前是範例清單，加入或移除公司後會換成你的</span>
        )}
      </div>

      <section className="sec">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'baseline',
          }}
        >
          <div>
            <h2>追蹤清單：過去 12 個月</h2>
            <p className="sub">每一列是一家公司，點標記可以看內容。右邊是董監持股質押比例。</p>
          </div>
          {legendElement}
        </div>

        {/* Empty state when no companies are tracked and not previewing */}
        {watchlist.length === 0 && !showExamplePreview ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: 'var(--panel)',
              borderRadius: 12,
              margin: '16px 0',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <h3 style={{ fontSize: 18, margin: '0 0 6px', fontWeight: 900 }}>
              還沒有追蹤任何公司
            </h3>
            <p
              className="muted"
              style={{ maxWidth: 440, margin: '0 auto 20px', fontSize: 14 }}
            >
              在下方輸入代號或名稱即可開始追蹤，隨時掌握大股東申報賣股、經營權異動與質押動態；或是先看看範例了解功能。
            </p>
            <button
              type="button"
              className="btn hl"
              onClick={() => setShowExamplePreview(true)}
              style={{ minHeight: 38, padding: '0 20px', fontSize: 14 }}
            >
              先看看範例
            </button>
          </div>
        ) : (
          <>
            {/* Preview Banner */}
            {isPreviewing && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--panel)',
                  borderRadius: 8,
                  margin: '12px 0 16px',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13 }}>
                  💡 目前正在預覽範例清單（10 家示範公司，<b>不會存進帳號</b>）
                </span>
                <button
                  type="button"
                  className="btn line"
                  style={{ minHeight: 28, padding: '0 12px', fontSize: 12 }}
                  onClick={() => setShowExamplePreview(false)}
                >
                  收起範例
                </button>
              </div>
            )}

            <div className="tl-axis">
              <span />
              <div className="months">
                {monthLabels.map((m) => (
                  <span key={m.dateStr} style={{ left: `${calcXp(m.dateStr, t0, span)}%` }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <span style={{ textAlign: 'right' }}>董監質押</span>
            </div>

            {mineCompanies
              .slice()
              .sort((a, b) => {
                const evA = getCompanyEvents(a.c, data);
                const evB = getCompanyEvents(b.c, data);
                const fa = evA.some((e) => e.d >= recentDate);
                const fb = evB.some((e) => e.d >= recentDate);
                if (fa !== fb) return fb ? 1 : -1;
                return evB.length - evA.length;
              })
              .map((c) => (
                <TimelineRow
                  key={c.c}
                  company={c}
                  data={data}
                  t0={t0}
                  span={span}
                  removable={!isPreviewing}
                  onRemove={onRemoveWatchlist}
                  onSelectEvent={onSelectEvent}
                />
              ))}
          </>
        )}

        {/* Add Company Search Box */}
        <div className="addrow pop" style={{ marginTop: 16 }}>
          <label className="search">
            <SearchNavIcon />
            <input
              type="search"
              autoComplete="off"
              placeholder="加入公司：名稱或代號"
              aria-label="加入公司到追蹤清單"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
            />
          </label>
          {trimmedQ && (
            <div className="sugg">
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((c) => (
                  <button
                    key={c.c}
                    type="button"
                    onClick={() => handleSelectAdd(c.c)}
                  >
                    <span>
                      <b>{c.n}</b> <span className="mono muted">{c.c}</span>
                    </span>
                    <span className="muted">
                      {c.k.length ? `${c.k.length} 個訊號` : ''}
                    </span>
                  </button>
                ))
              ) : (
                <p className="note" style={{ padding: '10px 14px', margin: 0 }}>
                  找不到，或已在清單裡
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="sec">
        <nav className="tabs" style={{ margin: '-18px -24px 18px', borderBottom: '1px solid var(--line)' }}>
          <button
            type="button"
            aria-current={activeTab === 'yesterday' ? 'page' : undefined}
            onClick={() => setActiveTab('yesterday')}
          >
            跟昨天比
          </button>
          <button
            type="button"
            aria-current={activeTab === 'week' ? 'page' : undefined}
            onClick={() => setActiveTab('week')}
          >
            最近一週
          </button>
        </nav>

        {activeTab === 'yesterday' ? (
          <div>
            <p className="note" style={{ marginBottom: 16 }}>
              {diff ? (diff.prev ? `${diff.prev} → ${diff.date}` : `${diff.date}`) : '載入中...'}
            </p>

            {!diff?.prev && (
              <div className="empty" style={{ background: 'var(--panel)', borderRadius: 12, marginBottom: 20 }}>
                明天起會開始比對，先把想看的公司加進追蹤清單
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>你追蹤的公司</h3>
              {mineDiffs.length > 0 ? (
                <div className="lst">
                  {mineDiffs.map((i) => (
                    <div key={i.c} style={{ alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <a href={`#co-${i.c}`} className="ht" style={{ fontWeight: 800 }}>{i.n}</a>
                        <span className="mono muted">{i.c}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                        {i.new?.map((s) => (
                          <button
                            key={s.k}
                            type="button"
                            className="tag hi"
                            style={{ cursor: 'pointer', border: 0 }}
                            onClick={() => onSelectEvent?.({ code: i.c, kind: s.k as any, date: '' })}
                          >
                            {s.x}
                          </button>
                        ))}
                        {i.gone?.map((s) => (
                          <span key={s} className="muted" style={{ fontSize: 13 }}>已結束：{s}</span>
                        ))}
                        {i.p && (
                          <span className="note">
                            董監質押 {i.p.from.toFixed(1)}% → {i.p.to.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty" style={{ padding: '20px 0' }}>你追蹤的公司今天都沒有新變化</p>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>全市場</h3>
              {diff && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  {Object.entries(diff.summary).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 6, fontSize: 13 }}>
                      <span>{k}</span>
                      <b className="mono">{v}</b>
                    </div>
                  ))}
                </div>
              )}
              {otherDiffs.length > 0 && (
                <ExpandableList
                  items={otherDiffs}
                  limit={10}
                  renderItem={(i: DiffItem) => (
                    <div key={i.c} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href={`#co-${i.c}`} className="ht">{i.n}</a>
                        <span className="mono muted" style={{ fontSize: 12 }}>{i.c}</span>
                        {i.new?.some(s => s.k === 'chain') && <span className="tag hi">新增連環訊號</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {i.new?.filter(s => s.k !== 'chain').map(s => (
                          <span key={s.k} className="tag" style={{ fontSize: 11 }}>{s.x}</span>
                        ))}
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>最近一週多了什麼</h2>
            <p className="sub" style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 12px' }}>
              全市場，{recentDate} 之後的新紀錄。
            </p>
            <div className="diff">
              {renderDiffBlock('大股東申報賣股', outInsider, 'var(--ink)')}
              {renderDiffBlock('新的處置', outDisposal, 'var(--hi-fg)')}
              {renderDiffBlock('這週多押千張以上', outPledgeUp, 'var(--hi-fg)')}
              {renderDiffBlock('這週贖回千張以上', outPledgeDown, 'var(--mid)')}
              {renderDiffBlock('新的罰款', outFined)}
            </div>
          </>
        )}
      </section>

      <section className="sec">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h2>全市場有 {multiCompanies.length} 家同時亮兩個燈以上</h2>
          <a
            className="ht"
            href="#radar"
            style={{ fontWeight: 700, color: 'var(--mid)', textDecoration: 'none' }}
          >
            看全市場雷達 →
          </a>
        </div>

        <div className="tl-axis" style={{ marginTop: 10 }}>
          <span />
          <div className="months">
            {monthLabels.map((m) => (
              <span key={m.dateStr} style={{ left: `${calcXp(m.dateStr, t0, span)}%` }}>
                {m.label}
              </span>
            ))}
          </div>
          <span style={{ textAlign: 'right' }}>董監質押</span>
        </div>

        {multiCompanies
          .filter((c) => !activeCodes.includes(c.c))
          .slice(0, 6)
          .map((c) => (
            <TimelineRow
              key={c.c}
              company={c}
              data={data}
              t0={t0}
              span={span}
              removable={false}
              onSelectEvent={onSelectEvent}
            />
          ))}
      </section>
    </div>
  );
};
