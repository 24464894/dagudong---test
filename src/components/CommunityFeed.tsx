import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  increment,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { CommunityPost, PostComment, Dataset, Company } from '../types';
import { useToast } from '../components/Toast';
import { ChatIcon, HeartIcon } from './Icons';

interface CommunityFeedProps {
  data: Dataset;
  filterCompanyCode?: string;
  onNavigate?: (hash: string) => void;
}

const REPORT_REASONS = [
  '報明牌或喊單',
  '招攬代操或拉群',
  '不實消息',
  '人身攻擊或騷擾',
  '廣告洗版',
  '其他',
];

const SPECULATIVE_KEYWORDS = ['明牌', '必漲', '穩賺', '飆股', '買進', '保證獲利', '帶進帶出', '拉群', '內線', '必賺', '車票', '上車', '喊單'];

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" fill="%23101010"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="18" font-weight="bold">股</text></svg>`;

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ data, filterCompanyCode, onNavigate }) => {
  const { user, profile, isAdmin, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postType, setPostType] = useState<'心得分享' | '提問' | '資料解讀' | '新聞討論'>('心得分享');
  const [content, setContent] = useState('');

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    filterCompanyCode ? [filterCompanyCode] : []
  );
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  // Track liked and reported posts/comments for current user
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userReports, setUserReports] = useState<Record<string, boolean>>({});
  const [commentReports, setCommentReports] = useState<Record<string, boolean>>({});

  // Menu dropdown state
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Modals state
  const [reportModalTarget, setReportModalTarget] = useState<{
    type: 'post' | 'comment';
    postId: string;
    commentId?: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportNote, setReportNote] = useState<string>('');

  const [feedbackModalPostId, setFeedbackModalPostId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState<string>('');

  const [editPostTarget, setEditPostTarget] = useState<CommunityPost | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for prefilled hashtag or quote content from daily report
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('prefill_discuss');
      if (prefill) {
        setContent((prev) => (prev ? `${prefill} ${prev}` : `${prefill} `));
        sessionStorage.removeItem('prefill_discuss');
      }
    } catch {}
  }, []);

  // Close company dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to community posts
  useEffect(() => {
    let postsQuery;
    if (isAdmin) {
      postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    } else {
      postsQuery = query(
        collection(db, 'posts'),
        where('hidden', '==', false),
        where('reportCount', '<', 3)
      );
    }

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const loaded: CommunityPost[] = [];
        snapshot.forEach((docSnap) => {
          const item = { id: docSnap.id, ...docSnap.data() } as CommunityPost;
          if (filterCompanyCode) {
            const hasCo = item.companyCode === filterCompanyCode || (item.companyCodes && item.companyCodes.includes(filterCompanyCode));
            if (hasCo) loaded.push(item);
          } else {
            loaded.push(item);
          }
        });

        // Client-side sort by createdAt desc
        loaded.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });

        setPosts(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    );

    return () => unsubscribe();
  }, [filterCompanyCode, isAdmin]);

  // Check user's likes and reports for loaded posts
  useEffect(() => {
    if (!user || posts.length === 0) return;

    posts.forEach((post) => {
      getDoc(doc(db, 'posts', post.id, 'likes', user.uid))
        .then((snap) => {
          setUserLikes((prev) => ({ ...prev, [post.id]: snap.exists() }));
        })
        .catch(() => {});

      getDoc(doc(db, 'posts', post.id, 'reports', user.uid))
        .then((snap) => {
          setUserReports((prev) => ({ ...prev, [post.id]: snap.exists() }));
        })
        .catch(() => {});
    });
  }, [user, posts]);

  const checkBanned = () => {
    if (profile?.banned) {
      showToast('您的帳號已被停權，無法執行此操作');
      return true;
    }
    return false;
  };

  const hasSpeculativeWords = SPECULATIVE_KEYWORDS.some((kw) => content.includes(kw));

  // Autocomplete matching companies
  const filteredCompanySuggestions: Company[] = companySearch.trim()
    ? data.cos
        .filter(
          (c) =>
            (c.c.includes(companySearch.trim()) || c.n.includes(companySearch.trim())) &&
            !selectedCompanies.includes(c.c)
        )
        .slice(0, 8)
    : [];

  const handleSelectCompany = (code: string) => {
    if (selectedCompanies.includes(code)) return;
    if (selectedCompanies.length >= 3) {
      showToast('最多只能關聯 3 家公司');
      return;
    }
    setSelectedCompanies([...selectedCompanies, code]);
    setCompanySearch('');
    setShowCompanyDropdown(false);
  };

  const handleRemoveCompany = (code: string) => {
    if (filterCompanyCode && code === filterCompanyCode) return;
    setSelectedCompanies(selectedCompanies.filter((c) => c !== code));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      showToast('請先登入後再發布討論');
      await loginWithGoogle();
      return;
    }
    if (checkBanned()) return;

    const trimmed = content.trim();
    if (!trimmed) {
      showToast('請輸入貼文內容');
      return;
    }
    if (trimmed.length < 5) {
      showToast('貼文內容最少需 5 個字');
      return;
    }
    if (trimmed.length > 500) {
      showToast('貼文長度不能超過 500 字');
      return;
    }

    try {
      setSubmitting(true);
      const primaryCoCode = selectedCompanies[0] || null;
      const primaryCoObj = data.cos.find((c) => c.c === primaryCoCode);

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile.displayName || user.displayName || '股東會員',
        authorPhoto: profile.photoURL || user.photoURL || '',
        postType,
        content: trimmed,
        companyCode: primaryCoCode,
        companyName: primaryCoObj ? primaryCoObj.n : null,
        companyCodes: selectedCompanies,
        official: false,
        hidden: false,
        likeCount: 0,
        commentCount: 0,
        reportCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setContent('');
      if (!filterCompanyCode) setSelectedCompanies([]);
      showToast('貼文已成功發布');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (post: CommunityPost) => {
    if (!user || !profile) {
      showToast('請先登入後再按讚');
      await loginWithGoogle();
      return;
    }
    if (checkBanned()) return;

    const isLiked = userLikes[post.id];
    try {
      const batch = writeBatch(db);
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      const postRef = doc(db, 'posts', post.id);

      if (isLiked) {
        batch.delete(likeRef);
        batch.update(postRef, { likeCount: increment(-1) });
      } else {
        batch.set(likeRef, { createdAt: serverTimestamp() });
        batch.update(postRef, { likeCount: increment(1) });
      }

      await batch.commit();
      setUserLikes((prev) => ({ ...prev, [post.id]: !isLiked }));
      showToast(isLiked ? '已取消按讚' : '已按讚');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !reportModalTarget) return;
    if (checkBanned()) return;

    const { type, postId, commentId } = reportModalTarget;

    try {
      const batch = writeBatch(db);

      if (type === 'post') {
        const reportRef = doc(db, 'posts', postId, 'reports', user.uid);
        const postRef = doc(db, 'posts', postId);

        batch.set(reportRef, {
          reason: reportReason,
          note: reportReason === '其他' ? reportNote.slice(0, 100) : '',
          createdAt: serverTimestamp(),
        });
        batch.update(postRef, { reportCount: increment(1) });

        await batch.commit();
        setUserReports((prev) => ({ ...prev, [postId]: true }));
        showToast('檢舉已送出，感謝共同維護社群品質');
      } else if (type === 'comment' && commentId) {
        const reportRef = doc(db, 'posts', postId, 'comments', commentId, 'reports', user.uid);
        const commentRef = doc(db, 'posts', postId, 'comments', commentId);

        batch.set(reportRef, {
          reason: reportReason,
          note: reportReason === '其他' ? reportNote.slice(0, 100) : '',
          createdAt: serverTimestamp(),
        });
        batch.update(commentRef, { reportCount: increment(1) });

        await batch.commit();
        setCommentReports((prev) => ({ ...prev, [commentId]: true }));
        showToast('檢舉已送出，感謝共同維護社群品質');
      }

      setReportModalTarget(null);
      setReportNote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !feedbackModalPostId) return;
    if (checkBanned()) return;

    const trimmed = feedbackNote.trim();
    if (!trimmed) {
      showToast('請輸入資料錯誤說明');
      return;
    }

    try {
      await addDoc(collection(db, 'feedback'), {
        postId: feedbackModalPostId,
        uid: user.uid,
        userName: profile.displayName || user.displayName || '股東會員',
        note: trimmed.slice(0, 200),
        resolved: false,
        createdAt: serverTimestamp(),
      });

      showToast('回報已送出，感謝您的協助！');
      setFeedbackModalPostId(null);
      setFeedbackNote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feedback');
    }
  };

  const handleSaveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editPostTarget) return;
    if (checkBanned()) return;

    const trimmed = editPostContent.trim();
    if (!trimmed) {
      showToast('貼文內容不能為空');
      return;
    }
    if (trimmed.length > 500) {
      showToast('貼文內容不能超過 500 字');
      return;
    }

    try {
      await updateDoc(doc(db, 'posts', editPostTarget.id), {
        content: trimmed,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('貼文已更新');
      setEditPostTarget(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${editPostTarget.id}`);
    }
  };

  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!user || (user.uid !== authorId && !isAdmin)) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      showToast('貼文已刪除');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleToggleAdminFlag = async (
    postId: string,
    field: 'official' | 'hidden',
    currentVal?: boolean
  ) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        [field]: !currentVal,
        updatedAt: serverTimestamp(),
      });
      showToast(`已${!currentVal ? '啟用' : '取消'} ${field === 'official' ? '官方標記' : '隱藏'}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  // Filter out posts by blocked users
  const visiblePosts = posts.filter((p) => !profile?.blocked?.includes(p.authorId));

  return (
    <div>
      {/* Create Post Box Component (.cmp) */}
      <form onSubmit={handleCreatePost} className="cmp">
        <img
          src={profile?.photoURL || user?.photoURL || DEFAULT_AVATAR}
          alt=""
          className="me"
        />

        <div className="body">
          {/* 1) Post Types Row */}
          <div className="row">
            {(['心得分享', '提問', '資料解讀', '新聞討論'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className="ty"
                aria-pressed={postType === type}
                onClick={() => setPostType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {/* 2) Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你看到的公開資訊…（請勿報明牌）"
            maxLength={500}
            rows={4}
          />

          {/* 3) Selected Company Chips & Add Company Input */}
          <div className="row">
            {selectedCompanies.map((code) => {
              const co = data.cos.find((c) => c.c === code);
              return (
                <span key={code} className="cochip">
                  <span>#{co ? co.n : code}</span>
                  {(!filterCompanyCode || code !== filterCompanyCode) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCompany(code)}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}

            {selectedCompanies.length < 3 && !filterCompanyCode && (
              <div className="coadd" ref={dropdownRef}>
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  placeholder="＋ 標記公司（最多 3 家）"
                />
                {showCompanyDropdown && filteredCompanySuggestions.length > 0 && (
                  <div className="cosug">
                    {filteredCompanySuggestions.map((co) => (
                      <button
                        key={co.c}
                        type="button"
                        onClick={() => handleSelectCompany(co.c)}
                      >
                        <b>{co.n}</b>
                        <span className="muted">{co.c}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4) Signal Small Cards (.coprev) */}
          {selectedCompanies.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedCompanies.map((code) => {
                const co = data.cos.find((c) => c.c === code);
                if (!co) return null;
                return (
                  <div key={code} className="coprev">
                    <div>
                      <b>{co.n} ({co.c})</b>
                      <div className="muted">{co.k && co.k.length > 0 ? co.k.join(' · ') : '目前無異常風控訊號'}</div>
                    </div>
                    <span className="muted">{co.m || '上市'}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5) Speculative Words Warning (.warn) */}
          {hasSpeculativeWords && (
            <div className="warn">
              ⚠️ 提示：內容包含敏感或喊單詞彙，請確認為公開資訊討論，勿提供具體買賣建議。
            </div>
          )}

          {/* 6) Footer (.cmp-foot) */}
          <div className="cmp-foot">
            <span className="cnt">{content.length}/500</span>
            <button
              type="submit"
              className="cmp-post"
              disabled={submitting || !content.trim() || content.trim().length < 5 || content.trim().length > 500}
            >
              {submitting ? '送出中…' : '發布'}
            </button>
          </div>
        </div>
      </form>

      {/* Posts List */}
      {visiblePosts.length > 0 ? (
        visiblePosts.map((post) => {
          const isAuthor = user?.uid === post.authorId;
          const showComments = activeCommentPostId === post.id;
          const isLiked = Boolean(userLikes[post.id]);
          const isReported = Boolean(userReports[post.id]);
          const isMenuOpen = activeMenuPostId === post.id;

          return (
            <article key={post.id} className="post">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate(`#u-${post.authorId}`)}
                className="av"
              >
                {post.authorPhoto ? (
                  <img src={post.authorPhoto} alt={post.authorName} className="me" />
                ) : (
                  <span>{post.authorName.slice(0, 1)}</span>
                )}
              </button>

              <div>
                <div className="who">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(`#u-${post.authorId}`)}
                    style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: 'var(--ink)' }}
                  >
                    <b>{post.authorName}</b>
                  </button>

                  {post.postType && <span className="tag mid">{post.postType}</span>}
                  {post.official && <span className="tag y">官方發布</span>}
                  {post.hidden && <span className="tag hi">已隱藏</span>}

                  {post.companyCode && (
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate(`#co-${post.companyCode}`)}
                      className="tag"
                    >
                      #{post.companyName || post.companyCode}
                    </button>
                  )}

                  <span className="muted">
                    · {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('zh-TW') : '剛剛'}
                    {post.editedAt && ' (已編輯)'}
                  </span>

                  <div style={{ position: 'relative', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setActiveMenuPostId(isMenuOpen ? null : post.id)}
                      className="rmbtn"
                    >
                      ⋯
                    </button>

                    {isMenuOpen && (
                      <div className="cosug" style={{ top: '24px', right: 0, left: 'auto' }}>
                        {post.official ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuPostId(null);
                              if (!user) {
                                loginWithGoogle();
                                return;
                              }
                              setFeedbackModalPostId(post.id);
                            }}
                          >
                            回報資料錯誤
                          </button>
                        ) : isAuthor ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                setEditPostTarget(post);
                                setEditPostContent(post.content);
                              }}
                            >
                              編輯貼文
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPostId(null);
                                handleDeletePost(post.id, post.authorId);
                              }}
                              style={{ color: 'var(--hi-fg)' }}
                            >
                              刪除貼文
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isReported}
                            onClick={() => {
                              setActiveMenuPostId(null);
                              if (!user) {
                                loginWithGoogle();
                                return;
                              }
                              setReportModalTarget({ type: 'post', postId: post.id });
                            }}
                            style={isReported ? { color: 'var(--muted)' } : { color: 'var(--hi-fg)' }}
                          >
                            {isReported ? '已檢舉' : '檢舉貼文'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="txt">{post.content}</div>

                <div className="acts">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post)}
                    aria-pressed={isLiked}
                  >
                    <HeartIcon filled={isLiked} style={{ width: 16, height: 16 }} />
                    <span>{post.likeCount && post.likeCount > 0 ? post.likeCount : '讚'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCommentPostId(showComments ? null : post.id)}
                  >
                    <ChatIcon style={{ width: 16, height: 16 }} />
                    <span>{post.commentCount && post.commentCount > 0 ? `${post.commentCount} 留言` : '留言'}</span>
                  </button>

                  {isAdmin && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleAdminFlag(post.id, 'official', post.official)}
                      >
                        {post.official ? '取消官方' : '設為官方'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAdminFlag(post.id, 'hidden', post.hidden)}
                      >
                        {post.hidden ? '取消隱藏' : '隱藏貼文'}
                      </button>
                    </div>
                  )}
                </div>

                {showComments && (
                  <CommentSection
                    postId={post.id}
                    checkBanned={checkBanned}
                    commentReports={commentReports}
                    setCommentReports={setCommentReports}
                    setReportModalTarget={setReportModalTarget}
                    onNavigate={onNavigate}
                  />
                )}
              </div>
            </article>
          );
        })
      ) : (
        <div className="empty">
          目前尚無用戶討論。歡迎登入發表第一則觀點！
        </div>
      )}

      {/* Modals: Report, Feedback, Edit */}
      {reportModalTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '16px' }}>
          <div className="box" style={{ maxWidth: '420px', width: '100%', background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <h2>選擇檢舉原因</h2>
            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {REPORT_REASONS.map((r) => (
                  <label key={r} style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={reportReason === r}
                      onChange={(e) => setReportReason(e.target.value)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              {reportReason === '其他' && (
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="可輸入最多 100 字說明…"
                  maxLength={100}
                  rows={2}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '13px' }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReportModalTarget(null)}
                  className="btn line"
                  style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px', background: 'var(--hi-fg)', color: '#fff' }}
                >
                  送出檢舉
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {feedbackModalPostId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '16px' }}>
          <div className="box" style={{ maxWidth: '420px', width: '100%', background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <h2>回報官方貼文資料錯誤</h2>
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="請說明資料勘誤或疑慮點（最多 200 字）…"
                maxLength={200}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFeedbackModalPostId(null)}
                  className="btn line"
                  style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn hl"
                  style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  送出回報
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPostTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '16px' }}>
          <div className="box" style={{ maxWidth: '420px', width: '100%', background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <h2>編輯貼文</h2>
            <form onSubmit={handleSaveEditPost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                maxLength={500}
                rows={4}
                style={{ width: '100%', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '14px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: '12px' }}>{editPostContent.length}/500</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditPostTarget(null)}
                    className="btn line"
                    style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn hl"
                    style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                  >
                    儲存修改
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Comment section
const CommentSection: React.FC<{
  postId: string;
  checkBanned: () => boolean;
  commentReports: Record<string, boolean>;
  setCommentReports: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setReportModalTarget: (target: { type: 'comment'; postId: string; commentId: string } | null) => void;
  onNavigate?: (hash: string) => void;
}> = ({ postId, checkBanned, commentReports, setCommentReports, setReportModalTarget, onNavigate }) => {
  const { user, profile, isAdmin, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeMenuCommentId, setActiveMenuCommentId] = useState<string | null>(null);

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    } else {
      q = query(
        collection(db, 'posts', postId, 'comments'),
        where('hidden', '==', false),
        where('reportCount', '<', 3)
      );
    }

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: PostComment[] = [];
        snapshot.forEach((snap) => {
          loaded.push({ id: snap.id, postId, ...snap.data() } as PostComment);
        });
        loaded.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tA - tB;
        });
        setComments(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
      }
    );
    return () => unsub();
  }, [postId, isAdmin]);

  useEffect(() => {
    if (!user || comments.length === 0) return;
    comments.forEach((cm) => {
      getDoc(doc(db, 'posts', postId, 'comments', cm.id, 'reports', user.uid))
        .then((snap) => {
          if (snap.exists()) {
            setCommentReports((prev) => ({ ...prev, [cm.id]: true }));
          }
        })
        .catch(() => {});
    });
  }, [user, comments, postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      showToast('請先登入後再發表留言');
      await loginWithGoogle();
      return;
    }
    if (checkBanned()) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      showToast('留言長度不能超過 500 字');
      return;
    }

    try {
      setSending(true);
      const commentRef = doc(collection(db, 'posts', postId, 'comments'));
      const postRef = doc(db, 'posts', postId);

      const batch = writeBatch(db);
      batch.set(commentRef, {
        authorId: user.uid,
        authorName: profile.displayName || user.displayName || '股東會員',
        authorPhoto: profile.photoURL || user.photoURL || '',
        content: trimmed,
        hidden: false,
        reportCount: 0,
        createdAt: serverTimestamp(),
      });
      batch.update(postRef, {
        commentCount: increment(1),
      });

      await batch.commit();
      setCommentText('');
      showToast('留言已送出');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string, authorId: string) => {
    if (!user || (user.uid !== authorId && !isAdmin)) return;
    try {
      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      const postRef = doc(db, 'posts', postId);

      const batch = writeBatch(db);
      batch.delete(commentRef);
      batch.update(postRef, {
        commentCount: increment(-1),
      });

      await batch.commit();
      showToast('留言已刪除');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  // Filter out comments by blocked users
  const visibleComments = comments.filter((c) => !profile?.blocked?.includes(c.authorId));

  return (
    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--panel)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visibleComments.map((cm) => {
          const isAuthor = user?.uid === cm.authorId;
          const isReported = Boolean(commentReports[cm.id]);
          const isMenuOpen = activeMenuCommentId === cm.id;

          return (
            <div
              key={cm.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '13px', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}
            >
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate(`#u-${cm.authorId}`)}
                  style={{ fontWeight: 700, border: 0, background: 'none', cursor: 'pointer', padding: 0, color: 'var(--ink)' }}
                >
                  {cm.authorName}:
                </button>{' '}
                <span>{cm.content}</span>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setActiveMenuCommentId(isMenuOpen ? null : cm.id)}
                  className="rmbtn"
                >
                  ⋯
                </button>

                {isMenuOpen && (
                  <div className="cosug" style={{ top: '20px', right: 0, left: 'auto', minWidth: '120px' }}>
                    {isAuthor ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuCommentId(null);
                          handleDeleteComment(cm.id, cm.authorId);
                        }}
                        style={{ color: 'var(--hi-fg)' }}
                      >
                        刪除留言
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isReported}
                        onClick={() => {
                          setActiveMenuCommentId(null);
                          if (!user) {
                            loginWithGoogle();
                            return;
                          }
                          setReportModalTarget({ type: 'comment', postId, commentId: cm.id });
                        }}
                        style={isReported ? { color: 'var(--muted)' } : { color: 'var(--hi-fg)' }}
                      >
                        {isReported ? '已檢舉' : '檢舉留言'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={user ? '留下您的回覆…（最多 500 字）' : '請先登入以回覆…'}
          maxLength={500}
          disabled={!user}
          style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: '13px' }}
        />
        <button
          type="submit"
          disabled={sending || !commentText.trim() || !user}
          className="btn line"
          style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
        >
          {sending ? '…' : '送出'}
        </button>
      </form>
    </div>
  );
};
