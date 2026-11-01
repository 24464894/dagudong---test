export const DATA_URL = 'https://raw.githubusercontent.com/24464894/dagudong/main/data.json';
export const CONTENT_URL = 'https://raw.githubusercontent.com/24464894/dagudong/main/content.json';
export const DIFF_URL = 'https://raw.githubusercontent.com/24464894/dagudong/main/diff.json';
export const HISTORY_CONTENT_URL = 'https://raw.githubusercontent.com/24464894/dagudong/main/history/content-';

export const SIG: Record<string, [string, string]> = {
  control: ['換老闆', 'hi'],
  pledgeHigh: ['董監質押過半', 'hi'],
  pledgeUp: ['本週多押', 'mid'],
  trade: ['改全額交割', 'hi'],
  disposal: ['被處置', 'hi'],
  fined: ['被罰', 'mid'],
  insider: ['大股東要賣', 'y'],
  chain: ['連環訊號', 'hi'],
};

export const ORDER = ['insider', 'control', 'pledgeHigh', 'pledgeUp', 'trade', 'disposal', 'fined'];

export const KIND: Record<string, [string, string]> = {
  insider: ['大股東申報賣股', 'insider'],
  control: ['經營權易主', 'control'],
  pledgeUp: ['本週多押', 'pledgeUp'],
  disposal: ['處置期間', 'disposal'],
  fined: ['被罰', 'fined'],
  trade: ['全額交割', 'trade'],
};

export const CLAUSE_MAP: Record<string, string> = {
  '20': '取得或處分資產',
  '31': '董事會通過財報',
  '51': '其他',
  '12': '法說會',
  '11': '子公司重要決議',
  '53': '股價異常說明',
  '6': '董事會決議',
  '24': '私募',
  '8': '主管人事異動',
  '22': '背書保證',
};

export const DEFAULT_WL = ['2460', '3041', '3040', '2528', '2338', '3259', '1589', '2330', '2515', '5205'];

export const FOOTER_DISCLAIMER =
  '資料來源：政府資料開放平臺（證交所、櫃買中心、集保結算所、金管會）。本站只整理公開資訊，不提供買賣建議。';
