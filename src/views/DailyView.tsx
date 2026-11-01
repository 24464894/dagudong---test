import React, { useState, useEffect } from 'react';
import { DailyContent, DailyItem, Dataset } from '../types';
import { SIG, HISTORY_CONTENT_URL } from '../constants';
import { useToast } from '../components/Toast';

interface DailyViewProps {
  data: Dataset;
  content: DailyContent | null;
  loading: boolean;
  watchlist: string[];
  onToggleWatchlist: (code: string) => void;
  onSelectContentDate?: (dateStr: string) => void;
}

type FilterKey = 'all' | 'mine' | 'chain' | 'pledge' | 'control' | 'risk';

export const DailyView: React.FC<DailyViewProps> = ({
  data,
  content,
  loading,
  watchlist,
  onToggleWatchlist,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [currentContent, setCurrentContent] = useState<DailyContent | null>(content);
  const [loadingHistoryDate, setLoadingHistoryDate] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  // Check recent 7 days history
  useEffect(() => {
    const todayStr = data.today;
    const baseDate = new Date(todayStr + 'T00:00:00');
    const pastDates: string[] = [];

    for (let i = 1; i <= 7; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      pastDates.push(dateStr);
    }

    // Verify which history files actually exist
    const checkHistoryFiles = async () => {
      const existing: string[] = [];
      await Promise.all(
        pastDates.map(async (dStr) => {
          try {
            const url = `${HISTORY_CONTENT_URL}${dStr}.json`;
            const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
            if (res.ok) {
              existing.push(dStr);
            }
          } catch {}
        })
      );
      existing.sort((a, b) => b.localeCompare(a));
      setHistoryDates(existing);
    };

    checkHistoryFiles();
  }, [data.today]);

  const handleLoadHistoryContent = async (dateStr: string) => {
    try {
      setLoadingHistoryDate(dateStr);
      const url = `${HISTORY_CONTENT_URL}${dateStr}.json?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const loaded = await res.json();
        setCurrentContent(loaded);
        showToast(`已載入 ${dateStr} 白話日報`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast(`${dateStr} 的日報資料不存在`);
      }
    } catch {
      showToast('載入歷史日報失敗');
    } finally {
      setLoadingHistoryDate(null);
    }
  };

  const handleShare = async (item: DailyItem) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#daily-${item.id}`;
    const shareText = `【${item.n} ${item.c}】${item.title}\n${item.body}\n— 來自 大股東在幹嘛 白話日報\n${shareUrl}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        showToast('已複製文章連結與內容');
      } else {
        showToast(`文章代碼：#daily-${item.id}`);
      }
    } catch {
      showToast(`文章代碼：#daily-${item.id}`);
    }
  };

  const handleGoDiscuss = (item: DailyItem) => {
    try {
      sessionStorage.setItem('prefill_discuss', `#${item.n}`);
    } catch {}
    window.location.hash = '#community';
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#daily-')) {
      setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [currentContent]);

  if (loading) {
    return (
      <div className="empty" style={{ padding: 40, color: 'var(--muted)' }}>
        日報載入中…
      </div>
    );
  }

  const items = currentContent?.items || [];

  // When items is empty or not readable
  if (!currentContent || items.length === 0) {
    return (
      <>
        <div className="dhead">
          <div>
            <h1>白話日報</h1>
            <p>
              {data.today}・由 AI 依政府公開資料整理，數字已和原始資料核對
            </p>
          </div>
        </div>

        <section className="sec" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📰</div>
          <h2 style={{ fontSize: 19, margin: '0 0 8px' }}>
            今天的白話日報還在整理中，先去看儀表板。
          </h2>
          <p className="muted" style={{ maxWidth: 440, margin: '0 auto 24px', fontSize: 14 }}>
            站長電腦每天會自動閱讀所有公告並核對事實數據。若今日尚無更新，可先查看儀表板的公開紀錄時間軸。
          </p>
          <a href="#dash" className="btn hl">
            回儀表板
          </a>

          {historyDates.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                看前幾天的白話日報：
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {historyDates.map((dStr) => (
                  <button
                    key={dStr}
                    type="button"
                    className="btn line"
                    disabled={loadingHistoryDate === dStr}
                    onClick={() => handleLoadHistoryContent(dStr)}
                    style={{ minHeight: 32, padding: '0 14px', fontSize: 13 }}
                  >
                    {dStr}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </>
    );
  }

  // Filter items
  const filteredItems = items
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'mine') return watchlist.includes(item.c);
      if (filter === 'chain') return item.type === 'chain';
      if (filter === 'pledge') return item.type === 'pledgeHigh' || item.type === 'pledgeUp';
      if (filter === 'control') return item.type === 'control';
      if (filter === 'risk') {
        return item.type === 'disposal' || item.type === 'fined' || item.type === 'trade';
      }
      return true;
    });

  const filterTabs: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `全部 (${items.length})` },
    { key: 'mine', label: `我追蹤的公司 (${items.filter((i) => watchlist.includes(i.c)).length})` },
    { key: 'chain', label: '連環訊號' },
    { key: 'pledge', label: '質押' },
    { key: 'control', label: '換老闆' },
    { key: 'risk', label: '處置與罰款' },
  ];

  return (
    <>
      <div className="dhead">
        <div>
          <h1>白話日報</h1>
          <p>
            {currentContent.date}・由 AI 依政府公開資料整理，數字已和原始資料核對
          </p>
        </div>
      </div>

      {/* Summary Big Callout */}
      {currentContent.summary && (
        <section className="sec" style={{ background: 'var(--panel)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
            今日導讀
          </div>
          <div
            style={{
              fontSize: 'clamp(16px, 2.5vw, 19px)',
              fontWeight: 600,
              lineHeight: 1.6,
              color: 'var(--ink)',
            }}
          >
            {currentContent.summary}
          </div>
        </section>
      )}

      {/* Filter Chips */}
      <div className="chips">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className="chip"
            aria-pressed={filter === t.key}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Articles List */}
      <section className="sec" style={{ padding: 0 }}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const inWl = watchlist.includes(item.c);
            const tagInfo = SIG[item.type] || ['異動訊號', 'mid'];

            return (
              <article
                key={item.id}
                id={`daily-${item.id}`}
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`tag ${tagInfo[1]}`}>{tagInfo[0]}</span>
                    <a
                      href={`#co-${item.c}`}
                      style={{
                        fontWeight: 900,
                        fontSize: 16,
                        color: 'var(--ink)',
                        textDecoration: 'none',
                      }}
                    >
                      {item.n} <span className="mono muted" style={{ fontWeight: 400 }}>{item.c}</span>
                    </a>
                    <span className="note">{item.m}</span>
                  </div>
                </div>

                {/* Title (Bold) */}
                <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, lineHeight: 1.4 }}>
                  {item.title}
                </h2>

                {/* Body (Facts) */}
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}>
                  {item.body}
                </p>

                {/* Facts small cards */}
                {item.facts && item.facts.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {item.facts.map((fact, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--panel)',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                          {fact.label}
                        </div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                          {fact.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer and Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--line)',
                  }}
                >
                  <div className="note" style={{ fontSize: 12 }}>
                    資料來源：{item.src} ｜ 資料日 {item.d}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, padding: '0 12px', fontSize: 13 }}
                      onClick={() => handleGoDiscuss(item)}
                    >
                      去討論
                    </button>
                    <button
                      type="button"
                      className={`btn ${inWl ? 'line' : 'hl'}`}
                      style={{ minHeight: 32, padding: '0 12px', fontSize: 13 }}
                      onClick={() => onToggleWatchlist(item.c)}
                    >
                      {inWl ? '已追蹤' : '加入追蹤'}
                    </button>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, padding: '0 12px', fontSize: 13 }}
                      onClick={() => handleShare(item)}
                    >
                      分享
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty" style={{ padding: '36px 16px' }}>
            沒有符合該篩選條件的文章。
          </p>
        )}
      </section>

      {/* Look at past days */}
      {historyDates.length > 0 && (
        <section className="sec" style={{ marginTop: 12 }}>
          <h2>看前幾天的白話日報</h2>
          <p className="sub">點選查看過去 7 天的歷史文章整理：</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {historyDates.map((dStr) => {
              const isCurrent = currentContent.date === dStr;
              return (
                <button
                  key={dStr}
                  type="button"
                  className={`btn ${isCurrent ? 'hl' : 'line'}`}
                  disabled={loadingHistoryDate === dStr}
                  onClick={() => handleLoadHistoryContent(dStr)}
                  style={{ minHeight: 34, padding: '0 14px', fontSize: 13 }}
                >
                  {loadingHistoryDate === dStr ? '載入中…' : dStr}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};
