import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dataset, FeedPost, Company } from '../types';
import { SIG } from '../constants';
import { useToast } from '../components/Toast';
import { FeedPostItem } from '../components/FeedPostItem';
import { downloadCSV, buildCompanyRecords } from '../utils';

interface ProfileViewProps {
  data: Dataset;
  allPosts: FeedPost[];
  savedPosts: string[];
  onToggleSavePost: (id: string) => void;
  onRemoveWatchlist: (code: string) => void;
  onReorderWatchlist: (newList: string[]) => void;
}

type TabKey = 'watchlist' | 'saved' | 'notify' | 'plan' | 'account';

const ALL_SIGNALS = [
  { key: 'insider', label: '大股東申報賣股', desc: '內部人持股轉讓事前申報' },
  { key: 'control', label: '經營權易主', desc: '證交所／櫃買中心認定經營權異動' },
  { key: 'pledgeHigh', label: '董監質押過半', desc: '董監事股票設質比例達 50% 以上' },
  { key: 'pledgeUp', label: '本週多押', desc: '一週設質增加 1,000 張以上' },
  { key: 'trade', label: '全額交割', desc: '變更交易方式有價證券' },
  { key: 'disposal', label: '處置中', desc: '櫃買中心／證交所處置有價證券' },
  { key: 'fined', label: '一年內被罰', desc: '證期局裁罰或違規處分' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  data,
  allPosts,
  savedPosts,
  onToggleSavePost,
  onRemoveWatchlist,
  onReorderWatchlist,
}) => {
  const { user, profile, isAdmin, loginWithGoogle, logout, deleteAccount, updateUserNotify, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('watchlist');
  const [loggingIn, setLoggingIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');

  const handleSaveProfileEdit = async () => {
    if (!profile) return;
    try {
      await updateUserProfile({
        displayName: editName.trim() || profile.displayName,
        bio: editBio.slice(0, 60),
      });
      setIsEditingProfile(false);
      showToast('個人資料已更新');
    } catch {
      showToast('更新失敗，請稍後再試');
    }
  };

  const handleToggleShowWatchlist = async () => {
    if (!profile) return;
    const nextVal = !profile.showWatchlist;
    await updateUserProfile({ showWatchlist: nextVal });
    showToast(nextVal ? '已公開追蹤清單' : '已設為不公開追蹤清單');
  };

  const handleLogin = async () => {
    try {
      setLoggingIn(true);
      await loginWithGoogle();
      showToast('登入成功');
    } catch {
      showToast('登入取消或發生錯誤');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('已登出');
    } catch {
      showToast('登出失敗');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      showToast('帳號已刪除');
    } catch {
      showToast('刪除帳號失敗，請重新登入後再試');
    }
  };

  const moveStock = (index: number, direction: 'up' | 'down') => {
    if (!profile) return;
    const current = [...profile.watchlist];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;
    onReorderWatchlist(current);
  };

  const handleToggleSignal = async (sigKey: string) => {
    if (!profile) return;
    const currentSignals = profile.notify.signals || [];
    const exists = currentSignals.includes(sigKey);
    const newSignals = exists
      ? currentSignals.filter((k) => k !== sigKey)
      : [...currentSignals, sigKey];

    await updateUserNotify({
      ...profile.notify,
      signals: newSignals,
    });
    showToast('已更新通知設定');
  };

  const handleToggleEmailNotify = async () => {
    if (!profile) return;
    const newEmail = !profile.notify.email;
    await updateUserNotify({
      ...profile.notify,
      email: newEmail,
    });
    showToast(newEmail ? '已開啟 Email 晨報' : '已關閉 Email 晨報');
  };

  const trackedCompanies = profile?.watchlist
    .map((code) => data.cos.find((c) => c.c === code))
    .filter((c): c is Company => Boolean(c)) || [];

  const userSavedPosts = allPosts.filter((p) => savedPosts.includes(p.id));

  const handleDownloadWatchlist = () => {
    const headers = ['代號', '公司', '市場', '種類', '日期', '摘要', '金額或張數', '原文', '資料來源'];
    const allRows: string[][] = [];

    if (!profile) return;
    profile.watchlist.forEach((code) => {
      const rows = buildCompanyRecords(code, data);
      allRows.push(...rows);
    });

    // Sort by code first, then by date descending
    allRows.sort((a, b) => {
      const codeDiff = a[0].localeCompare(b[0]);
      if (codeDiff !== 0) return codeDiff;
      return b[4].localeCompare(a[4]);
    });

    downloadCSV(
      `我的追蹤清單紀錄_${new Date().toISOString().slice(0, 10)}.csv`,
      [headers, ...allRows]
    );
  };

  if (!user || !profile) {
    return (
      <>
        <div className="dhead">
          <div>
            <h1>個人中心</h1>
            <p>登入帳號同步你的追蹤清單、收藏貼文與通知設定</p>
          </div>
        </div>

        <section className="sec" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div
            className="av"
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 16px',
              fontSize: 28,
              background: 'var(--panel)',
              color: 'var(--ink)',
            }}
          >
            👤
          </div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>尚未登入帳號</h2>
          <p className="muted" style={{ maxWidth: 460, margin: '0 auto 24px', fontSize: 14 }}>
            免費登入即可啟用跨裝置同步。首次登入時，你在這台裝置設定的追蹤清單與收藏貼文將自動合併至帳號。
          </p>
          <button
            type="button"
            className="btn hl"
            style={{ minHeight: 46, padding: '0 28px', fontSize: 16 }}
            disabled={loggingIn}
            onClick={handleLogin}
          >
            {loggingIn ? '登入中…' : '使用 Google 帳號登入'}
          </button>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="dhead">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--line)',
              }}
            />
          ) : (
            <span className="av co" style={{ width: 52, height: 52, fontSize: 22 }}>
              {profile.displayName.slice(0, 1)}
            </span>
          )}
          <div>
            <h1>
              {profile.displayName}{' '}
              {isAdmin && (
                <span className="tag hi" style={{ fontSize: 11, verticalAlign: 'middle' }}>
                  管理員
                </span>
              )}
            </h1>
            <p className="mono muted" style={{ fontSize: 13 }}>
              {profile.email} · {profile.plan === 'pro' ? 'PRO 專業版' : '免費版用戶'}
            </p>
          </div>
        </div>

        <button type="button" className="btn line" onClick={handleLogout}>
          登出
        </button>
      </div>

      <nav className="tabs">
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          aria-current={activeTab === 'watchlist' ? 'page' : undefined}
        >
          追蹤清單 ({profile.watchlist.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          aria-current={activeTab === 'saved' ? 'page' : undefined}
        >
          收藏 ({userSavedPosts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notify')}
          aria-current={activeTab === 'notify' ? 'page' : undefined}
        >
          通知設定
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          aria-current={activeTab === 'plan' ? 'page' : undefined}
        >
          方案
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          aria-current={activeTab === 'account' ? 'page' : undefined}
        >
          帳號
        </button>
      </nav>

      {activeTab === 'watchlist' && (
        <section className="sec">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2>追蹤清單排序與管理</h2>
              <p className="sub">
                免費版上限 10 家，目前已使用 {profile.watchlist.length}/10 家。
                {profile.watchlist.length >= 10 && (
                  <span style={{ color: 'var(--hi-fg)', fontWeight: 700, marginLeft: 6 }}>
                    （已達上限，付費版可追蹤 100 家）
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="button" className="ht" onClick={handleDownloadWatchlist} style={{ fontSize: 13 }}>
                下載 CSV
              </button>
              <a href="#dash" className="ht" style={{ fontSize: 13, fontWeight: 700 }}>
                查看 12 個月時間軸 →
              </a>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trackedCompanies.map((c, index) => (
              <div
                key={c.c}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--panel)',
                  borderRadius: 8,
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span className="mono muted" style={{ width: 22, fontSize: 13 }}>
                    #{index + 1}
                  </span>
                  <a
                    href={`#co-${c.c}`}
                    style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 700 }}
                  >
                    {c.n} <span className="mono muted">{c.c}</span>
                  </a>
                  <span className="note hide-m">
                    {c.m}·{c.p != null ? `質押 ${c.p.toFixed(1)}%` : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn line"
                    disabled={index === 0}
                    onClick={() => moveStock(index, 'up')}
                    style={{ minHeight: 28, padding: '0 8px', fontSize: 12 }}
                    aria-label="上移"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn line"
                    disabled={index === trackedCompanies.length - 1}
                    onClick={() => moveStock(index, 'down')}
                    style={{ minHeight: 28, padding: '0 8px', fontSize: 12 }}
                    aria-label="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rmbtn"
                    onClick={() => onRemoveWatchlist(c.c)}
                    style={{ marginLeft: 6 }}
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}
            {trackedCompanies.length === 0 && (
              <p className="empty">目前追蹤清單是空的，可在儀表板或公司頁加入追蹤。</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'saved' && (
        <>
          <section className="sec">
            <h2>收藏的貼文</h2>
            <p className="sub">你在討論區中按下「收藏」的貼文會保存在這裡。</p>
          </section>
          {userSavedPosts.length > 0 ? (
            userSavedPosts.map((post) => (
              <FeedPostItem
                key={post.id}
                post={post}
                data={data}
                isSaved
                onToggleSave={onToggleSavePost}
              />
            ))
          ) : (
            <p className="empty">目前沒有收藏任何貼文。</p>
          )}
        </>
      )}

      {activeTab === 'notify' && (
        <section className="sec">
          <h2>通知管道與頻率</h2>
          <p className="sub">這版只儲存個人偏好設定，我們會在正式開放發送時依此推送。</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.notify.email}
                onChange={handleToggleEmailNotify}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <div>
                <b>Email 每日早報</b> <span className="tag">即將開放</span>
                <div className="note">每天開盤前整理你追蹤公司的最新重大異動</div>
              </div>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.6 }}>
              <input type="checkbox" disabled style={{ width: 18, height: 18 }} />
              <div>
                <b>LINE 即時快訊</b> <span className="tag mid">即將推出</span>
                <div className="note">盤中重大事件即時推播至你的 LINE 官方帳號</div>
              </div>
            </div>
          </div>

          <h2 style={{ marginTop: 28 }}>要通知的訊號種類</h2>
          <p className="sub">勾選你有興趣的異動事件：</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
            {ALL_SIGNALS.map((sig) => {
              const isChecked = profile.notify.signals.includes(sig.key);
              return (
                <label
                  key={sig.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: isChecked ? 'var(--panel)' : 'var(--bg)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleSignal(sig.key)}
                    style={{ marginTop: 3, cursor: 'pointer' }}
                  />
                  <div>
                    <span className={`tag ${SIG[sig.key]?.[1] || ''}`} style={{ marginBottom: 4 }}>
                      {sig.label}
                    </span>
                    <div className="note">{sig.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'plan' && (
        <section className="sec">
          <h2>方案比較與升級</h2>
          <p className="sub">自由選擇適合你的投資追蹤規模，隨時可切換。</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              marginTop: 16,
            }}
          >
            <div
              style={{
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '20px 24px',
                background: profile.plan === 'free' ? 'var(--panel)' : 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>一般免費版</h3>
                {profile.plan === 'free' && <span className="tag mid">目前方案</span>}
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, margin: '14px 0 8px' }}>
                NT$ 0 <span className="muted" style={{ fontSize: 14 }}>/ 月</span>
              </div>
              <ul style={{ paddingLeft: 18, lineHeight: 1.8, fontSize: 14, margin: '14px 0 20px' }}>
                <li>追蹤清單上限 10 家公司</li>
                <li>全市場公開雷達與時間軸</li>
                <li>討論區閱讀與發布觀點</li>
                <li>每日重大異動整理</li>
                <li>「跟昨天比」每日自選股異動差額比對</li>
                <li>CSV 數據下載功能</li>
              </ul>
              <button type="button" className="btn line" disabled style={{ width: '100%' }}>
                已在方案中
              </button>
            </div>

            <div
              style={{
                border: '2px solid var(--hl)',
                borderRadius: 12,
                padding: '20px 24px',
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>PRO 專業版</h3>
                <span className="tag y">即將推出</span>
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, margin: '14px 0 8px' }}>
                NT$ 99 <span className="muted" style={{ fontSize: 14 }}>/ 月</span>
              </div>
              <ul style={{ paddingLeft: 18, lineHeight: 1.8, fontSize: 14, margin: '14px 0 20px' }}>
                <li><b>追蹤清單擴增至 100 家</b></li>
                <li>大股東申報與經營權異動即時推播（LINE/Email）</li>
                <li>歷史歷年質押與裁罰趨勢數據下載</li>
              </ul>
              <button
                type="button"
                className="btn line"
                style={{ width: '100%' }}
                disabled
              >
                即將推出
              </button>
              <div className="note" style={{ marginTop: 10 }}>想第一個知道？開啟 Email 通知，推出時會通知你</div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'account' && (
        <section className="sec" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2>帳號資訊與個人檔案</h2>
            <a href={`#u-${profile.uid}`} className="ht" style={{ fontSize: 13, fontWeight: 700 }}>
              查看公開主頁 →
            </a>
          </div>

          <div className="setrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--panel)', borderRadius: 12 }}>
            <div>
              <b style={{ fontSize: 14 }}>公開我的追蹤清單</b>
              <div className="note" style={{ marginTop: 2 }}>
                開啟後，其他股友瀏覽您的主頁時可查看您追蹤的公司清單。預設為不公開。
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={Boolean(profile.showWatchlist)}
                onChange={handleToggleShowWatchlist}
              />
              <span className="slider" />
            </label>
          </div>

          <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <b style={{ fontSize: 14 }}>個人資料設定</b>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setEditName(profile.displayName);
                    setEditBio(profile.bio || '');
                    setIsEditingProfile(true);
                  }}
                  className="btn line"
                  style={{ minHeight: 30, padding: '0 12px', fontSize: 12 }}
                >
                  編輯檔案
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field">
                  <label>顯示名稱</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div className="field">
                  <label>自我介紹 (最多 60 字)</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value.slice(0, 60))}
                    maxLength={60}
                    rows={2}
                    placeholder="簡單介紹您的持股或投資風格…"
                  />
                  <div className="note" style={{ textAlign: 'right', marginTop: 4 }}>
                    {editBio.length}/60
                  </div>
                </div>
                <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn line"
                    style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfileEdit}
                    className="btn hl"
                    style={{ minHeight: 32, padding: '0 14px', fontSize: 12 }}
                  >
                    儲存
                  </button>
                </div>
              </div>
            ) : (
              <div className="note" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--ink)' }}>
                <div><span className="muted">顯示名稱：</span> {profile.displayName}</div>
                <div><span className="muted">自我介紹：</span> {profile.bio || '未填寫'}</div>
              </div>
            )}
          </div>

          <div className="lst" style={{ maxWidth: 480, marginTop: 12 }}>
            <div>
              <span>電子郵件</span>
              <span className="mono">{profile.email}</span>
            </div>
            <div>
              <span>使用者 ID</span>
              <span className="mono muted">{profile.uid.slice(0, 12)}…</span>
            </div>
            <div>
              <span>建立時間</span>
              <span className="mono muted">
                {profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString('zh-TW') : '—'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn line" onClick={handleLogout}>
              登出帳號
            </button>
            {!confirmDelete ? (
              <button
                type="button"
                className="btn line"
                style={{ color: 'var(--hi)' }}
                onClick={() => setConfirmDelete(true)}
              >
                刪除帳號與資料…
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--hi)', fontSize: 13, fontWeight: 700 }}>
                  確認刪除帳號？此動作無法復原。
                </span>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--hi)', color: '#fff', minHeight: 36, padding: '0 12px' }}
                  onClick={handleDeleteAccount}
                >
                  確認刪除
                </button>
                <button
                  type="button"
                  className="btn line"
                  style={{ minHeight: 36, padding: '0 12px' }}
                  onClick={() => setConfirmDelete(false)}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
};
