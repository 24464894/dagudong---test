export interface CompanySignal {
  k: string;
  d: string;
  x: string;
}

export interface Company {
  c: string; // Stock code
  n: string; // Stock name
  m: string; // Market ('上市' | '上櫃')
  p?: number; // Pledge percentage (董監質押 %)
  s: CompanySignal[];
  i?: string; // Industry
  k: string[]; // List of active signal keys
}

export interface InsiderTrade {
  c: string;
  n: string;
  m: string;
  who: string;
  name: string;
  how: string;
  sell: number;
  hold: number;
  period: string;
  d: string;
}

export interface ControlEvent {
  c: string;
  n: string;
  m: string;
  d: string;
  t: string; // Type e.g. '公開收購', '股權轉讓', '董事改選'
  x: string; // Description
}

export interface WeeklyPledge {
  c: string;
  n: string;
  dv: number; // Delta volume (shares)
  r?: number; // Rate delta
  i?: number;
}

export interface DisposalEvent {
  c: string;
  n: string;
  from: string;
  to: string;
  why: string;
  d: string;
}

export interface FineEvent {
  c: string;
  n: string;
  d: string;
  src: string; // e.g. '金管會證期局'
  why: string;
  amt?: number; // In 萬元
  raw?: string;
}

export interface TradeEvent {
  c: string;
  n: string;
  k: string; // e.g. '全額交割'
}

export interface Dataset {
  today: string;
  pledgeDate: string;
  weekDate: string;
  cos: Company[];
  control: ControlEvent[];
  weekly: WeeklyPledge[];
  trade: TradeEvent[];
  disp: DisposalEvent[];
  fines: FineEvent[];
  insider: InsiderTrade[];
  ann: Record<string, number>;
  clause: [string, number][];
}

export interface FeedPost {
  id: string;
  cat: 'feed' | 'signals' | 'pledge' | 'control' | 'risk' | 'today' | 'insider';
  d: string;
  co: string[];
  rank: number;
  text: string;
  att?: React.ReactNode;
}

export interface TimelineEvent {
  k: 'insider' | 'control' | 'pledgeUp' | 'disposal' | 'fined' | 'trade';
  d: string;
  from?: string;
  to?: string;
  x: string;
  full?: string;
}

export interface UserNotifySettings {
  email: boolean;
  signals: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  watchlist: string[];
  saved: string[];
  notify: UserNotifySettings;
  plan: 'free' | 'pro';
  banned?: boolean;
  bio?: string;
  showWatchlist?: boolean;
  blocked?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface PublicUserProfile {
  uid: string;
  name: string;
  photo: string;
  bio: string;
  joinedAt: string;
  showWatchlist: boolean;
  watchlist: string[];
  postCount: number;
  likeCount: number;
}

export interface UserReportItem {
  id: string;
  targetUid: string;
  targetName: string;
  reporterUid: string;
  reporterName: string;
  reason: string;
  note?: string;
  createdAt: any;
  resolved?: boolean;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  postType?: '心得分享' | '提問' | '資料解讀' | '新聞討論';
  companyCode?: string;
  companyName?: string;
  companyCodes?: string[];
  quotePost?: {
    id: string;
    authorName: string;
    content: string;
  };
  content: string;
  official?: boolean;
  hidden?: boolean;
  likeCount?: number;
  commentCount?: number;
  reportCount?: number;
  createdAt: any;
  updatedAt?: any;
  editedAt?: any;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  hidden?: boolean;
  reportCount?: number;
  createdAt: any;
  editedAt?: any;
}

export interface FeedbackItem {
  id: string;
  postId: string;
  uid: string;
  userName?: string;
  note: string;
  createdAt: any;
  resolved?: boolean;
}

export interface ReportItem {
  id: string; // user uid
  reason: string;
  note?: string;
  createdAt: any;
}

export interface DailyFact {
  label: string;
  value: string;
}

export type DailySignalType =
  | 'insider'
  | 'control'
  | 'pledgeHigh'
  | 'pledgeUp'
  | 'trade'
  | 'disposal'
  | 'fined'
  | 'chain';

export interface DailyItem {
  id: string;
  rank: number;
  type: DailySignalType;
  c: string;
  n: string;
  m: string;
  title: string;
  body: string;
  facts: DailyFact[];
  src: string;
  d: string;
}

export interface DailyContent {
  date: string;
  generatedAt?: string | null;
  model?: string;
  summary: string;
  items: DailyItem[];
}
