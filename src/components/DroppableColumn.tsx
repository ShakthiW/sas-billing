"use client";

import { useDroppable } from "@dnd-kit/core";
import { useState, useEffect } from "react";

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumn = ({ id, children }: DroppableColumnProps) => {
  const [hasItems, setHasItems] = useState(false);

  // Check if the column has any items
  useEffect(() => {
    // Find all task elements that are direct children of this column
    const observer = new MutationObserver(() => {
      const columnElement = document.getElementById(`column-${id}`);
      if (columnElement) {
        const taskElements = columnElement.querySelectorAll('[data-task-id]');
        setHasItems(taskElements.length > 0);
      }
    });

    const columnElement = document.getElementById(`column-${id}`);
    if (columnElement) {
      observer.observe(columnElement, { childList: true, subtree: true });
      // Initial check
      const taskElements = columnElement.querySelectorAll('[data-task-id]');
      setHasItems(taskElements.length > 0);
    }

    return () => observer.disconnect();
  }, [id]);

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      accepts: ['task'],
      type: 'column',
      id,
      isEmpty: !hasItems
    }
  });

  return (
    <div
      ref={setNodeRef}
      style={{ touchAction: 'none' }}
      className={`w-64 min-h-[300px] p-2 ${isOver ? "border-blue-500 border-2 bg-blue-50" : "border border-gray-200"} rounded-md transition-colors relative ${!hasItems ? 'z-30' : 'z-20'}`}
      data-column-id={id}
      data-empty={!hasItems ? "true" : "false"}
      id={`column-${id}`}
    >
      {children}
    </div>
  );
};

export default DroppableColumn;
