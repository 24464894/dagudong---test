import React from 'react';
import { Dataset } from '../types';
import { SIG } from '../constants';
import { SearchNavIcon } from './Icons';

interface RightSidebarProps {
  data: Dataset;
  followList: string[];
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ data, followList }) => {
  const multiCount = data.cos.filter((c) => c.k.length >= 2).length;
  const p80Count = data.cos.filter((c) => (c.p || 0) >= 80).length;

  const trends = [
    { hash: '#signals', title: '連環訊號', count: `${multiCount} 家公司` },
    { hash: '#pledge', title: '董監質押超過八成', count: `${p80Count} 家` },
    { hash: '#control', title: '經營權易主', count: `${data.control.length} 家` },
    { hash: '#risk', title: '被處置中', count: `${data.disp.length} 檔` },
  ];

  const followedCos = followList
    .map((code) => data.cos.find((c) => c.c === code))
    .filter(Boolean);

  return (
    <aside className="right">
      <a className="search" href="#search" style={{ textDecoration: 'none' }}>
        <SearchNavIcon />
        <span className="muted">搜尋公司</span>
      </a>

      <div className="box">
        <h2>今天在聊</h2>
        {trends.map((item) => (
          <a key={item.hash} className="trend" href={item.hash}>
            <small>台股・公開資料</small>
            <b>{item.title}</b>
            <small>{item.count}</small>
          </a>
        ))}
      </div>

      <div className="box">
        <h2>你追蹤的公司</h2>
        {followedCos.length > 0 ? (
          followedCos.map((c) => {
            if (!c) return null;
            return (
              <a key={c.c} className="trend" href={`#co-${c.c}`}>
                <b>{c.n}</b>
                <small>
                  {c.k.map((k) => SIG[k]?.[0] || k).join('・') || '目前沒有訊號'}
                </small>
              </a>
            );
          })
        ) : (
          <p className="note">在公司頁按「追蹤」，有新紀錄就會出現在這裡。</p>
        )}
      </div>

      <p className="note" style={{ padding: '0 4px', margin: '0 0 6px' }}>
        資料來源：政府資料開放平臺（證交所、櫃買中心、集保、金管會），{data.today}。只整理公開資訊，不提供買賣建議。
      </p>
      <div style={{ fontSize: 13, padding: '0 4px' }}>
        <a href="#privacy" style={{ color: 'var(--muted)', textDecoration: 'none' }}>隱私權政策</a>
        <span style={{ margin: '0 8px', color: 'var(--line)' }}>｜</span>
        <a href="#terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>使用條款</a>
      </div>
    </aside>
  );
};
