"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import { taskCommentFormSchema, taskFormSchema } from "@/lib/validation/task";
import {
  archiveTaskForCurrentUser,
  completeTaskForCurrentUser,
  createTaskCommentForCurrentUser,
  createTaskForCurrentUser,
  updateTaskForCurrentUser,
} from "@/server/tasks/service";

export async function createTaskAction(
  householdId: string,
  formData: FormData,
) {
  const parsed = taskFormSchema.safeParse(readTaskFormData(formData));

  if (!parsed.success) {
    redirect(`/app/${householdId}/tasks/new?error=invalid-task`);
  }

  let taskId: string;

  try {
    const task = await createTaskForCurrentUser(householdId, parsed.data);
    taskId = task.id;
  } catch {
    redirect(`/app/${householdId}/tasks/new?error=create-task-failed`);
  }

  redirect(`/app/${householdId}/tasks/${taskId}?status=task-created`);
}

export async function updateTaskAction(
  householdId: string,
  taskId: string,
  formData: FormData,
) {
  const parsed = taskFormSchema.safeParse(readTaskFormData(formData));

  if (!parsed.success) {
    redirect(`/app/${householdId}/tasks/${taskId}?error=invalid-task`);
  }

  try {
    await updateTaskForCurrentUser(householdId, taskId, parsed.data);
  } catch {
    redirect(`/app/${householdId}/tasks/${taskId}?error=update-task-failed`);
  }

  redirect(`/app/${householdId}/tasks/${taskId}?status=task-updated`);
}

export async function completeTaskAction(
  householdId: string,
  taskId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await completeTaskForCurrentUser(householdId, taskId);
  } catch {
    redirect(`/app/${householdId}/tasks?error=complete-task-failed`);
  }

  redirect(`/app/${householdId}/tasks?status=task-completed`);
}

export async function archiveTaskAction(
  householdId: string,
  taskId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await archiveTaskForCurrentUser(householdId, taskId);
  } catch {
    redirect(`/app/${householdId}/tasks/${taskId}?error=archive-task-failed`);
  }

  redirect(`/app/${householdId}/tasks?status=task-archived`);
}

export async function createTaskCommentAction(
  householdId: string,
  taskId: string,
  formData: FormData,
) {
  const parsed = taskCommentFormSchema.safeParse({
    body: getFormString(formData, "body"),
  });

  if (!parsed.success) {
    redirect(`/app/${householdId}/tasks/${taskId}?error=invalid-task-comment`);
  }

  try {
    await createTaskCommentForCurrentUser(householdId, taskId, parsed.data);
  } catch {
    redirect(
      `/app/${householdId}/tasks/${taskId}?error=create-task-comment-failed`,
    );
  }

  redirect(`/app/${householdId}/tasks/${taskId}?status=task-comment-created`);
}

function readTaskFormData(formData: FormData) {
  return {
    assignedTo: getFormString(formData, "assignedTo"),
    description: getFormString(formData, "description"),
    dueDate: getFormString(formData, "dueDate"),
    priority: getFormString(formData, "priority", "normal"),
    recurrenceDayOfMonth: getFormString(formData, "recurrenceDayOfMonth", "1"),
    recurrenceInterval: getFormString(formData, "recurrenceInterval", "1"),
    recurrenceMonth: getFormString(formData, "recurrenceMonth", "1"),
    recurrencePreset: getFormString(formData, "recurrencePreset", "none"),
    recurrenceWeekdays: formData
      .getAll("recurrenceWeekdays")
      .filter((value): value is string => typeof value === "string"),
    status: getFormString(formData, "status", "open"),
    title: getFormString(formData, "title"),
  };
}
