import React from 'react';
import { Dataset, FeedPost } from '../types';
import { FeedPostItem } from '../components/FeedPostItem';
import { CommunityFeed } from '../components/CommunityFeed';

interface FeedViewProps {
  category: 'feed' | 'community' | 'signals' | 'pledge' | 'control' | 'risk';
  data: Dataset;
  allPosts: FeedPost[];
  savedPosts: string[];
  onToggleSavePost: (id: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  category,
  data,
  allPosts,
  savedPosts,
  onToggleSavePost,
}) => {
  const tabs = [
    { key: 'feed', label: '動態' },
    { key: 'community', label: '股友討論' },
    { key: 'signals', label: '連環訊號' },
    { key: 'pledge', label: '質押' },
    { key: 'control', label: '換老闆' },
    { key: 'risk', label: '處置與罰款' },
  ];

  const multiCount = data.cos.filter((c) => c.k.length >= 2).length;

  const intros: Record<string, string> = {
    signals: `同一家公司在好幾份政府資料裡同時出現，才會被排進來。今天有 ${multiCount} 家。只是公開紀錄的整理，不代表公司有問題，也不是買賣建議。`,
    pledge: '董監事拿自己的股票去借錢叫質押。押越多，股價大跌時越可能被追繳、被迫賣股。',
    control: `證交所、櫃買中心認定經營權異動的公司，名單上有 ${data.control.length} 家。`,
    risk: '股價波動太大被限制交易，或公司違規被主管機關罰款。',
  };

  const top5ControlIds = new Set(
    allPosts
      .filter((p) => p.cat === 'control')
      .sort((a, b) => b.d.localeCompare(a.d))
      .slice(0, 5)
      .map((p) => p.id)
  );

  let filteredList: FeedPost[] = [];
  if (category === 'feed') {
    filteredList = allPosts
      .filter((p) => p.cat !== 'control' || top5ControlIds.has(p.id))
      .sort((a, b) => b.rank - a.rank);
  } else if (category === 'control') {
    filteredList = allPosts
      .filter((p) => p.cat === 'control')
      .sort((a, b) => b.d.localeCompare(a.d));
  } else if (category === 'signals') {
    filteredList = allPosts
      .filter((p) => p.cat === 'signals' || p.cat === 'insider')
      .sort((a, b) => b.rank - a.rank);
  } else if (category !== 'community') {
    filteredList = allPosts
      .filter((p) => p.cat === category)
      .sort((a, b) => b.rank - a.rank);
  }

  const introText = intros[category];
  const introPost: FeedPost | null = introText
    ? {
        id: `intro-${category}`,
        cat: 'feed',
        d: data.today,
        co: [],
        rank: 999,
        text: introText,
      }
    : null;

  return (
    <>
      <div className="feedhead">
        <h1>討論區</h1>
        <nav className="tabs">
          {tabs.map((tab) => (
            <a
              key={tab.key}
              href={`#${tab.key}`}
              aria-current={category === tab.key ? 'page' : undefined}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </div>

      {category === 'community' ? (
        <CommunityFeed data={data} onNavigate={(h) => { window.location.hash = h; }} />
      ) : (
        <>
          {category === 'feed' && (
            <CommunityFeed data={data} onNavigate={(h) => { window.location.hash = h; }} />
          )}

          {introPost && (
            <FeedPostItem
              post={introPost}
              data={data}
              isSaved={false}
              onToggleSave={() => {}}
              isPinned
            />
          )}

          {filteredList.map((post) => (
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
