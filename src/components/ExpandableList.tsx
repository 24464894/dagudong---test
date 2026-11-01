import React, { useState } from 'react';

interface ExpandableListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  limit?: number;
}

export const ExpandableList: React.FC<ExpandableListProps> = ({ items, renderItem, limit = 5 }) => {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? items : items.slice(0, limit);
  
  return (
    <div className="lst">
      {displayed.map(renderItem)}
      {items.length > limit && (
        <div style={{ borderBottom: 0, padding: '4px 0' }}>
          <button type="button" className="ht" onClick={() => setExpanded(!expanded)}>
            {expanded ? '收合' : `還有 ${items.length - limit} 筆`}
          </button>
        </div>
      )}
    </div>
  );
};
