import React, { useEffect, useRef } from 'react';
import { Dataset } from '../types';
import { SIG, KIND } from '../constants';
import { zhang, md, getCompanyEvents } from '../utils';

export interface EventDetailTarget {
  code: string;
  kind: string; // 'insider' | 'control' | 'pledgeHigh' | 'pledgeUp' | 'trade' | 'disposal' | 'fined'
  date: string;
  title?: string;
  rawEvent?: any;
}

interface EventDetailProps {
  target: EventDetailTarget;
  dataset: Dataset;
  watchlist: string[];
  onClose: () => void;
  onNavigate: (hash: string) => void;
  onToggleWatchlist: (code: string) => void;
  onSelectEvent: (target: EventDetailTarget) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  target,
  dataset,
  watchlist,
  onClose,
  onNavigate,
  onToggleWatchlist,
  onSelectEvent,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus panel on mount & ESC key to close
  useEffect(() => {
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const company = dataset.cos.find((c) => c.c === target.code);
  const coName = company ? company.n : target.code;
  const inWatchlist = watchlist.includes(target.code);

  // Match detail data by kind
  let tagText = '公開訊號';
  let tagClass = 'tag';
  let summaryTitle = `${coName} (${target.code})`;
  let statCards: { label: string; value: string }[] = [];
  let fullContentText = '';
  let extraExplanation = '';

  if (target.kind === 'fined') {
    const match = dataset.fines.find(
      (f) => f.c === target.code && (!target.date || f.d === target.date)
    );
    tagText = '被罰 / 違規處分';
    tagClass = 'tag hi';
    summaryTitle = `${coName} (${target.code}) · 一年內受主管機關處分`;
    statCards = [
      { label: '罰款金額', value: match?.amt ? `${match.amt} 萬元` : '未載明金額' },
      { label: '開罰單位', value: match?.src || '主管機關' },
      { label: '處分日期', value: match?.d || target.date || '近期' },
    ];
    fullContentText = match?.why || target.rawEvent?.x || target.title || '受主管機關裁罰。';
    if (match?.raw) {
      extraExplanation = `處分詳細內容：\n${match.raw}`;
    }
  } else if (target.kind === 'control') {
    const match = dataset.control.find(
      (e) => e.c === target.code && (!target.date || e.d === target.date)
    );
    tagText = '經營權易主';
    tagClass = 'tag mid';
    summaryTitle = `${coName} (${target.code}) · 經營權異動：${match?.t || '關鍵變更'}`;
    statCards = [
      { label: '異動類型', value: match?.t || '經營權異動' },
      { label: '公告日期', value: match?.d || target.date || '近期' },
    ];
    fullContentText = match?.x || target.rawEvent?.x || target.title || '證交所／櫃買中心認定經營權異動。';
  } else if (target.kind === 'insider') {
    const match = dataset.insider.find(
      (e) => e.c === target.code && (!target.date || e.d === target.date)
    );
    tagText = '大股東申報賣股';
    tagClass = 'tag hi';
    summaryTitle = `${coName} (${target.code}) · 內部人${match?.name ? match.name : ''}事前申報轉讓`;
    const holdPct = match && match.hold ? ((match.sell / match.hold) * 100).toFixed(1) : null;
    statCards = [
      { label: '申報賣出', value: match ? `${zhang(match.sell)} 張` : '—' },
      { label: '目前持有', value: match ? `${zhang(match.hold)} 張` : '—' },
      { label: '占持股', value: holdPct ? `${holdPct}%` : '—' },
      { label: '申報人', value: match ? `${match.name} (${match.who})` : '內部人' },
      { label: '轉讓方式', value: match?.how || '一般交易' },
      { label: '轉讓期間', value: match?.period || '—' },
    ];
    if (match) {
      fullContentText = `申報人：${match.name}（${match.who}）\n轉讓方式：${match.how}\n預定轉讓：${zhang(match.sell)} 張\n目前持有：${zhang(match.hold)} 張\n轉讓期間：${match.period}`;
    } else {
      fullContentText = target.rawEvent?.x || target.title || '內部人持股轉讓事前申報。';
    }
  } else if (target.kind === 'disposal') {
    const match = dataset.disp.find((e) => e.c === target.code);
    tagText = '處置中';
    tagClass = 'tag hi';
    summaryTitle = `${coName} (${target.code}) · 證交所／櫃買中心處置股票`;
    statCards = [
      { label: '處置期間', value: match ? `${md(match.from)}～${md(match.to)}` : '近期' },
      { label: '狀態', value: match && match.to >= dataset.today ? '處置中' : '歷史處置' },
    ];
    fullContentText = match?.why || target.rawEvent?.x || '因股價異常或交易過熱列為處置有價證券。';
    extraExplanation = '💡 說明：處置期間交易方式會受到限制，例如需要預收款券或降低撮合頻率。';
  } else if (target.kind === 'trade') {
    const match = dataset.trade.find((e) => e.c === target.code);
    tagText = '全額交割';
    tagClass = 'tag hi';
    summaryTitle = `${coName} (${target.code}) · 變更交易方式（${match?.k || '全額交割'}）`;
    statCards = [
      { label: '交易方式', value: match?.k || '全額交割' },
      { label: '市場類別', value: company?.m || '上市櫃' },
    ];
    fullContentText = target.rawEvent?.x || target.title || '變更交易方式有價證券。';
    extraExplanation = '💡 說明：全額交割股代表財務或營運出現特別狀況，投資人買進前需先繳清全部價款，賣出前需先預圈股票，無法使用信用交易。';
  } else if (target.kind === 'pledgeHigh') {
    tagText = '董監質押過半';
    tagClass = 'tag y';
    summaryTitle = `${coName} (${target.code}) · 董監事股票設質比例達 ${company?.p?.toFixed(1) || '50'}%`;
    statCards = [
      { label: '質押比例', value: company?.p != null ? `${company.p.toFixed(1)}%` : '—' },
      { label: '資料日期', value: dataset.pledgeDate || dataset.today },
    ];
    fullContentText = `董監事個人或法人持股設質比例已達 50% 以上。`;
    extraExplanation = '💡 說明：質押比率高不代表一定有問題，但股價大跌時，質押的股票可能被要求補擔保品。';
  } else if (target.kind === 'pledgeUp') {
    const match = dataset.weekly.find((e) => e.c === target.code);
    tagText = '本週多押';
    tagClass = 'tag y';
    summaryTitle = `${coName} (${target.code}) · 單週設質增加 ${match ? `${zhang(match.dv)} 張` : '顯著'}`;
    statCards = [
      { label: '本週新增設質', value: match ? `+${zhang(match.dv)} 張` : '—' },
      { label: '設質占比', value: match?.i != null ? `${match.i.toFixed(1)}%` : '—' },
      { label: '週資料日', value: dataset.weekDate || dataset.today },
    ];
    fullContentText = `董監事單週增加股票質押數量顯著。`;
    extraExplanation = '💡 說明：代表董監事這週把更多股票拿去質押借款。原因可能是個人資金需求，也可能是其他安排，公開資料沒有說明。';
  } else {
    fullContentText = target.rawEvent?.x || target.title || '公開資訊紀錄';
  }

  // Determine specific data source label
  let sourceText = '證交所／櫃買中心公開資訊觀測站';
  if (target.kind === 'fined') {
    const match = dataset.fines.find(
      (f) => f.c === target.code && (!target.date || f.d === target.date)
    );
    sourceText = match?.src || '金管會證期局 / 證交所';
  } else if (target.kind === 'control') {
    sourceText = '證交所／櫃買中心 經營權異動公告';
  } else if (target.kind === 'insider') {
    sourceText = '公開資訊觀測站 內部人持股轉讓事前申報';
  } else if (target.kind === 'disposal' || target.kind === 'trade') {
    sourceText = '證交所／櫃買中心';
  } else if (target.kind === 'pledgeHigh') {
    sourceText = `公開資訊觀測站 董監事質權設定${dataset.pledgeDate ? `（資料日 ${dataset.pledgeDate}）` : ''}`;
  } else if (target.kind === 'pledgeUp') {
    sourceText = `集保結算所 設質交付週統計${dataset.weekDate ? `（資料日 ${dataset.weekDate}）` : ''}`;
  }

  // Get other events for this company (max 5)
  const allCoEvents = getCompanyEvents(target.code, dataset);
  const otherEvents = allCoEvents
    .filter((e) => !(e.k === target.kind && e.d === target.date))
    .slice(0, 5);

  const handleGoToDiscuss = () => {
    try {
      sessionStorage.setItem('prefill_company', target.code);
    } catch {}
    onNavigate('#feed');
    onClose();
  };

  const handleGoCompanyPage = () => {
    onNavigate(`#co-${target.code}`);
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="event-panel"
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="event-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={tagClass}>{tagText}</span>
            <span className="mono muted" style={{ fontSize: 13 }}>
              {target.date || dataset.today}
            </span>
          </div>
          <button
            type="button"
            className="rmbtn"
            onClick={onClose}
            style={{ fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        {/* Title */}
        <h2 className="event-title">{summaryTitle}</h2>

        {/* Stat cards (.kv) */}
        {statCards.length > 0 && (
          <div className="kv" style={{ margin: '14px 0' }}>
            {statCards.map((c, i) => (
              <div key={i}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{c.value}</div>
                <div className="note">{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Full Text Content */}
        <div className="event-content">
          <div style={{ whiteSpace: 'pre-wrap', userSelect: 'text' }}>{fullContentText}</div>
          {extraExplanation && (
            <div className="note" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--panel)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {extraExplanation}
            </div>
          )}
        </div>

        {/* Other signals of same company */}
        {otherEvents.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div className="note" style={{ fontWeight: 700, marginBottom: 8 }}>
              {coName} 的其他公開紀錄：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {otherEvents.map((sig, idx) => {
                const label = KIND[sig.k]?.[0] || sig.k;
                const sigClass = SIG[sig.k]?.[1] || 'tag';
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`tag ${sigClass}`}
                    onClick={() =>
                      onSelectEvent({
                        code: target.code,
                        kind: sig.k,
                        date: sig.d,
                        title: sig.x,
                        rawEvent: sig,
                      })
                    }
                    style={{ cursor: 'pointer', fontSize: 12 }}
                  >
                    {sig.d} {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="event-actions">
          <button
            type="button"
            className="btn line"
            onClick={handleGoCompanyPage}
          >
            看公司頁
          </button>
          <button
            type="button"
            className="btn hl"
            onClick={handleGoToDiscuss}
          >
            去討論
          </button>
          <button
            type="button"
            className="btn line"
            onClick={() => onToggleWatchlist(target.code)}
          >
            {inWatchlist ? '✓ 已追蹤' : '＋ 追蹤'}
          </button>
        </div>

        {/* Disclaimer Note */}
        <div className="note" style={{ marginTop: 16, textAlign: 'center', fontSize: 12 }}>
          資料來源：{sourceText}<br />
          本站只整理公開資訊，不提供買賣建議。
        </div>
      </div>
    </div>
  );
};
