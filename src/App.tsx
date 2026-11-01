import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dataset, DailyContent, DiffData } from './types';
import { DATA_URL, CONTENT_URL, DIFF_URL } from './constants';
import { generatePosts } from './generatePosts';
import { useAuth } from './context/AuthContext';
import { isExactDefaultWl } from './utils';
import {
  LogoIcon,
  DashboardNavIcon,
  NewspaperNavIcon,
  RadarNavIcon,
  FeedNavIcon,
  SearchNavIcon,
} from './components/Icons';
import { RightSidebar } from './components/RightSidebar';
import { Footer } from './components/Footer';
import { useToast } from './components/Toast';
import { EventDetail, EventDetailTarget } from './components/EventDetail';
import { DashboardView } from './views/DashboardView';
import { DailyView } from './views/DailyView';
import { RadarView } from './views/RadarView';
import { CompanyView } from './views/CompanyView';
import { SearchView } from './views/SearchView';
import { FeedView } from './views/FeedView';
import { ProfileView } from './views/ProfileView';
import { PrivacyView } from './views/PrivacyView';
import { TermsView } from './views/TermsView';
import { AdminView } from './views/AdminView';
import { UserProfileView } from './views/UserProfileView';

export const App: React.FC = () => {
  const { user, profile, loginWithGoogle, updateUserWatchlist, updateUserSaved } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<Dataset | null>(null);
  const [diff, setDiff] = useState<DiffData | null>(null);
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  const [dailyLoading, setDailyLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [selectedEventTarget, setSelectedEventTarget] = useState<EventDetailTarget | null>(null);

  // Hash state
  const [currentHash, setCurrentHash] = useState<string>(
    () => window.location.hash || '#dash'
  );

  // Fallback local storage state if not logged in
  const [localWatchlist, setLocalWatchlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('wl');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isExactDefaultWl(parsed)) {
          localStorage.removeItem('wl');
          return [];
        }
        return parsed;
      }
    } catch {}
    return [];
  });

  const [localSaved, setLocalSaved] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('saved');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [followList, setFollowList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('follow');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Effective watchlist and saved
  const watchlist = profile ? profile.watchlist : localWatchlist;
  const savedPosts = profile ? profile.saved : localSaved;
  const isExampleWatchlist = false;

  // Load data function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let loadedData: Dataset | null = null;
    let loadedDiff: DiffData | null = null;

    // 1. Try remote GitHub URL with cache-busting
    try {
      const [resData, resDiff] = await Promise.all([
        fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${DIFF_URL}?t=${Date.now()}`, { cache: 'no-store' })
      ]);
      
      if (resData.ok) {
        loadedData = await resData.json();
        setIsUsingFallback(false);
      }
      if (resDiff.ok) {
        loadedDiff = await resDiff.json();
      }
    } catch {
      // Remote fetch failed, fallback below
    }

    // 2. Fallback to public/data.json
    if (!loadedData) {
      try {
        const fallbackRes = await fetch('/data.json', { cache: 'no-store' });
        if (fallbackRes.ok) {
          loadedData = await fallbackRes.json();
          setIsUsingFallback(true);
        }
      } catch (err) {
        console.error('Failed to load fallback public/data.json:', err);
      }
    }

    if (loadedData) {
      setData(loadedData);
      setDiff(loadedDiff);
    } else {
      setError('資料載入失敗，請稍後再試。');
    }
    setLoading(false);

    // Fetch daily report content (CONTENT_URL)
    setDailyLoading(true);
    let loadedDaily: DailyContent | null = null;
    try {
      const cRes = await fetch(`${CONTENT_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (cRes.ok) {
        loadedDaily = await cRes.json();
      }
    } catch {
      // Remote fetch failed, fallback below
    }
    if (!loadedDaily) {
      try {
        const fallbackCRes = await fetch('/content.json', { cache: 'no-store' });
        if (fallbackCRes.ok) {
          loadedDaily = await fallbackCRes.json();
        }
      } catch (err) {
        console.error('Failed to load fallback public/content.json:', err);
      }
    }
    setDailyContent(loadedDaily);
    setDailyLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen to hashchange
  useEffect(() => {
    const onHashChange = () => {
      setCurrentHash(window.location.hash || '#dash');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Watchlist handlers
  const handleAddWatchlist = (code: string) => {
    if (watchlist.includes(code)) return;
    const planLimit = profile?.plan === 'pro' ? 100 : 10;
    if (watchlist.length >= planLimit) {
      showToast(
        profile?.plan === 'pro'
          ? '已達 PRO 追蹤上限 100 家'
          : '免費版上限 10 家，付費版可追蹤 100 家'
      );
      return;
    }
    const updated = [...watchlist, code];
    if (profile) {
      updateUserWatchlist(updated);
    } else {
      setLocalWatchlist(updated);
      localStorage.setItem('wl', JSON.stringify(updated));
    }
    showToast('已加入追蹤清單');
  };

  const handleRemoveWatchlist = (code: string) => {
    const updated = watchlist.filter((c) => c !== code);
    if (profile) {
      updateUserWatchlist(updated);
    } else {
      setLocalWatchlist(updated);
      localStorage.setItem('wl', JSON.stringify(updated));
    }
    showToast('已從追蹤清單移除');
  };

  const handleReorderWatchlist = (newList: string[]) => {
    if (profile) {
      updateUserWatchlist(newList);
    } else {
      setLocalWatchlist(newList);
      localStorage.setItem('wl', JSON.stringify(newList));
    }
  };

  const handleToggleWatchlist = (code: string) => {
    if (watchlist.includes(code)) {
      handleRemoveWatchlist(code);
    } else {
      handleAddWatchlist(code);
    }
  };

  const handleToggleFollow = (code: string) => {
    setFollowList((prev) => {
      const exists = prev.includes(code);
      const next = exists ? prev.filter((c) => c !== code) : [...prev, code];
      try {
        localStorage.setItem('follow', JSON.stringify(next));
      } catch {}
      showToast(exists ? '已取消追蹤' : '已追蹤，有新紀錄會通知你');
      return next;
    });
  };

  const handleToggleSavePost = (id: string) => {
    const exists = savedPosts.includes(id);
    const updated = exists ? savedPosts.filter((p) => p !== id) : [...savedPosts, id];
    if (profile) {
      updateUserSaved(updated);
    } else {
      setLocalSaved(updated);
      localStorage.setItem('saved', JSON.stringify(updated));
    }
    showToast(exists ? '已取消收藏' : '已收藏');
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '#dash';
    }
  };

  // Generate dynamic posts from DATA_URL, merging daily content texts
  const allPosts = useMemo(() => {
    if (!data) return [];
    return generatePosts(data, dailyContent?.items || []);
  }, [data, dailyContent]);

  // Route breakdown
  const rawHash = currentHash.replace(/^#/, '').split('?')[0] || 'dash';
  const isCompanyPage = rawHash.startsWith('co-');
  const companyCode = isCompanyPage ? rawHash.slice(3) : '';

  const isUserPage = rawHash.startsWith('u-');
  const targetUid = isUserPage ? rawHash.slice(2) : '';

  const isDailyPage = rawHash === 'daily' || rawHash.startsWith('daily-');
  const feedCategories = ['feed', 'community', 'signals', 'pledge', 'control', 'risk'];
  const isFeedPage = feedCategories.includes(rawHash);

  const activeNavKey = isCompanyPage || isUserPage
    ? ''
    : isFeedPage
    ? 'feed'
    : isDailyPage
    ? 'daily'
    : rawHash;

  const isWideLayout =
    ['dash', 'radar', 'me', 'daily', 'privacy', 'terms', 'admin'].includes(rawHash) ||
    rawHash.startsWith('daily-') ||
    isCompanyPage ||
    isUserPage;

  const hasNewArticlesToday = Boolean(
    dailyContent &&
      dailyContent.items &&
      dailyContent.items.length > 0 &&
      (!data || dailyContent.date === data.today)
  );

  useEffect(() => {
    if (isWideLayout) {
      document.body.classList.add('wide');
    } else {
      document.body.classList.remove('wide');
    }
  }, [isWideLayout]);

  if (loading) {
    return (
      <div className="empty" style={{ padding: 40, color: 'var(--muted)' }}>
        載入中…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="empty" style={{ padding: 40 }}>
        <p>{error || '資料載入失敗，請稍後再試。'}</p>
        <button type="button" className="btn hl" onClick={fetchData}>
          重試
        </button>
      </div>
    );
  }

  return (
    <>
      {isUsingFallback && (
        <div className="data-banner">
          <span>目前顯示的是 {data.today} 的資料（離線/內建資料）</span>
          <button type="button" onClick={fetchData}>
            檢查 GitHub 最新更新
          </button>
        </div>
      )}

      <div className={`shell ${isWideLayout ? 'no-right' : ''}`}>
        {/* Left Desktop Sidebar */}
        <aside className="left">
          <a className="brand" href="#dash">
            <span className="av" aria-hidden="true">
              <LogoIcon size={36} />
            </span>
            <b>大股東在幹嘛</b>
          </a>
          <nav className="nav" id="nav">
            <a href="#dash" aria-current={activeNavKey === 'dash' ? 'page' : undefined}>
              <DashboardNavIcon />
              <span>儀表板</span>
            </a>
            <a
              href="#daily"
              aria-current={activeNavKey === 'daily' ? 'page' : undefined}
              style={{ position: 'relative' }}
            >
              <NewspaperNavIcon />
              <span>白話日報</span>
              {hasNewArticlesToday && (
                <span
                  style={{
                    position: 'absolute',
                    top: 15,
                    right: 18,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--hi)',
                  }}
                  title="今日有新文章"
                />
              )}
            </a>
            <a href="#radar" aria-current={activeNavKey === 'radar' ? 'page' : undefined}>
              <RadarNavIcon />
              <span>全市場雷達</span>
            </a>
            <a href="#feed" aria-current={activeNavKey === 'feed' ? 'page' : undefined}>
              <FeedNavIcon />
              <span>討論區</span>
            </a>
            <a href="#search" aria-current={activeNavKey === 'search' ? 'page' : undefined}>
              <SearchNavIcon />
              <span>搜尋</span>
            </a>
            <a href="#me" aria-current={activeNavKey === 'me' ? 'page' : undefined}>
              <span style={{ fontSize: 20 }}>👤</span>
              <span>我的</span>
            </a>
          </nav>

          {/* User Status / Login at bottom of sidebar */}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            {user && profile ? (
              <a
                href="#me"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: 'var(--ink)',
                  background: activeNavKey === 'me' ? 'var(--hover)' : 'transparent',
                }}
              >
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="av co" style={{ width: 34, height: 34, fontSize: 14 }}>
                    {profile.displayName.slice(0, 1)}
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ display: 'block', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile.displayName}
                  </b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {profile.plan === 'pro' ? 'PRO' : '免費版'}
                  </span>
                </div>
              </a>
            ) : (
              <div>
                <button
                  type="button"
                  className="btn hl"
                  style={{ width: '100%' }}
                  onClick={loginWithGoogle}
                >
                  Google 登入
                </button>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
                  登入即表示你同意<a href="#terms" style={{ color: 'var(--mid)', textDecoration: 'none' }}>使用條款</a>與<a href="#privacy" style={{ color: 'var(--mid)', textDecoration: 'none' }}>隱私權政策</a>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Main View */}
        <main className="center">
          {/* Mobile Top Header */}
          <div className="mtop">
            <a className="brand" href="#dash" style={{ padding: 0 }}>
              <span className="av" aria-hidden="true" style={{ width: 34, height: 34 }}>
                <LogoIcon size={28} />
              </span>
              <b style={{ fontSize: 17 }}>大股東在幹嘛</b>
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user && profile ? (
                <a href="#me" style={{ textDecoration: 'none' }}>
                  {profile.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName}
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="av co" style={{ width: 32, height: 32, fontSize: 13 }}>
                      {profile.displayName.slice(0, 1)}
                    </span>
                  )}
                </a>
              ) : (
                <button
                  type="button"
                  className="btn hl"
                  style={{ minHeight: 32, padding: '0 12px', fontSize: 13 }}
                  onClick={loginWithGoogle}
                >
                  登入
                </button>
              )}
            </div>
          </div>

          <div id="app" style={{ flex: 1 }}>
            {isUserPage ? (
              <UserProfileView
                targetUid={targetUid}
                dataset={data}
                onNavigate={(h) => {
                  window.location.hash = h;
                }}
                onRequireAuth={loginWithGoogle}
              />
            ) : isCompanyPage ? (
              <CompanyView
                code={companyCode}
                data={data}
                diff={diff}
                allPosts={allPosts}
                watchlist={watchlist}
                followList={followList}
                savedPosts={savedPosts}
                dailyItems={dailyContent?.items}
                onToggleWatchlist={handleToggleWatchlist}
                onToggleFollow={handleToggleFollow}
                onToggleSavePost={handleToggleSavePost}
                onBack={handleBack}
                onSelectEvent={setSelectedEventTarget}
              />
            ) : isDailyPage ? (
              <DailyView
                data={data}
                content={dailyContent}
                loading={dailyLoading}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />
            ) : rawHash === 'dash' ? (
              <DashboardView
                data={data}
                diff={diff}
                watchlist={watchlist}
                isExampleWatchlist={isExampleWatchlist}
                dailySummary={dailyContent?.summary}
                onAddWatchlist={handleAddWatchlist}
                onRemoveWatchlist={handleRemoveWatchlist}
                onSelectEvent={setSelectedEventTarget}
              />
            ) : rawHash === 'radar' ? (
              <RadarView data={data} />
            ) : rawHash === 'search' ? (
              <SearchView data={data} />
            ) : rawHash === 'me' ? (
              <ProfileView
                data={data}
                allPosts={allPosts}
                savedPosts={savedPosts}
                onToggleSavePost={handleToggleSavePost}
                onRemoveWatchlist={handleRemoveWatchlist}
                onReorderWatchlist={handleReorderWatchlist}
              />
            ) : rawHash === 'privacy' ? (
              <PrivacyView />
            ) : rawHash === 'terms' ? (
              <TermsView />
            ) : rawHash === 'admin' ? (
              <AdminView />
            ) : isFeedPage ? (
              <FeedView
                category={rawHash as 'feed' | 'community' | 'signals' | 'pledge' | 'control' | 'risk'}
                data={data}
                allPosts={allPosts}
                savedPosts={savedPosts}
                onToggleSavePost={handleToggleSavePost}
              />
            ) : (
              <DashboardView
                data={data}
                diff={diff}
                watchlist={watchlist}
                isExampleWatchlist={isExampleWatchlist}
                dailySummary={dailyContent?.summary}
                onAddWatchlist={handleAddWatchlist}
                onRemoveWatchlist={handleRemoveWatchlist}
                onSelectEvent={setSelectedEventTarget}
              />
            )}
          </div>

          <Footer />
        </main>

        {/* Right Desktop Sidebar (shown on feed and search views) */}
        {!isWideLayout && <RightSidebar data={data} followList={followList} />}
      </div>

      {/* Event Detail Slide-over Panel / Bottom Sheet */}
      {selectedEventTarget && data && (
        <EventDetail
          target={selectedEventTarget}
          dataset={data}
          watchlist={watchlist}
          onClose={() => setSelectedEventTarget(null)}
          onNavigate={(h) => {
            window.location.hash = h;
          }}
          onToggleWatchlist={handleToggleWatchlist}
          onSelectEvent={setSelectedEventTarget}
        />
      )}

      {/* Mobile Bottom Navigation Bar (6 tabs) */}
      <nav className="mbar" id="mbar">
        <a href="#dash" aria-current={activeNavKey === 'dash' ? 'page' : undefined}>
          <DashboardNavIcon />
          <span>儀表板</span>
        </a>
        <a
          href="#daily"
          aria-current={activeNavKey === 'daily' ? 'page' : undefined}
          style={{ position: 'relative' }}
        >
          <NewspaperNavIcon />
          <span>日報</span>
          {hasNewArticlesToday && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: '25%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--hi)',
              }}
            />
          )}
        </a>
        <a href="#radar" aria-current={activeNavKey === 'radar' ? 'page' : undefined}>
          <RadarNavIcon />
          <span>全市場雷達</span>
        </a>
        <a href="#feed" aria-current={activeNavKey === 'feed' ? 'page' : undefined}>
          <FeedNavIcon />
          <span>討論區</span>
        </a>
        <a href="#search" aria-current={activeNavKey === 'search' ? 'page' : undefined}>
          <SearchNavIcon />
          <span>搜尋</span>
        </a>
        <a href="#me" aria-current={activeNavKey === 'me' ? 'page' : undefined}>
          <span style={{ fontSize: 18 }}>👤</span>
          <span>{user ? '我的' : '登入'}</span>
        </a>
      </nav>
    </>
  );
};
