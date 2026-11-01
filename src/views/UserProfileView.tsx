import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, collection, query, where, getDocs } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { PublicUserProfile, CommunityPost, Dataset } from '../types';
import { LockIcon } from '../components/Icons';

interface UserProfileViewProps {
  targetUid: string;
  dataset: Dataset;
  onNavigate: (hash: string) => void;
  onRequireAuth: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  targetUid,
  dataset,
  onNavigate,
  onRequireAuth,
}) => {
  const { user, profile: currentUserProfile, blockUser, unblockUser, reportUser } = useAuth();
  const [publicProfile, setPublicProfile] = useState<PublicUserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'watchlist'>('posts');
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('報明牌或喊單');
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const isSelf = user?.uid === targetUid;
  const isBlocked = currentUserProfile?.blocked?.includes(targetUid) ?? false;

  useEffect(() => {
    let mounted = true;
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const pSnap = await getDoc(doc(db, 'profiles', targetUid));
        const uSnap = await getDoc(doc(db, 'users', targetUid));

        if (uSnap.exists() && uSnap.data().banned) {
          if (mounted) setIsBanned(true);
        }

        if (pSnap.exists()) {
          if (mounted) setPublicProfile(pSnap.data() as PublicUserProfile);
        } else if (uSnap.exists()) {
          const uData = uSnap.data();
          if (mounted) {
            setPublicProfile({
              uid: targetUid,
              name: uData.displayName || '股東會員',
              photo: uData.photoURL || '',
              bio: uData.bio || '',
              joinedAt: uData.createdAt ? new Date(uData.createdAt.toDate ? uData.createdAt.toDate() : uData.createdAt).toISOString().split('T')[0] : '',
              showWatchlist: uData.showWatchlist || false,
              watchlist: uData.watchlist || [],
              postCount: 0,
              likeCount: 0,
            });
          }
        }

        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', targetUid)
        );
        const postsSnap = await getDocs(q);
        const posts: CommunityPost[] = [];
        postsSnap.forEach((docSnap) => {
          posts.push({ id: docSnap.id, ...docSnap.data() } as CommunityPost);
        });

        posts.sort((a, b) => {
          const tA = a.createdAt?.seconds || (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tB = b.createdAt?.seconds || (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tB - tA;
        });

        if (mounted) setUserPosts(posts);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (targetUid) {
      fetchUserData();
    }
  }, [targetUid]);

  if (loading) {
    return <div className="empty">載入用戶資料中…</div>;
  }

  if (isBanned) {
    return (
      <div className="empty">
        <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--ink)' }}>此帳號已被停權</h2>
        <p className="note">該用戶因違反社群規範，帳號權限已被暫停。</p>
      </div>
    );
  }

  if (!publicProfile) {
    return (
      <div className="empty">
        <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--ink)' }}>找不到此用戶</h2>
        <p className="note">用戶可能已刪除帳號或不存在。</p>
      </div>
    );
  }

  // Calculate stats & top companies discussed
  const companyCounts: Record<string, number> = {};
  let totalLikes = 0;
  userPosts.forEach((post) => {
    if (post.likeCount) totalLikes += post.likeCount;
    if (post.companyCode) {
      companyCounts[post.companyCode] = (companyCounts[post.companyCode] || 0) + 1;
    }
    if (post.companyCodes) {
      post.companyCodes.forEach((code) => {
        companyCounts[code] = (companyCounts[code] || 0) + 1;
      });
    }
  });

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code]) => {
      const co = dataset.cos.find((c) => c.c === code);
      return { code, name: co ? co.n : code };
    });

  const handleToggleBlock = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (isBlocked) {
      await unblockUser(targetUid);
    } else {
      await blockUser(targetUid);
    }
    setShowMenu(false);
  };

  const handleSendReport = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    await reportUser(targetUid, publicProfile.name, reportReason, reportNote);
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReportModal(false);
      setReportSubmitted(false);
      setReportNote('');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      {/* Feed Head Header */}
      <div className="feedhead" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="btn line"
          onClick={() => window.history.back()}
          style={{ minHeight: 32, padding: '0 10px', fontSize: 13 }}
        >
          ← 返回
        </button>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>{publicProfile.name}</h1>
          <span className="note">{userPosts.length} 則貼文</span>
        </div>
      </div>

      {/* Main Profile Card (.sec) */}
      <section className="sec" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="avbig">
              {publicProfile.photo ? (
                <img src={publicProfile.photo} alt={publicProfile.name} />
              ) : (
                publicProfile.name.slice(0, 1)
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                  {publicProfile.name}
                </h2>
                <span className="note" style={{ background: 'var(--panel)', padding: '2px 8px', borderRadius: 999 }}>
                  email 不會公開
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0 0' }}>
                {publicProfile.bio || '這個用戶很懶，還沒有寫自我介紹。'}
              </p>
              {publicProfile.joinedAt && (
                <div className="note" style={{ marginTop: 4 }}>
                  {publicProfile.joinedAt} 加入・email 不會公開
                </div>
              )}
            </div>
          </div>

          {/* Action "⋯" Menu or Edit Profile */}
          <div className="more-wrap">
            {isSelf ? (
              <button
                type="button"
                onClick={() => onNavigate('#me')}
                className="btn line"
                style={{ minHeight: 32, padding: '0 12px', fontSize: 13 }}
              >
                編輯個人資料
              </button>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="more-btn"
                >
                  ⋯
                </button>

                {showMenu && (
                  <div className="menu" style={{ right: 0, left: 'auto', minWidth: 140 }}>
                    <button type="button" onClick={handleToggleBlock}>
                      {isBlocked ? '解除封鎖' : '封鎖此用戶'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        if (!user) {
                          onRequireAuth();
                        } else {
                          setShowReportModal(true);
                        }
                      }}
                      style={{ color: 'var(--hi-fg)' }}
                    >
                      檢舉此用戶
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Row (.kv) */}
        <div className="kv" style={{ marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{userPosts.length}</div>
            <div className="note">發布貼文</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{totalLikes}</div>
            <div className="note">獲得讚數</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{Object.keys(companyCounts).length}</div>
            <div className="note">聊過公司</div>
          </div>
        </div>

        {/* Frequently Discussed Companies */}
        {topCompanies.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="note" style={{ fontWeight: 700 }}>常聊：</span>
            {topCompanies.map((co) => (
              <a
                key={co.code}
                href={`#co-${co.code}`}
                className="ht"
                style={{ fontSize: 13 }}
              >
                {co.name} ({co.code})
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Navigation Subtabs (.tabs) */}
      <nav className="tabs">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          aria-current={activeTab === 'posts' ? 'page' : undefined}
        >
          貼文 ({userPosts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          aria-current={activeTab === 'watchlist' ? 'page' : undefined}
        >
          追蹤的公司
        </button>
      </nav>

      {/* Tab Content */}
      {activeTab === 'posts' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {userPosts.length === 0 ? (
            <div className="empty">尚無發布貼文</div>
          ) : (
            userPosts.map((post) => (
              <article key={post.id} className="post">
                <div className="av">
                  {post.authorPhoto ? (
                    <img src={post.authorPhoto} alt={post.authorName} className="me" />
                  ) : (
                    <span>{post.authorName.slice(0, 1)}</span>
                  )}
                </div>

                <div>
                  <div className="who">
                    <b>{post.authorName}</b>
                    {post.postType && <span className="tag mid">{post.postType}</span>}
                    {post.companyCode && (
                      <a href={`#co-${post.companyCode}`} className="ht">
                        #{post.companyName || post.companyCode}
                      </a>
                    )}
                    <span className="muted">
                      · {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('zh-TW') : '剛剛'}
                    </span>
                  </div>

                  <div className="txt">{post.content}</div>

                  {post.likeCount != null && post.likeCount > 0 && (
                    <div className="acts" style={{ marginTop: 8 }}>
                      <span className="note">❤️ {post.likeCount} 人按讚</span>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isSelf && !publicProfile.showWatchlist ? (
            <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <LockIcon style={{ width: 32, height: 32, color: 'var(--muted)' }} />
              <span>該用戶未公開追蹤清單</span>
            </div>
          ) : !publicProfile.watchlist || publicProfile.watchlist.length === 0 ? (
            <div className="empty">尚無追蹤的公司</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {publicProfile.watchlist.map((code) => {
                const company = dataset.cos.find((c) => c.c === code);
                return (
                  <div
                    key={code}
                    onClick={() => onNavigate(`#co-${code}`)}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--panel)',
                      borderRadius: 12,
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <b style={{ color: 'var(--ink)', fontSize: 14 }}>{company ? company.n : code}</b>
                      <div className="note" style={{ marginTop: 2 }}>
                        {code} · {company?.m || '上市'}
                      </div>
                    </div>
                    {company?.i && <span className="tag mid">{company.i}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User Report Modal (.modal-bg + .modal) */}
      {showReportModal && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: 420 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>檢舉用戶：{publicProfile.name}</h2>

            {reportSubmitted ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink)', fontWeight: 700, fontSize: 14 }}>
                已收到檢舉，我們會盡快審查處理！
              </div>
            ) : (
              <>
                <div className="field">
                  <label>檢舉原因</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                  >
                    <option value="報明牌或喊單">報明牌或喊單</option>
                    <option value="招攬代操或拉群">招攬代操或拉群</option>
                    <option value="散佈不實消息">散佈不實消息</option>
                    <option value="騷擾人身攻擊">人身攻擊或騷擾</option>
                    <option value="廣告洗版">廣告洗版或垃圾訊息</option>
                    <option value="其他">其他原因</option>
                  </select>
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label>說明 (選填，最多 100 字)</label>
                  <textarea
                    maxLength={100}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="請簡述具體檢舉細節…"
                    rows={3}
                  />
                </div>

                <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="btn line"
                    style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    className="btn"
                    style={{ minHeight: 32, padding: '0 12px', fontSize: 12, background: 'var(--hi-fg)', color: '#fff' }}
                  >
                    送出檢舉
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

