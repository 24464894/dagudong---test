import React from 'react';

export const PrivacyView: React.FC = () => {
  return (
    <>
      <div className="feedhead" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}>
        <button
          type="button"
          onClick={() => history.back()}
          className="btn line"
          style={{ minHeight: 36, width: 36, padding: 0 }}
          aria-label="回上一頁"
        >
          ←
        </button>
        <div>
          <b>隱私權政策</b>
          <div className="note">最後更新：2026 年 11 月 1 日</div>
        </div>
      </div>

      <section className="sec" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        <article style={{ lineHeight: 1.8 }}>
          <p>「大股東在幹嘛」（以下稱「本站」）重視你的隱私。這份政策說明本站收集哪些資料、怎麼用、存在哪裡，以及你有哪些權利。本政策依中華民國《個人資料保護法》訂定。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>一、我們收集哪些資料</h2>
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>情況</th>
                  <th style={{ padding: '8px' }}>收集的資料</th>
                  <th style={{ padding: '8px' }}>用途</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px' }}>只是瀏覽</td>
                  <td style={{ padding: '8px' }}>不收集可識別個人的資料</td>
                  <td style={{ padding: '8px' }}>—</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px' }}>用 Google 帳號登入</td>
                  <td style={{ padding: '8px' }}>Google 提供的名稱、email、大頭貼網址、帳號識別碼（UID）</td>
                  <td style={{ padding: '8px' }}>辨識你的帳號、顯示在你發的文章旁</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px' }}>使用個人功能</td>
                  <td style={{ padding: '8px' }}>追蹤清單、收藏的貼文、通知設定、方案</td>
                  <td style={{ padding: '8px' }}>讓你換裝置也能看到自己的設定</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px' }}>在討論區發文、留言、按讚、檢舉</td>
                  <td style={{ padding: '8px' }}>內容、時間、與你帳號的對應</td>
                  <td style={{ padding: '8px' }}>顯示討論內容、處理檢舉</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>瀏覽器本機儲存</td>
                  <td style={{ padding: '8px' }}>未登入時的追蹤清單、介面設定</td>
                  <td style={{ padding: '8px' }}>記住你的偏好</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>本站<b>不會</b>取得你的 Google 密碼，也<b>不會</b>收集身分證字號、電話、地址、銀行或信用卡資料。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>二、資料存在哪裡</h2>
          <ul style={{ paddingLeft: 20 }}>
            <li>帳號與討論區資料存放於 Google Firebase（Firebase Authentication、Cloud Firestore）。</li>
            <li>本站公開資料（公司訊號、白話日報）來自政府資料開放平臺，不含任何用戶個人資料。</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>三、資料怎麼使用</h2>
          <ul style={{ paddingLeft: 20 }}>
            <li>只用於提供本站功能、維護討論區秩序、處理檢舉與違規。</li>
            <li><b>不會出售、出租或交換</b>你的個人資料給第三方。</li>
            <li>除非法律要求，不會提供給他人。</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>四、公開顯示的資訊</h2>
          <p>你在討論區發文或留言時，<b>名稱、大頭貼、內容、時間會公開顯示</b>給所有訪客。請不要在貼文中留下自己或他人的個人資料。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>五、保存期間</h2>
          <ul style={{ paddingLeft: 20 }}>
            <li>帳號資料保存到你刪除帳號為止。</li>
            <li>你刪除帳號後，個人設定會在 30 天內刪除；你發過的貼文和留言會改為匿名顯示「已刪除的用戶」。</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>六、你的權利</h2>
          <p>依《個人資料保護法》第 3 條，你可以查詢、閱覽、補充、更正、停止處理或請求刪除你的資料。大部分可以在「我的 → 帳號」直接操作。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>七、Cookie 與第三方服務</h2>
          <p>本站使用 Google Firebase 提供登入與資料庫服務：<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--mid)' }}>Google 隱私權政策</a>。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>八、聯絡我們</h2>
          <p>隱私權相關問題請寄信到：<b>smpss96219@gmail.com</b></p>
        </article>
      </section>
    </>
  );
};
