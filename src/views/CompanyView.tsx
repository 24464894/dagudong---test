import React from 'react';
import { Dataset, FeedPost, DailyItem, DiffData } from '../types';
import { KIND, SIG } from '../constants';
import {
  IND,
  getTimelineBounds,
  calcXp,
  isWithinWindow,
  getCompanyEvents,
  zhang,
  downloadCSV,
  buildCompanyRecords,
} from '../utils';
import { FeedPostItem } from '../components/FeedPostItem';
import { CommunityFeed } from '../components/CommunityFeed';
import { EventDetailTarget } from '../components/EventDetail';

interface CompanyViewProps {
  code: string;
  data: Dataset;
  diff: DiffData | null;
  allPosts: FeedPost[];
  watchlist: string[];
  followList: string[];
  savedPosts: string[];
  dailyItems?: DailyItem[];
  onToggleWatchlist: (code: string) => void;
  onToggleFollow: (code: string) => void;
  onToggleSavePost: (id: string) => void;
  onBack: () => void;
  onSelectEvent?: (target: EventDetailTarget) => void;
}

export const CompanyView: React.FC<CompanyViewProps> = ({
  code,
  data,
  diff,
  allPosts,
  watchlist,
  followList,
  savedPosts,
  dailyItems = [],
  onToggleWatchlist,
  onToggleFollow,
  onToggleSavePost,
  onBack,
  onSelectEvent,
}) => {
  const company = data.cos.find((c) => c.c === code);

  if (!company) {
    return (
      <div className="empty">
        <p>找不到代號 {code}。</p>
        <a href="#search" className="btn line">
          回搜尋
        </a>
      </div>
    );
  }

  const inWatchlist = watchlist.includes(code);
  const isFollowing = followList.includes(code);
  const events = getCompanyEvents(code, data);
  const weeklyItem = data.weekly.find((x) => x.c === code);
  const relatedPosts = allPosts.filter((p) => p.co.includes(code));
  const matchingDailyItems = dailyItems.filter((item) => item.c === code);

  const diffItem = diff?.items.find((i) => i.c === code);

  const { t0, span } = getTimelineBounds(data.today);

  // Month labels for axis
  const monthLabels: { label: string; dateStr: string }[] = [];
  const monthStarts: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const d = new Date(t0.getFullYear(), t0.getMonth() + m, 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    monthStarts.push(s);
    if (m % 2 === 0) {
      const label = `${d.getMonth() === 0 ? d.getFullYear() + '/' : ''}${d.getMonth() + 1}月`;
      monthLabels.push({ label, dateStr: s });
    }
  }

  const lanes: Array<'insider' | 'control' | 'pledgeUp' | 'disposal' | 'fined' | 'trade'> = [
    'insider',
    'control',
    'pledgeUp',
    'disposal',
    'fined',
    'trade',
  ];

  const handleTriggerEvent = (eItem: any) => {
    if (onSelectEvent) {
      onSelectEvent({
        code,
        kind: eItem.k,
        date: eItem.d,
        title: eItem.x,
        rawEvent: eItem,
      });
    }
  };

  const renderLaneTrack = (laneKey: 'insider' | 'control' | 'pledgeUp' | 'disposal' | 'fined' | 'trade') => {
    const laneEvents = events.filter((e) => e.k === laneKey);
    const earlyLaneEvents = laneEvents.filter((e) => !isWithinWindow(e.d, t0) && !e.to);

    return (
      <div className="track tall">
        {monthStarts.map((s) => (
          <i key={s} className="tick" style={{ left: `${calcXp(s, t0, span)}%` }} />
        ))}

        {earlyLaneEvents.length > 0 && (
          <span
            className="early"
            title={earlyLaneEvents.map((e) => `${e.d} ${e.x}`).join('\n')}
            onClick={() => handleTriggerEvent(earlyLaneEvents[0])}
            style={{ cursor: 'pointer' }}
          >
            ◀ {earlyLaneEvents[0].d.slice(0, 4)} {KIND[laneKey]?.[0]}
          </span>
        )}

        {laneEvents.map((e, idx) => {
          if (e.to && (isWithinWindow(e.to, t0) || e.to > data.today)) {
            const a = calcXp(e.from || e.d, t0, span);
            const b = Math.max(calcXp(e.to, t0, span), a + 1.2);
            const over = e.to > data.today;
            const widthPct = (over ? 100 : b) - a;

            return (
              <React.Fragment key={`lane-rng-${idx}`}>
                <button
                  type="button"
                  className={`rng ${e.k === 'insider' ? 'ins' : ''}`}
                  style={{ left: `${a}%`, width: `${widthPct}%` }}
                  title={e.x}
                  aria-label={e.x}
                  onClick={() => handleTriggerEvent(e)}
                />
                {e.k === 'insider' && (
                  <button
                    type="button"
                    className="mk insider"
                    style={{ left: `${calcXp(e.d, t0, span)}%` }}
                    title={`${e.d} ${e.x}`}
                    aria-label={e.x}
                    onClick={() => handleTriggerEvent(e)}
                  />
                )}
              </React.Fragment>
            );
          }

          if (!isWithinWindow(e.d, t0)) return null;

          return (
            <button
              key={`lane-mk-${idx}`}
              type="button"
              className={`mk ${e.k}`}
              style={{ left: `${calcXp(e.d, t0, span)}%` }}
              title={`${e.d} ${e.x}`}
              aria-label={`${e.d} ${e.x}`}
              onClick={() => handleTriggerEvent(e)}
            />
          );
        })}

        <span className="today" aria-hidden="true" />
      </div>
    );
  };

  const handleDownload = () => {
    const headers = ['代號', '公司', '市場', '種類', '日期', '摘要', '金額或張數', '原文', '資料來源'];
    const rows = buildCompanyRecords(code, data);
    downloadCSV(`${code}_${company.n}_歷史紀錄.csv`, [headers, ...rows]);
  };

  return (
    <>
      <div className="dhead">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn line"
            style={{ minHeight: 36, width: 36, padding: 0 }}
            aria-label="上一頁"
          >
            ←
          </button>
          <span
            className="av co"
            aria-hidden="true"
            style={{ width: 52, height: 52, fontSize: 20 }}
          >
            {company.n.slice(0, 1)}
          </span>
          <div>
            <h1>
              {company.n}{' '}
              <span className="mono muted" style={{ fontSize: 16, fontWeight: 500 }}>
                {code}
              </span>
            </h1>
            <p>
              {company.m}・{IND(company)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn ${isFollowing ? 'line' : ''}`}
            onClick={() => onToggleFollow(code)}
          >
            {isFollowing ? '追蹤中' : '追蹤'}
          </button>
          <button
            type="button"
            className={`btn ${inWatchlist ? 'line' : 'hl'}`}
            onClick={() => onToggleWatchlist(code)}
          >
            {inWatchlist ? '已在追蹤清單' : '加入追蹤清單'}
          </button>
        </div>
      </div>

      {diffItem && (
        <div className="warn" style={{ margin: '14px 24px 0' }}>
          跟昨天比：多了 {diffItem.new?.length || 0} 個訊號
          {diffItem.p && (
            <>
              {diffItem.p[0] !== null && diffItem.p[1] !== null
                ? `（質押比率 ${diffItem.p[0].toFixed(1)}% → ${diffItem.p[1].toFixed(1)}%）`
                : `（開始/不再列入董監質押統計）`}
            </>
          )}
        </div>
      )}

      <section className="sec">
        <div className="kv">
          <div>
            <b>{company.p != null ? `${company.p.toFixed(2)}%` : '—'}</b>
            <span>董監持股質押（{data.pledgeDate.slice(0, 7)}）</span>
          </div>
          <div>
            <b>
              {weeklyItem
                ? `${weeklyItem.dv > 0 ? '+' : '−'}${zhang(weeklyItem.dv)} 張`
                : '0'}
            </b>
            <span>這週設質增減（集保）</span>
          </div>
          <div>
            <b>{events.length}</b>
            <span>筆紀錄</span>
          </div>
          <div>
            <b>{company.k.length}</b>
            <span>種訊號</span>
          </div>
        </div>
      </section>

      <section className="sec">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h2>過去 12 個月</h2>
          <button type="button" className="ht" onClick={handleDownload}>
            下載 CSV
          </button>
        </div>
        <p className="sub">每種紀錄一條線，最右邊是今天。</p>
        <div className="lane" style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span />
          <div className="months">
            {monthLabels.map((m) => (
              <span key={m.dateStr} style={{ left: `${calcXp(m.dateStr, t0, span)}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {lanes.map((laneKey) => {
          const laneEvents = events.filter((e) => e.k === laneKey);
          return (
            <div key={laneKey} className="lane">
              <span className={laneEvents.length ? '' : 'muted'}>
                {KIND[laneKey]?.[0]}
              </span>
              {renderLaneTrack(laneKey)}
            </div>
          );
        })}
      </section>

      {/* 白話解讀（若當日或近期有收錄本公司文章） */}
      {matchingDailyItems.length > 0 && (
        <section className="sec">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <h2>白話解讀</h2>
              <p className="sub" style={{ margin: '2px 0 0' }}>
                由 AI 依政府公開資料整理，數字已和原始資料核對。
              </p>
            </div>
            <a
              href="#daily"
              style={{
                fontSize: 13,
                color: 'var(--mid)',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              看今日白話日報 →
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {matchingDailyItems.map((item) => (
              <article
                key={item.id}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className={`tag ${SIG[item.type]?.[1] || 'mid'}`}>
                    {SIG[item.type]?.[0] || item.type}
                  </span>
                  <span className="mono muted" style={{ fontSize: 13 }}>
                    {item.d}
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
                  {item.title}
                </h3>
                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {item.body}
                </p>

                {item.facts && item.facts.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 8,
                      margin: '12px 0',
                    }}
                  >
                    {item.facts.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--line)',
                          borderRadius: 8,
                          padding: '8px 12px',
                        }}
                      >
                        <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
                          {f.label}
                        </div>
                        <div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="muted"
                  style={{
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--line)',
                    paddingTop: 10,
                    marginTop: 8,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span>
                    資料來源：{item.src}｜資料日 {item.d}
                  </span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <a
                      href={`#daily-${item.id}`}
                      style={{
                        fontSize: 12,
                        color: 'var(--mid)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      分享文章 ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="sec">
        <h2>全部紀錄</h2>
        <ul className="evlist">
          {events.length > 0 ? (
            events.map((e, idx) => {
              const tagClass =
                e.k === 'insider'
                  ? 'y'
                  : ['control', 'disposal', 'trade'].includes(e.k)
                  ? 'hi'
                  : 'mid';

              return (
                <li key={idx} onClick={() => handleTriggerEvent(e)} style={{ cursor: 'pointer' }}>
                  <span className="mono muted">{e.d}</span>
                  <span>
                    <span className={`tag ${tagClass}`}>{KIND[e.k]?.[0]}</span>
                  </span>
                  <span>{e.x}</span>
                </li>
              );
            })
          ) : (
            <li>
              <span className="muted" style={{ gridColumn: '1/-1' }}>
                我們追蹤的資料裡，這家公司沒有紀錄。
              </span>
            </li>
          )}
        </ul>
      </section>

      {/* Real-time community discussion for this company */}
      <section className="sec">
        <h2>社群股友討論（#{code}）</h2>
      </section>
      <CommunityFeed data={data} filterCompanyCode={code} />

      {relatedPosts.length > 0 && (
        <>
          <section className="sec">
            <h2>官方動態紀錄貼文</h2>
          </section>
          {relatedPosts.map((post) => (
            <FeedPostItem
              key={post.id}
              post={post}
              data={data}
              isSaved={savedPosts.includes(post.id)}
              onToggleSave={onToggleSavePost}
            />
          ))}
        </>
      )}
    </>
  );
};
