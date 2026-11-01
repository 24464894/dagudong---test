import React, { useState } from 'react';
import { Dataset, Company } from '../types';
import { SIG, ORDER } from '../constants';
import { IND, ago } from '../utils';

interface RadarViewProps {
  data: Dataset;
}

const RSIG = ['insider', 'control', 'pledgeHigh', 'pledgeUp', 'trade', 'disposal', 'fined'];

const lastD = (c: Company): string => {
  if (!c.s || !c.s.length) return '';
  return c.s.reduce((m, x) => (x.d > m ? x.d : m), '');
};

export const RadarView: React.FC<RadarViewProps> = ({ data }) => {
  const [rf, setRf] = useState<{ sig: string | null; ind: string | null }>({ sig: null, ind: null });
  const [rsort, setRsort] = useState<'count' | 'recent' | 'pledge'>('count');
  const [rlimit, setRlimit] = useState<number>(40);

  const lit = data.cos.filter((c) => c.k.length);
  const cnt = (k: string) => lit.filter((c) => c.k.includes(k)).length;

  const inds: Record<string, { tot: number; all: number }> = {};
  lit.forEach((c) => {
    const i = IND(c);
    if (!inds[i]) inds[i] = { tot: 0, all: 0 };
    inds[i].tot++;
  });
  data.cos.forEach((c) => {
    const i = IND(c);
    if (inds[i]) inds[i].all++;
  });

  const rows = Object.entries(inds).sort((a, b) => b[1].tot - a[1].tot);
  const cellCount = (i: string, k: string) => lit.filter((c) => IND(c) === i && c.k.includes(k)).length;
  const lv = (n: number) => (n === 0 ? 'z' : n >= 6 ? 'l3' : n >= 3 ? 'l2' : 'l1');

  const radarSet = (sig: string | null, ind: string | null) => {
    setRf({ sig, ind });
    setRlimit(40);
  };

  let filteredCos = data.cos.filter(
    (c) => c.k.length && (!rf.sig || c.k.includes(rf.sig)) && (!rf.ind || IND(c) === rf.ind)
  );

  const S: Record<string, (a: Company, b: Company) => number> = {
    count: (a, b) => b.k.length - a.k.length || lastD(b).localeCompare(lastD(a)),
    recent: (a, b) => lastD(b).localeCompare(lastD(a)),
    pledge: (a, b) => (b.p || 0) - (a.p || 0),
  };
  filteredCos.sort(S[rsort]);

  const multiCount = data.cos.filter((c) => c.k.length >= 2).length;

  return (
    <>
      <div className="dhead">
        <div>
          <h1>全市場雷達</h1>
          <p>
            上市櫃 {data.cos.length} 家裡，有 <b>{lit.length}</b> 家最近一年出現訊號；同時兩種以上的有{' '}
            <b>{multiCount}</b> 家。點任何數字，下面列出那些公司。
          </p>
        </div>
      </div>

      <section className="sec">
        <div className="sumcards">
          {RSIG.map((k) => {
            const active = rf.sig === k && !rf.ind;
            return (
              <button
                key={k}
                type="button"
                className="sumcard"
                data-rsig={k}
                aria-pressed={active}
                onClick={() => radarSet(active ? null : k, null)}
              >
                <span>
                  <i className={SIG[k][1]} />
                  {SIG[k][0]}
                </span>
                <b>{cnt(k)}</b>
                <span>家</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sec">
        <h2>哪個產業最多</h2>
        <p className="note" style={{ margin: '4px 0 0' }}>
          每格是「這個產業有幾家出現這種訊號」，顏色越深越多。
        </p>
        <div className="mxwrap">
          <table className="mx">
            <colgroup>
              <col className="ci" />
              {RSIG.map((_, idx) => (
                <col key={idx} />
              ))}
              <col className="ct" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left', paddingLeft: 8 }}>
                  產業
                </th>
                {RSIG.map((k) => (
                  <th scope="col" key={k}>
                    {SIG[k][0]}
                  </th>
                ))}
                <th scope="col">合計</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([i, v]) => {
                const isIndSel = rf.ind === i && !rf.sig;
                return (
                  <tr key={i}>
                    <th scope="row" className={isIndSel ? 'sel' : ''}>
                      <button
                        type="button"
                        onClick={() => radarSet(null, rf.ind === i ? null : i)}
                      >
                        {i}
                      </button>
                    </th>
                    {RSIG.map((k) => {
                      const n = cellCount(i, k);
                      const isCellSel = rf.ind === i && rf.sig === k;
                      return (
                        <td key={k} className={`${lv(n)} ${isCellSel ? 'sel' : ''}`}>
                          <button
                            type="button"
                            aria-label={`${i} ${SIG[k][0]} ${n} 家`}
                            onClick={() => radarSet(k, i)}
                          >
                            {n || '·'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="tot">
                      {v.tot}
                      <span className="muted">/{v.all}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec" id="rlist">
        <div className="fbar">
          <div className="act">
            <h2 style={{ marginRight: 6 }}>{filteredCos.length} 家公司</h2>
            {rf.ind || rf.sig ? (
              <>
                {rf.ind && (
                  <span className="pill">
                    {rf.ind}
                    <button type="button" onClick={() => setRf((prev) => ({ ...prev, ind: null }))} aria-label="移除產業篩選">
                      ×
                    </button>
                  </span>
                )}
                {rf.sig && (
                  <span className="pill">
                    {SIG[rf.sig][0]}
                    <button type="button" onClick={() => setRf((prev) => ({ ...prev, sig: null }))} aria-label="移除訊號篩選">
                      ×
                    </button>
                  </span>
                )}
              </>
            ) : (
              <span className="note">全部有訊號的公司</span>
            )}
          </div>
          <label className="note">
            排序{' '}
            <select
              className="sortsel"
              value={rsort}
              onChange={(e) => setRsort(e.target.value as any)}
            >
              <option value="count">訊號最多</option>
              <option value="recent">最近有動靜</option>
              <option value="pledge">董監質押最高</option>
            </select>
          </label>
        </div>

        <table className="rl">
          <thead>
            <tr>
              <th>公司</th>
              <th className="hide-m">產業</th>
              <th>訊號</th>
              <th className="num">董監質押</th>
              <th className="num hide-m">最近一筆</th>
            </tr>
          </thead>
          <tbody>
            {filteredCos.slice(0, rlimit).map((c) => {
              const ld = lastD(c);
              return (
                <tr key={c.c} onClick={() => (window.location.hash = `#co-${c.c}`)}>
                  <td className="nm">
                    <a href={`#co-${c.c}`} onClick={(e) => e.stopPropagation()}>
                      {c.n}
                    </a>
                    <br />
                    <span className="mono muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {c.c} · {c.m}
                    </span>
                  </td>
                  <td className="hide-m note">{IND(c)}</td>
                  <td>
                    <div className="tags">
                      {ORDER.filter((k) => c.k.includes(k)).map((k) => (
                        <span key={k} className={`tag ${SIG[k][1]}`}>
                          {SIG[k][0]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="num">{c.p != null ? `${c.p.toFixed(1)}%` : '—'}</td>
                  <td className="num hide-m note">{ago(ld, data.today)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredCos.length > rlimit && (
          <button
            type="button"
            className="btn line more"
            onClick={() => setRlimit((prev) => prev + 40)}
          >
            再顯示 {Math.min(40, filteredCos.length - rlimit)} 家（共 {filteredCos.length}）
          </button>
        )}

        {filteredCos.length === 0 && <p className="empty">沒有符合的公司</p>}
      </section>
    </>
  );
};
