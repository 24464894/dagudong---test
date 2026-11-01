import React, { useState } from 'react';
import { Dataset, Company } from '../types';
import { SIG } from '../constants';
import { SearchNavIcon } from '../components/Icons';

interface SearchViewProps {
  data: Dataset;
}

export const SearchView: React.FC<SearchViewProps> = ({ data }) => {
  const [query, setQuery] = useState('');
  const [selectedCond, setSelectedCond] = useState<string | null>(null);

  const conditions: Record<string, { label: string; filter: (c: Company) => boolean }> = {
    p80: { label: '質押超過 80%', filter: (c) => (c.p || 0) >= 80 },
    control: { label: '換過老闆', filter: (c) => c.k.includes('control') },
    disposal: { label: '被處置', filter: (c) => c.k.includes('disposal') },
    trade: { label: '全額交割', filter: (c) => c.k.includes('trade') },
    fined: { label: '一年內被罰', filter: (c) => c.k.includes('fined') },
    multi: { label: '兩個訊號以上', filter: (c) => c.k.length >= 2 },
  };

  const handleToggleCond = (condKey: string) => {
    if (selectedCond === condKey) {
      setSelectedCond(null);
    } else {
      setSelectedCond(condKey);
      setQuery('');
    }
  };

  const multiCompanies = data.cos.filter((c) => c.k.length >= 2);

  let results: Company[];
  const trimmed = query.trim();

  if (trimmed) {
    results = data.cos.filter(
      (c) => c.c.startsWith(trimmed) || c.n.includes(trimmed)
    );
  } else if (selectedCond && conditions[selectedCond]) {
    results = data.cos.filter(conditions[selectedCond].filter);
  } else {
    results = multiCompanies;
  }

  const sortedResults = results
    .slice()
    .sort((a, b) => b.k.length - a.k.length || (b.p || 0) - (a.p || 0))
    .slice(0, 50);

  return (
    <>
      <div className="feedhead" style={{ padding: '12px 16px' }}>
        <label className="search">
          <SearchNavIcon />
          <input
            type="search"
            autoComplete="off"
            placeholder="搜尋公司名稱或代號"
            aria-label="搜尋公司"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedCond) setSelectedCond(null);
            }}
          />
        </label>
      </div>

      <div className="chips">
        {Object.entries(conditions).map(([k, { label, filter }]) => {
          const count = data.cos.filter(filter).length;
          const isActive = selectedCond === k;
          return (
            <button
              key={k}
              type="button"
              className="chip"
              onClick={() => handleToggleCond(k)}
              aria-pressed={isActive}
            >
              {label} <span className="mono muted">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="sugg">
        {!trimmed && !selectedCond && (
          <div className="note" style={{ padding: '12px 16px 4px' }}>
            最近有動靜的公司
          </div>
        )}

        {sortedResults.length > 0 ? (
          sortedResults.map((c) => (
            <a key={c.c} href={`#co-${c.c}`}>
              <span className="av co" aria-hidden="true">
                {c.n.slice(0, 1)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{c.n}</b> <span className="mono muted">{c.c}</span>
                <br />
                <span className="note">
                  {c.m}
                  {c.p != null ? `・董監質押 ${c.p.toFixed(1)}%` : ''}
                </span>
              </span>
              <span
                style={{
                  display: 'flex',
                  gap: 4,
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                }}
              >
                {c.k.slice(0, 3).map((k) => (
                  <span key={k} className={`tag ${SIG[k]?.[1] || ''}`}>
                    {SIG[k]?.[0] || k}
                  </span>
                ))}
              </span>
            </a>
          ))
        ) : (
          <p className="empty">找不到「{query}」</p>
        )}
      </div>
    </>
  );
};
