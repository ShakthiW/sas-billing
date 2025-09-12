"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import DroppableColumn from "./DroppableColumn";
import Column from "./Column";
import TaskCard from "./TaskCard";
import UniversalSearch from "./UniversalSearch";
import { Task, TasksData } from "@/app/types";
import {
  useJobs,
  useOptimisticJobUpdate,
  useUpdateJobStatus,
} from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const KanbanBoard = () => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filteredTasks, setFilteredTasks] = useState<TasksData | null>(null);

  // Use React Query for data fetching
  const { data: categorizedJobs, isLoading, error, refetch } = useJobs();
  const updateJobWithApproval = useOptimisticJobUpdate();
  const updateJobDirect = useUpdateJobStatus();

  // Transform the data into TasksData format - wrapped in useMemo to prevent re-creation
  const tasks: TasksData | null = useMemo(() => {
    return categorizedJobs
      ? {
          todo: categorizedJobs.todo.map((job: any) => ({
            ...job,
            column: "todo",
          })),
          inProgress: categorizedJobs.inProgress.map((job: any) => ({
            ...job,
            column: "inProgress",
          })),
          finished: categorizedJobs.finished.map((job: any) => ({
            ...job,
            column: "finished",
          })),
          delivered: categorizedJobs.delivered
            ? categorizedJobs.delivered.map((job: any) => ({
                ...job,
                column: "delivered",
              }))
            : [],
        }
      : null;
  }, [categorizedJobs]);

  // Get all jobs as a flat array for search
  const allJobs: Task[] = useMemo(() => {
    return tasks
      ? [
          ...tasks.todo,
          ...tasks.inProgress,
          ...tasks.finished,
          // Note: We're keeping delivered tasks available in the tasks data structure
          // but excluding them from the Kanban board display
        ]
      : [];
  }, [tasks]);

  // Use filtered tasks if available, otherwise use original tasks
  const displayTasks = filteredTasks || tasks;

  // Handle search filtering
  const handleSearchFilter = useCallback(
    (filteredJobs: Task[]) => {
      if (filteredJobs.length === allJobs.length) {
        // If all jobs are included, clear the filter
        setFilteredTasks(null);
        return;
      }

      if (filteredJobs.length === 0) {
        // If no jobs match, show empty columns
        setFilteredTasks({
          todo: [],
          inProgress: [],
          finished: [],
          delivered: [], // Keep this for type safety, won't be displayed
        });
        return;
      }

      // Categorize filtered jobs
      const categorizedFiltered: TasksData = {
        todo: filteredJobs.filter((job) => job.column === "todo"),
        inProgress: filteredJobs.filter((job) => job.column === "inProgress"),
        finished: filteredJobs.filter((job) => job.column === "finished"),
        delivered: filteredJobs.filter((job) => job.column === "delivered"),
      };

      setFilteredTasks(categorizedFiltered);
    },
    [allJobs.length]
  );

  const handleJobSelect = useCallback((job: Task) => {
    // Scroll to the job card or highlight it
    const element = document.getElementById(`task-${job.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
      }, 3000);
    }
  }, []);

  // Add loading skeleton component
  if (isLoading) {
    return (
      <div className="p-3 ipad:p-4">
        <div className="flex justify-between items-center mb-4 ipad:mb-6">
          <h1 className="text-xl ipad:text-2xl font-bold">
            Job Management Board
          </h1>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 ipad:grid-cols-3 gap-3 ipad:gap-4 lg:gap-4 w-full">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="bg-gray-100 p-4 rounded-md shadow min-h-[300px]"
            >
              <Skeleton className="h-6 w-24 mx-auto mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="bg-white p-4 rounded-lg shadow"
                  >
                    <Skeleton className="h-12 w-12 rounded-md mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 🛠 Helper function to find the correct container (column)
  // Helper function to find the correct container (column)
  const findContainer = (id: string | undefined) => {
    if (!id || !tasks) return null;

    // First check if it's a column ID directly
    if (tasks[id as keyof TasksData]) return id;

    // Then check if it's a task ID within a column
    return Object.keys(tasks).find((key) =>
      tasks[key as keyof TasksData].some((task) => task.id === id)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!tasks) return;
    const { active } = event;
    const task = Object.values(tasks)
      .flat()
      .find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!tasks) return;
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    // Convert UniqueIdentifier to string
    const activeId = String(active.id);
    const overId = String(over.id);

    // Find source column
    const sourceColumn = findContainer(activeId) as keyof typeof tasks;

    // Find target column - check if over.id is directly a column or contains a task
    let targetColumn = findContainer(overId) as keyof typeof tasks;

    // If targetColumn is null, check if overId is directly a column name
    if (!targetColumn && tasks[overId as keyof TasksData]) {
      targetColumn = overId as keyof typeof tasks;
    }

    if (!sourceColumn || !targetColumn) return;

    if (sourceColumn === targetColumn) {
      // Reorder within the same column - no server call needed for now
      return;
    } else {
      // Move to another column
      const sourceTasks = [...tasks[sourceColumn]];
      const movingTask = sourceTasks.find((task) => task.id === activeId);

      if (!movingTask) return;

      try {
        // No longer have delivered column, so this comparison is not needed
        const isFinishedToDelivered = false;

        // Only submit approval (via optimistic mutation) for finished -> delivered
        if (isFinishedToDelivered) {
          await updateJobWithApproval.mutateAsync({
            jobId: movingTask.id,
            newStatus: targetColumn,
          });
        } else {
          // Direct status update for other transitions
          await updateJobDirect.mutateAsync({
            jobId: movingTask.id,
            newStatus: targetColumn,
          });
        }
        console.log(`Job ${movingTask.id} moved to ${targetColumn}`);
      } catch (error) {
        console.error("Failed to update job status:", error);
      }
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Jobs
          </h2>
          <p className="text-red-600 mb-4">
            Failed to load job data. Please try again.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 ipad:p-3 lg:p-4 max-w-full mx-auto">
      {/* Header with Search and Update Controls */}
      <div className="flex flex-col gap-3 mb-4 ipad:mb-5 lg:mb-6">
        <div className="flex flex-col ipad:flex-row ipad:justify-between ipad:items-center gap-2">
          <h1 className="text-xl ipad:text-2xl font-bold">
            Job Management Board
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Universal Search Component */}
        <div className="w-full ipad:max-w-xl lg:max-w-2xl">
          <UniversalSearch
            jobs={allJobs}
            onJobSelect={handleJobSelect}
            onFilterChange={handleSearchFilter}
          />
        </div>

        {/* Search Results Summary */}
        {filteredTasks && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <span className="font-medium">Search Results:</span>
            {` ${
              [
                ...filteredTasks.todo,
                ...filteredTasks.inProgress,
                ...filteredTasks.finished,
              ].length
            } jobs found`}
            {filteredTasks.todo.length > 0 &&
              ` • ${filteredTasks.todo.length} To Do`}
            {filteredTasks.inProgress.length > 0 &&
              ` • ${filteredTasks.inProgress.length} In Progress`}
            {filteredTasks.finished.length > 0 &&
              ` • ${filteredTasks.finished.length} Finished`}
            <Button
              variant="link"
              size="sm"
              onClick={() => setFilteredTasks(null)}
              className="ml-2 p-0 h-auto text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Kanban Board - Optimized for MacBook Air */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 ipad:grid-cols-3 gap-3 ipad:gap-4 lg:gap-4 min-h-[500px] pb-4 w-full">
          {displayTasks &&
            Object.entries(displayTasks)
              .filter(([key]) => key !== "delivered")
              .map(([key, items]) => (
                <div key={key} className="min-h-[400px]">
                  <DroppableColumn id={key}>
                    <SortableContext
                      items={
                        items.length > 0
                          ? items.map((item: Task) => item.id)
                          : ["empty"]
                      }
                    >
                      <Column id={key} title={key} tasks={items} />
                    </SortableContext>
                  </DroppableColumn>
                </div>
              ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard {...activeTask} column={activeTask.column} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
