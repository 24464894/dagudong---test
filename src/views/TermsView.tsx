import React from 'react';

export const TermsView: React.FC = () => {
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
          <b>使用條款</b>
          <div className="note">最後更新：2026 年 11 月 1 日</div>
        </div>
      </div>

      <section className="sec" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        <article style={{ lineHeight: 1.8 }}>
          <p>歡迎使用「大股東在幹嘛」（以下稱「本站」）。使用本站即表示你同意以下條款，請先閱讀。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>一、本站是什麼</h2>
          <p>本站整理政府資料開放平臺公開的上市櫃公司資訊，例如內部人持股轉讓申報、董監質押、經營權異動、處置與裁罰，改寫成白話方便閱讀。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>二、不是投資建議（重要）</h2>
          <ol style={{ paddingLeft: 20 }}>
            <li>本站<b>只整理公開資訊，不提供任何買賣建議</b>，也不是證券投資顧問事業。</li>
            <li>本站內容（包括白話日報、訊號標籤、排序、圖表）<b>不代表對任何股票好壞的判斷</b>，不能作為買賣依據。</li>
            <li>「申報轉讓」不代表一定會賣出；「質押」不代表一定有財務問題。資料只呈現發生了什麼。</li>
            <li>部分文章由 AI 依原始資料撰寫，本站會核對數字，但仍可能有錯誤或遺漏。<b>請以公開資訊觀測站等官方原始資料為準</b>。</li>
            <li>投資有風險，你應自行判斷並承擔投資結果。本站及站長對你依本站內容所做的任何決定與損失，不負賠償責任。</li>
          </ol>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>三、資料正確性</h2>
          <p>本站資料來自政府公開資料，每日更新一次，可能有延遲、缺漏或來源本身的錯誤。本站盡力確保正確，但不保證即時、完整或無誤。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>四、帳號</h2>
          <p>你可以用 Google 帳號登入，使用追蹤清單、收藏、討論區等功能。一人一個帳號，不得冒用他人身分。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>五、討論區規則</h2>
          <p><b>禁止行為</b>：報明牌、喊單、代操、投顧招攬、散布不實消息、廣告洗版、人身攻擊或違法內容。</p>
          <p>被 3 位以上用戶檢舉的內容會自動隱藏，站長可刪除違規內容或停用帳號。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>六、智慧財產權與內容</h2>
          <p>你發布的文字著作權仍屬於你，並授權本站顯示與保存。本站介面與原創內容屬於本站所有。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>七、其他條款</h2>
          <p>本站目前所有功能皆免費。本站依中華民國法律解釋，如有爭議以臺灣臺北地方法院為第一審管轄法院。</p>

          <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 24, marginBottom: 12 }}>八、聯絡我們</h2>
          <p>問題回報與申訴請寄信到：<b>smpss96219@gmail.com</b></p>
        </article>
      </section>
    </>
  );
};
