import React from 'react';
import { FeedPost, Dataset } from '../types';
import { ago } from '../utils';
import { LogoIcon, EyeIcon, ChatIcon, ShareIcon, BookmarkIcon } from './Icons';
import { useToast } from './Toast';

interface FeedPostItemProps {
  post: FeedPost;
  data: Dataset;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isPinned?: boolean;
}

export const FeedPostItem: React.FC<FeedPostItemProps> = ({
  post,
  data,
  isSaved,
  onToggleSave,
  isPinned = false,
}) => {
  const { showToast } = useToast();

  const handleShare = async () => {
    const textToCopy = `${post.text}\n— 大股東在幹嘛`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        showToast('貼文文字已複製');
      } else {
        showToast('貼文文字：\n' + post.text);
      }
    } catch {
      showToast('貼文文字：\n' + post.text);
    }
  };

  // Render text and convert #company into links
  const renderTextWithHashtags = (text: string) => {
    const parts = text.split(/(#[^\s\n]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const nameOrCode = part.slice(1);
        // Find if this corresponds to a company code or name
        const match = data.cos.find((c) => c.n === nameOrCode || c.c === nameOrCode);
        const code = match ? match.c : post.co[0];
        if (code) {
          return (
            <a key={index} className="ht" href={`#co-${code}`}>
              {part}
            </a>
          );
        }
      }
      return part;
    });
  };

  return (
    <article className="post">
      <span className="av" aria-hidden="true">
        <LogoIcon size={36} />
      </span>
      <div style={{ minWidth: 0 }}>
        {isPinned && <div className="pin">置頂</div>}
        <div className="who">
          <b>大股東在幹嘛</b>
          <span className="muted">@dagudong · {ago(post.d, data.today)}</span>
        </div>
        <div className="txt">{renderTextWithHashtags(post.text)}</div>
        {post.att}
        <div className="acts">
          {post.co.length === 1 && (
            <a href={`#co-${post.co[0]}`} aria-label="看公司檔案">
              <EyeIcon />
              看公司
            </a>
          )}
          <button
            type="button"
            onClick={() => showToast('原型：留言功能尚未開放')}
            aria-label="留言"
          >
            <ChatIcon />
            留言
          </button>
          <button type="button" onClick={handleShare} aria-label="分享">
            <ShareIcon />
            分享
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(post.id)}
            aria-pressed={isSaved}
            aria-label="收藏"
          >
            <BookmarkIcon />
            {isSaved ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>
    </article>
  );
};
