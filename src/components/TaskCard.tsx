"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "@/components/RemoteImage";
import TaskUpdateModal from "@/components/TaskUpdateModal";
import { Task as TaskType } from "@/app/types";

interface TaskCardProps extends TaskType { }

const TaskCard = ({
  id,
  title,
  subTasksCompleted,
  totalSubTasks,
  column,
  subTasks,
  imageUrl,
  damageRemarks,
  damagePhotos,
}: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: "task", task: { id, column } },
  });

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  const style = { transform: CSS.Transform.toString(transform), transition };
  const percent =
    totalSubTasks > 0
      ? Math.round((subTasksCompleted / totalSubTasks) * 100)
      : 0;

  const taskForUpdate = {
    id,
    title,
    imageUrl,
    subTasksCompleted,
    totalSubTasks,
    column,
    subTasks,
    damageRemarks,
    damagePhotos,
  } as TaskType;

  return (
    <Card
      ref={setNodeRef}
      style={{ ...style, position: "relative", zIndex: 10 }}
      className={`p-3 ipad:p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${isDragging ? "opacity-50 shadow-lg ring ring-blue-400" : ""
        }`}
      data-task-id={id}
      data-column={column}
      id={`task-${id}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <CardContent className="p-0 space-y-2 ipad:space-y-3">
          <h3 className="text-sm ipad:text-base font-semibold truncate">{title}</h3>
          <div className="space-y-1 ipad:space-y-2">
            <div className="flex items-center justify-between text-xs ipad:text-sm text-gray-600">
              <span>
                {subTasksCompleted}/{totalSubTasks} completed
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-1.5 ipad:h-2" />
          </div>
        </CardContent>
      </div>
      <CardFooter className="pt-3 ipad:pt-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-1/2 ipad:h-9 ipad:text-sm"
          onClick={() => setIsViewOpen(true)}
        >
          View
        </Button>
        <Button
          size="sm"
          className="w-1/2"
          onClick={() => setIsUpdateOpen(true)}
        >
          Update
        </Button>
      </CardFooter>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>Overview of the selected job</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {imageUrl && (
              <div className="relative w-full h-48 rounded-md overflow-hidden border">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle No</span>
                <span className="font-medium">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium capitalize">{column}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion</span>
                <span className="font-medium">
                  {subTasksCompleted}/{totalSubTasks} ({percent}%)
                </span>
              </div>
            </div>

            {/* Remarks */}
            {!!damageRemarks && (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Remarks</h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {damageRemarks}
                </p>
              </div>
            )}

            {/* Remarks Images */}
            {Array.isArray((taskForUpdate as any).damagePhotos) &&
              (taskForUpdate as any).damagePhotos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Remarks Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(taskForUpdate as any).damagePhotos.map(
                      (src: string, idx: number) => (
                        <div
                          key={idx}
                          className="relative w-full h-24 rounded overflow-hidden border"
                        >
                          <Image
                            src={src}
                            alt={`Remark ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {subTasks && subTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Subtasks</h4>
                <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
                  {subTasks.map((st) => (
                    <div
                      key={st.subtaskID}
                      className="flex items-center justify-between p-2 text-sm"
                    >
                      <div className="truncate">
                        {st.taskType === "service"
                          ? `Service: ${st.serviceType}`
                          : `Part: ${st.partsType}${st.partsBrand ? ` (${st.partsBrand})` : ""
                          }`}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${st.isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {st.isCompleted ? "Done" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Modal */}
      <TaskUpdateModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        task={taskForUpdate}
      />
    </Card>
  );
};

export default TaskCard;
