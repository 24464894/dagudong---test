import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  db,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  collectionGroup,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { CommunityPost, PostComment, FeedbackItem, ReportItem, UserProfile, UserReportItem } from '../types';
import { useToast } from '../components/Toast';

export const AdminView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'reports' | 'userReports' | 'feedback' | 'banned'>('reports');

  // Reports state
  const [reportedPosts, setReportedPosts] = useState<
    { post: CommunityPost; reports: ReportItem[] }[]
  >([]);
  const [reportedComments, setReportedComments] = useState<
    { comment: PostComment; reports: ReportItem[] }[]
  >([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // User Reports state
  const [userReports, setUserReports] = useState<UserReportItem[]>([]);
  const [userReportsLoading, setUserReportsLoading] = useState(false);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Banned users state
  const [bannedUsers, setBannedUsers] = useState<UserProfile[]>([]);
  const [bannedLoading, setBannedLoading] = useState(false);

  // Load User Reports
  const loadUserReports = async () => {
    if (!isAdmin) return;
    try {
      setUserReportsLoading(true);
      const snap = await getDocs(collection(db, 'userReports'));
      const list: UserReportItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserReportItem);
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUserReports(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'userReports');
    } finally {
      setUserReportsLoading(false);
    }
  };

  // Load Reported Posts and Comments
  const loadReports = async () => {
    if (!isAdmin) return;
    try {
      setReportsLoading(true);

      // Load reported posts (reportCount >= 1)
      const postsQuery = query(collection(db, 'posts'), where('reportCount', '>=', 1));
      const postsSnap = await getDocs(postsQuery);
      const postList: { post: CommunityPost; reports: ReportItem[] }[] = [];

      for (const pSnap of postsSnap.docs) {
        const postData = { id: pSnap.id, ...pSnap.data() } as CommunityPost;
        const reportsSnap = await getDocs(collection(db, 'posts', pSnap.id, 'reports'));
        const reports: ReportItem[] = [];
        reportsSnap.forEach((rSnap) => {
          reports.push({ id: rSnap.id, ...rSnap.data() } as ReportItem);
        });
        postList.push({ post: postData, reports });
      }

      postList.sort((a, b) => (b.post.reportCount || 0) - (a.post.reportCount || 0));
      setReportedPosts(postList);

      // Load reported comments (reportCount >= 1)
      const commentsQuery = query(collectionGroup(db, 'comments'), where('reportCount', '>=', 1));
      const commentsSnap = await getDocs(commentsQuery);
      const commentList: { comment: PostComment; reports: ReportItem[] }[] = [];

      for (const cSnap of commentsSnap.docs) {
        const commentData = { id: cSnap.id, ...cSnap.data() } as PostComment;
        const reportsSnap = await getDocs(
          collection(db, 'posts', commentData.postId, 'comments', cSnap.id, 'reports')
        );
        const reports: ReportItem[] = [];
        reportsSnap.forEach((rSnap) => {
          reports.push({ id: rSnap.id, ...rSnap.data() } as ReportItem);
        });
        commentList.push({ comment: commentData, reports });
      }

      commentList.sort((a, b) => (b.comment.reportCount || 0) - (a.comment.reportCount || 0));
      setReportedComments(commentList);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'reports');
    } finally {
      setReportsLoading(false);
    }
  };

  // Load Feedback
  const loadFeedbacks = async () => {
    if (!isAdmin) return;
    try {
      setFeedbackLoading(true);
      const fbSnap = await getDocs(collection(db, 'feedback'));
      const list: FeedbackItem[] = [];
      fbSnap.forEach((fDoc) => {
        list.push({ id: fDoc.id, ...fDoc.data() } as FeedbackItem);
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFeedbacks(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Load Banned Users
  const loadBannedUsers = async () => {
    if (!isAdmin) return;
    try {
      setBannedLoading(true);
      const usersQuery = query(collection(db, 'users'), where('banned', '==', true));
      const uSnap = await getDocs(usersQuery);
      const list: UserProfile[] = [];
      uSnap.forEach((uDoc) => {
        list.push({ uid: uDoc.id, ...uDoc.data() } as UserProfile);
      });
      setBannedUsers(list);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setBannedLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'reports') loadReports();
    if (tab === 'feedback') loadFeedbacks();
    if (tab === 'banned') loadBannedUsers();
  }, [tab, isAdmin]);

  // Actions for Reported Posts
  const handleApprovePost = async (postId: string) => {
    try {
      // Clear reports subcollection
      const reportsSnap = await getDocs(collection(db, 'posts', postId, 'reports'));
      for (const rDoc of reportsSnap.docs) {
        await deleteDoc(rDoc.ref);
      }
      // Reset count and unhide
      await updateDoc(doc(db, 'posts', postId), {
        reportCount: 0,
        hidden: false,
      });
      showToast('已恢復顯示並清空檢舉紀錄');
      loadReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleHidePost = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        hidden: true,
      });
      showToast('已將貼文隱藏');
      loadReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePostAndBan = async (postId: string, authorId: string) => {
    try {
      // Delete post
      await deleteDoc(doc(db, 'posts', postId));
      // Ban author
      if (authorId) {
        await updateDoc(doc(db, 'users', authorId), {
          banned: true,
        });
      }
      showToast('已刪除貼文並停權作者');
      loadReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  // Actions for Reported Comments
  const handleApproveComment = async (postId: string, commentId: string) => {
    try {
      const reportsSnap = await getDocs(
        collection(db, 'posts', postId, 'comments', commentId, 'reports')
      );
      for (const rDoc of reportsSnap.docs) {
        await deleteDoc(rDoc.ref);
      }
      await updateDoc(doc(db, 'posts', postId, 'comments', commentId), {
        reportCount: 0,
        hidden: false,
      });
      showToast('已恢復顯示留言');
      loadReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}/comments/${commentId}`);
    }
  };

  const handleHideComment = async (postId: string, commentId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId, 'comments', commentId), {
        hidden: true,
      });
      showToast('已將留言隱藏');
      loadReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}/comments/${commentId}`);
    }
  };

  const handleDeleteCommentAndBan = async (
    postId: string,
    commentId: string,
    authorId: string
  ) => {
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      if (authorId) {
        await updateDoc(doc(db, 'users', authorId), {
          banned: true,
        });
      }
      showToast('已刪除留言並停權作者');
      loadReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  // Action for Feedback
  const handleResolveFeedback = async (feedbackId: string, currentResolved?: boolean) => {
    try {
      await updateDoc(doc(db, 'feedback', feedbackId), {
        resolved: !currentResolved,
      });
      showToast(currentResolved ? '已設為未處理' : '已標記為已處理');
      loadFeedbacks();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `feedback/${feedbackId}`);
    }
  };

  // Action for User Reports
  const handleBanUserFromReport = async (reportId: string, targetUid: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUid), { banned: true });
      await updateDoc(doc(db, 'userReports', reportId), { resolved: true });
      showToast('已將該用戶停權並標記為已處理');
      loadUserReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userReports/${reportId}`);
    }
  };

  const handleResolveUserReport = async (reportId: string, currentResolved?: boolean) => {
    try {
      await updateDoc(doc(db, 'userReports', reportId), { resolved: !currentResolved });
      showToast(currentResolved ? '已設為待處理' : '已標記為已處理');
      loadUserReports();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `userReports/${reportId}`);
    }
  };

  // Action for Banned Users
  const handleUnbanUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        banned: false,
      });
      showToast('已解除停權');
      loadBannedUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="empty" style={{ padding: 40 }}>
        <h2>權限不足</h2>
        <p className="muted">此頁面僅供系統管理員使用。</p>
      </div>
    );
  }

  return (
    <>
      <div className="dhead">
        <div>
          <h1>後台管理中心</h1>
          <p>審核檢舉內容、檢視資料錯誤回報與管理使用者停權名單</p>
        </div>
      </div>

      <nav className="tabs">
        <button
          type="button"
          onClick={() => setTab('reports')}
          aria-current={tab === 'reports' ? 'page' : undefined}
        >
          待處理檢舉 ({reportedPosts.length + reportedComments.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('userReports')}
          aria-current={tab === 'userReports' ? 'page' : undefined}
        >
          用戶檢舉 ({userReports.filter((r) => !r.resolved).length})
        </button>
        <button
          type="button"
          onClick={() => setTab('feedback')}
          aria-current={tab === 'feedback' ? 'page' : undefined}
        >
          資料錯誤回報 ({feedbacks.filter((f) => !f.resolved).length})
        </button>
        <button
          type="button"
          onClick={() => setTab('banned')}
          aria-current={tab === 'banned' ? 'page' : undefined}
        >
          停權名單 ({bannedUsers.length})
        </button>
      </nav>

      {/* Tab 1: Reported Content */}
      {tab === 'reports' && (
        <section className="sec">
          <h2>待處理檢舉清單</h2>
          <p className="sub">列出被用戶檢舉 1 次以上的貼文與留言，依檢舉次數排序：</p>

          {reportsLoading ? (
            <p className="note" style={{ padding: 16 }}>
              載入檢舉資料中…
            </p>
          ) : reportedPosts.length === 0 && reportedComments.length === 0 ? (
            <p className="empty">目前無待處理的檢舉事件。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {/* Reported Posts */}
              {reportedPosts.map(({ post, reports }) => (
                <div
                  key={post.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 14,
                    background: post.hidden ? 'var(--panel)' : 'var(--bg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="tag hi" style={{ marginRight: 6 }}>
                        貼文檢舉 ×{post.reportCount || reports.length}
                      </span>
                      {post.hidden && <span className="tag mid">已隱藏</span>}
                      <b>{post.authorName}</b> <span className="mono muted">({post.authorId})</span>
                    </div>
                  </div>

                  <div className="txt" style={{ margin: '10px 0', padding: '8px 12px', background: 'var(--panel)', borderRadius: 6 }}>
                    {post.content}
                  </div>

                  {/* Report reasons summary */}
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    <b>檢舉原因列表：</b>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                      {reports.map((r, i) => (
                        <li key={i}>
                          <span>{r.reason}</span>
                          {r.note && <span className="muted">（說明：{r.note}）</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, fontSize: 13 }}
                      onClick={() => handleApprovePost(post.id)}
                    >
                      沒問題，恢復顯示
                    </button>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, fontSize: 13 }}
                      onClick={() => handleHidePost(post.id)}
                    >
                      隱藏貼文
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        minHeight: 32,
                        fontSize: 13,
                        background: 'var(--hi)',
                        color: '#fff',
                      }}
                      onClick={() => handleDeletePostAndBan(post.id, post.authorId)}
                    >
                      刪除並停權作者
                    </button>
                  </div>
                </div>
              ))}

              {/* Reported Comments */}
              {reportedComments.map(({ comment, reports }) => (
                <div
                  key={comment.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 14,
                    background: comment.hidden ? 'var(--panel)' : 'var(--bg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="tag hi" style={{ marginRight: 6 }}>
                        留言檢舉 ×{comment.reportCount || reports.length}
                      </span>
                      {comment.hidden && <span className="tag mid">已隱藏</span>}
                      <b>{comment.authorName}</b> <span className="mono muted">({comment.authorId})</span>
                    </div>
                  </div>

                  <div className="txt" style={{ margin: '10px 0', padding: '8px 12px', background: 'var(--panel)', borderRadius: 6 }}>
                    留言內容：{comment.content}
                  </div>

                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    <b>檢舉原因列表：</b>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                      {reports.map((r, i) => (
                        <li key={i}>
                          <span>{r.reason}</span>
                          {r.note && <span className="muted">（說明：{r.note}）</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, fontSize: 13 }}
                      onClick={() => handleApproveComment(comment.postId, comment.id)}
                    >
                      沒問題，恢復顯示
                    </button>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, fontSize: 13 }}
                      onClick={() => handleHideComment(comment.postId, comment.id)}
                    >
                      隱藏留言
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        minHeight: 32,
                        fontSize: 13,
                        background: 'var(--hi)',
                        color: '#fff',
                      }}
                      onClick={() =>
                        handleDeleteCommentAndBan(comment.postId, comment.id, comment.authorId)
                      }
                    >
                      刪除並停權作者
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Feedback */}
      {tab === 'feedback' && (
        <section className="sec">
          <h2>官方貼文資料錯誤回報</h2>
          <p className="sub">使用者針對官方資料貼文提交的回報訊息：</p>

          {feedbackLoading ? (
            <p className="note" style={{ padding: 16 }}>
              載入錯誤回報中…
            </p>
          ) : feedbacks.length === 0 ? (
            <p className="empty">目前無資料錯誤回報。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 12,
                    background: fb.resolved ? 'var(--panel)' : 'var(--bg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13 }}>
                      <span className={`tag ${fb.resolved ? 'mid' : 'hi'}`} style={{ marginRight: 6 }}>
                        {fb.resolved ? '已處理' : '待處理'}
                      </span>
                      <b>關聯貼文 ID：</b>
                      <span className="mono">{fb.postId}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14 }}>{fb.note}</div>
                  </div>

                  <button
                    type="button"
                    className="btn line"
                    style={{ minHeight: 32, fontSize: 13, flexShrink: 0 }}
                    onClick={() => handleResolveFeedback(fb.id, fb.resolved)}
                  >
                    {fb.resolved ? '標記未處理' : '標記已處理'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab: User Reports */}
      {tab === 'userReports' && (
        <section className="sec">
          <h2>被檢舉的用戶名單</h2>
          <p className="sub">使用者互相提交的用戶檢舉訊息：</p>

          {userReportsLoading ? (
            <p className="note" style={{ padding: 16 }}>
              載入用戶檢舉資料中…
            </p>
          ) : userReports.length === 0 ? (
            <p className="empty">目前無用戶檢舉資料。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {userReports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 14,
                    background: r.resolved ? 'var(--panel)' : 'var(--bg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className={`tag ${r.resolved ? 'mid' : 'hi'}`} style={{ marginRight: 6 }}>
                        {r.resolved ? '已處理' : '待處理'}
                      </span>
                      <b>被檢舉對象：{r.targetName}</b> <span className="mono muted">({r.targetUid})</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      檢舉人：{r.reporterName} ({r.reporterUid})
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <b>檢舉原因：</b>
                    <span style={{ color: 'var(--hi)' }}>{r.reason}</span>
                    {r.note && <span className="muted">（說明：{r.note}）</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn line"
                      style={{ minHeight: 32, fontSize: 13 }}
                      onClick={() => handleResolveUserReport(r.id, r.resolved)}
                    >
                      {r.resolved ? '標記未處理' : '標記已處理'}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        minHeight: 32,
                        fontSize: 13,
                        background: 'var(--hi)',
                        color: '#fff',
                      }}
                      onClick={() => handleBanUserFromReport(r.id, r.targetUid)}
                    >
                      停權該用戶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Banned Users */}
      {tab === 'banned' && (
        <section className="sec">
          <h2>已被停權的使用者名單</h2>
          <p className="sub">停權用戶將無法發布討論、留言、按讚或提交檢舉：</p>

          {bannedLoading ? (
            <p className="note" style={{ padding: 16 }}>
              載入停權名單中…
            </p>
          ) : bannedUsers.length === 0 ? (
            <p className="empty">目前無停權中的使用者。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {bannedUsers.map((u) => (
                <div
                  key={u.uid}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    background: 'var(--panel)',
                  }}
                >
                  <div>
                    <b>{u.displayName}</b> <span className="mono muted">({u.email})</span>
                    <div className="note mono">UID: {u.uid}</div>
                  </div>

                  <button
                    type="button"
                    className="btn line"
                    style={{ minHeight: 32, fontSize: 13 }}
                    onClick={() => handleUnbanUser(u.uid)}
                  >
                    解除停權
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
};
