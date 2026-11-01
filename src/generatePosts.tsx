import { Dataset, FeedPost, DailyItem } from './types';
import { SIG, CLAUSE_MAP, ORDER } from './constants';
import { zhang, md, short } from './utils';

export function generatePosts(data: Dataset, dailyItems: DailyItem[] = []): FeedPost[] {
  const posts: FeedPost[] = [];
  const total = (data.ann['上市'] || 0) + (data.ann['上櫃'] || 0);
  const routine = data.clause
    .filter(([k]) => k === '31' || k === '12')
    .reduce((a, [, v]) => a + v, 0);

  const multi = data.cos
    .filter((c) => c.k.length >= 2)
    .sort((a, b) => b.k.length - a.k.length || (b.p || 0) - (a.p || 0));

  // 1. Insider selling
  data.insider.forEach((e) => {
    const sellPct = Math.round((e.sell / e.hold) * 100);
    const periodDisplay = e.period.slice(5).replace('～2026-', '～');

    // Check if daily article matches
    const matchingDaily = dailyItems.find(
      (item) => item.c === e.c && item.type === 'insider'
    );
    const defaultText = `#${e.n} 的大股東要賣股了。\n${e.name}（${e.who}）申報 ${periodDisplay} 用一般交易賣 ${zhang(e.sell)} 張，等於手上的 ${sellPct}%。${data.insider.length === 1 ? '\n今天整個上市櫃就這一筆。' : ''}`;
    const text = matchingDaily
      ? `#${e.n} ${matchingDaily.title}\n${matchingDaily.body}`
      : defaultText;

    posts.push({
      id: `ins-${e.c}`,
      cat: 'insider',
      d: e.d,
      co: [e.c],
      rank: 100,
      text,
      att: (
        <div className="att y">
          <div className="num">{zhang(e.sell)} 張</div>
          <div className="cap">
            {e.name} 申報轉讓・持股 {zhang(e.hold)} 張的 {((e.sell / e.hold) * 100).toFixed(1)}%
          </div>
          <div className="src">內部人持股轉讓事前申報・申報不代表一定賣完</div>
        </div>
      ),
    });
  });

  // 2. Daily announcement overview
  posts.push({
    id: 'noise',
    cat: 'today',
    d: data.today,
    co: [],
    rank: 60,
    text: `今天上市櫃一共 ${total} 則重大訊息，我們全部讀過了。\n其中 ${routine} 則是董事會通過財報和法說會通知，每季都有，可以跳過。下面是剩下真正有事的。`,
    att: (
      <div className="att p">
        <div className="lst">
          {data.clause.slice(0, 6).map(([k, v]) => (
            <div key={k}>
              <span>{CLAUSE_MAP[k] || `第${k}款`}</span>
              <span className="mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  });

  // 3. Multi-signal companies
  multi.forEach((c, i) => {
    const sortedSignals = c.s
      .slice()
      .sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k));
    const latestDate = sortedSignals.map((s) => s.d).sort().pop() || data.today;

    const matchingDaily = dailyItems.find(
      (item) => item.c === c.c && item.type === 'chain'
    );
    const defaultText = `#${c.n} 同時出現在 ${c.k.length} 份資料裡：\n${sortedSignals
      .slice(0, 4)
      .map((s) => `・${s.x}（${md(s.d)}）`)
      .join('\n')}\n單看一份不稀奇，疊在一起值得多看一眼。`;
    const text = matchingDaily
      ? `#${c.n} ${matchingDaily.title}\n${matchingDaily.body}`
      : defaultText;

    posts.push({
      id: `multi-${c.c}`,
      cat: 'signals',
      d: latestDate,
      co: [c.c],
      rank: 90 - i,
      text,
      att: (
        <div className="att d">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {c.k.map((k) => (
              <span key={k} className={`tag ${SIG[k]?.[1] || ''}`}>
                {SIG[k]?.[0] || k}
              </span>
            ))}
          </div>
          <div className="num" style={{ marginTop: 14 }}>
            {c.k.length} 個訊號
          </div>
          <div className="cap">
            {c.n} {c.c}・{c.m}
          </div>
        </div>
      ),
    });
  });

  // 4. Control changes
  data.control.forEach((e, i) => {
    const shortDesc = short(
      e.x.replace(/核有.*$/, '').replace(/，?而有經營權異動情事。?$/, ''),
      110
    );
    const matchingDaily = dailyItems.find(
      (item) => item.c === e.c && item.type === 'control'
    );
    const defaultText = `#${e.n} 換老闆了。\n${shortDesc}`;
    const text = matchingDaily
      ? `#${e.n} ${matchingDaily.title}\n${matchingDaily.body}`
      : defaultText;

    posts.push({
      id: `ctl-${e.c}`,
      cat: 'control',
      d: e.d,
      co: [e.c],
      rank: 70 - i,
      text,
      att: (
        <div
          className="att p"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <span
              className={`tag ${['公開收購', '股權轉讓', '私募入主'].includes(e.t) ? 'hi' : 'mid'}`}
            >
              {e.t}
            </span>
            <div style={{ marginTop: 6, fontWeight: 700 }}>
              {e.n} {e.c}
            </div>
            <div className="note">
              {e.m}・經營權異動日 {e.d}
            </div>
          </div>
          <div className="num mono" style={{ fontSize: 28 }}>
            {md(e.d)}
          </div>
        </div>
      ),
    });
  });

  // 5. Pledged > 90%
  const hiP = data.cos
    .filter((c) => (c.p || 0) >= 90)
    .sort((a, b) => (b.p || 0) - (a.p || 0));
  posts.push({
    id: 'p90',
    cat: 'pledge',
    d: data.pledgeDate,
    co: hiP.map((c) => c.c),
    rank: 80,
    text: `董監把自己的股票押出去九成以上的公司，目前有 ${hiP.length} 家：${hiP
      .map((c) => `#${c.n}`)
      .join('、')}。\n押越多，股價大跌時越可能被追繳。`,
    att: (
      <div className="att p">
        {hiP.map((c) => (
          <div key={c.c} style={{ padding: '6px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{c.n}</b>
              <span className="mono">{c.p?.toFixed(2)}%</span>
            </div>
            <div className="bar" style={{ color: 'var(--hi)' }}>
              <i style={{ width: `${Math.min(100, c.p || 0)}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  });

  // 6. Weekly pledge increase >= 1000 shares
  const up = data.weekly.filter((w) => w.dv >= 1e6).slice(0, 6);
  if (up.length > 0) {
    posts.push({
      id: 'wk',
      cat: 'pledge',
      d: data.weekDate,
      co: up.map((w) => w.c),
      rank: 75,
      text: `這週誰又拿股票去借錢？集保的設質統計出來了，多押最多的是 #${up[0].n}，一週多押 ${zhang(up[0].dv)} 張。`,
      att: (
        <div className="att p">
          <div className="lst">
            {up.map((w) => (
              <div key={w.c}>
                <span>
                  {w.n} <span className="mono muted">{w.c}</span>
                </span>
                <span className="mono" style={{ color: 'var(--hi-fg)' }}>
                  +{zhang(w.dv)} 張
                  {w.r != null && ` (${w.r > 0 ? '+' : ''}${w.r.toFixed(1)}%)`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  // 7. Pledged 80%~90%
  const hp = data.cos
    .filter((c) => (c.p || 0) >= 80 && (c.p || 0) < 90)
    .sort((a, b) => (b.p || 0) - (a.p || 0));
  posts.push({
    id: 'p80',
    cat: 'pledge',
    d: data.pledgeDate,
    co: hp.map((c) => c.c),
    rank: 50,
    text: `押八成到九成的還有 ${hp.length} 家。有在追的可以點進去看看：\n${hp
      .map((c) => `#${c.n} ${c.p?.toFixed(1)}%`)
      .join('　')}`,
  });

  // 8. Disposals
  if (data.disp.length > 0) {
    posts.push({
      id: 'disp',
      cat: 'risk',
      d: data.disp[0].d,
      co: data.disp.map((e) => e.c),
      rank: 72,
      text: `櫃買中心的處置名單，目前 ${data.disp.length} 檔。被處置的股票要先付錢才能買，而且每隔幾分鐘才撮合一次。\n${data.disp
        .map((e) => `#${e.n}`)
        .join(' ')}`,
      att: (
        <div className="att p">
          <div className="lst">
            {data.disp.slice(0, 5).map((e, idx) => (
              <div key={idx}>
                <span>{e.n}</span>
                <span className="mono muted">
                  {md(e.from)}～{md(e.to)}
                </span>
              </div>
            ))}
            {data.disp.length > 5 && (
              <div>
                <span className="muted">還有 {data.disp.length - 5} 檔</span>
                <span />
              </div>
            )}
          </div>
        </div>
      ),
    });
  }

  // 9. Repeated fines
  const fineGroups: Record<string, typeof data.fines> = {};
  data.fines.forEach((f) => {
    if (f.c) {
      fineGroups[f.c] = fineGroups[f.c] || [];
      fineGroups[f.c].push(f);
    }
  });

  Object.entries(fineGroups)
    .filter(([, list]) => list.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .forEach(([c, list]) => {
      posts.push({
        id: `fine-${c}`,
        cat: 'risk',
        d: list[0].d,
        co: [c],
        rank: 65,
        text: `#${list[0].n} 已經被罰第 ${list.length} 次了。\n${short(list[0].why, 70)}`,
        att: (
          <div className="att y">
            <div className="num">
              {list
                .slice()
                .reverse()
                .map((f) => (f.amt ? `${f.amt}萬` : '處分'))
                .join(' → ')}
            </div>
            <div className="cap">
              {list[0].src}・最近一次 {list[0].d}
            </div>
          </div>
        ),
      });
    });

  return posts;
}
