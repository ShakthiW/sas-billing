"use client";

import TaskCard from "./TaskCard";
import { SortableContext } from "@dnd-kit/sortable";

interface ColumnProps {
  id: string;
  title: string;
  tasks: {
    id: string;
    title: string;
    imageUrl?: string;
    subTasksCompleted: number;
    totalSubTasks: number;
    subTasks?: any[];
    customerName?: string;
    customerPhone?: string;
    damageRemarks?: string;
    damagePhotos?: string[];
  }[];
}

const columnNames: Record<string, string> = {
  todo: "To Do",
  inProgress: "In Progress",
  finished: "Finished",
  delivered: "Delivered",
};

const Column = ({ id, title, tasks }: ColumnProps) => {
  const isEmpty = !tasks || tasks.length === 0;

  // Always provide the column ID as a data attribute to help with drop target identification
  return (
    <div
      className="bg-gray-50 p-3 ipad:p-4 lg:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow min-h-[300px] ipad:min-h-[350px] lg:min-h-[400px] w-full h-full flex flex-col"
      data-column-id={id} // This is important for identifying the column in drag events
    >
      <h2 className="text-base ipad:text-lg lg:text-lg font-semibold text-center mb-3 ipad:mb-4 lg:mb-4 text-gray-700">
        {columnNames[id] || title}
      </h2>
      <div
        className="flex flex-col gap-2 ipad:gap-3 min-h-[200px] flex-1 overflow-y-auto max-h-[calc(100vh-280px)] ipad:max-h-[calc(100vh-300px)]"
        data-column-id={id} // Duplicate for safety
      >
        {!isEmpty ? (
          tasks.map((task) => (
            <TaskCard key={task.id} {...task} column={id} />
          ))
        ) : (
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-4 ipad:p-5 lg:p-6 text-center text-gray-400 flex-grow flex items-center justify-center bg-white/50"
            data-empty-column={id}
            data-column-id={id}
            data-droppable="true"
            style={{ minHeight: "120px" }}
          >
            <span className="pointer-events-none text-sm ipad:text-base lg:text-base">Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Column;
