import React, { useState } from 'react';

export const ExpandableList: React.FC<{ items: any[], renderItem: (item: any, index: number) => React.ReactNode }> = ({ items, renderItem }) => {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? items : items.slice(0, 5);
  return (
    <div className="lst">
      {displayed.map(renderItem)}
      {items.length > 5 && (
        <div>
          <button type="button" className="ht" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收合' : `還有 ${items.length - 5} 檔`}
          </button>
        </div>
      )}
    </div>
  );
};
