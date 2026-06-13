import {
  addDaysToDateOnly,
  getDateOnlyInTimeZone,
} from "@/lib/dates/date-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ActivityEvent,
  Task,
  TaskComment,
  TaskCommentFormValues,
  TaskFormValues,
} from "@/lib/validation/task";
import { serializeTaskFormRecurrence } from "@/lib/validation/task";
import {
  getHouseholdForCurrentUser,
  listHouseholdMembers,
} from "@/server/households/service";

type ProfileSummary = {
  display_name: string | null;
  id: string;
};

export type TaskListItem = Task & {
  assignee: ProfileSummary | null;
};

export type TaskCommentWithAuthor = TaskComment & {
  author: ProfileSummary | null;
};

export type TaskDashboardSummary = {
  comingUp: TaskListItem[];
  dueToday: TaskListItem[];
  overdue: TaskListItem[];
  today: string;
};

export class TaskServiceError extends Error {
  constructor(message = "Task operation failed.") {
    super(message);
    this.name = "TaskServiceError";
  }
}

const taskSelect =
  "archived_at, assigned_to, category_id, completed_at, completed_by, created_at, created_by, description, due_at, due_date, household_id, id, next_occurrence_date, priority, recurrence_rule, recurrence_source_id, recurrence_timezone, status, title, updated_at";

export async function listTasksForHousehold(
  householdId: string,
): Promise<TaskListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new TaskServiceError();
  }

  return decorateTasksWithAssignees(data ?? []);
}

export async function getTaskForCurrentUser(
  householdId: string,
  taskId: string,
): Promise<TaskListItem> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskSelect)
    .eq("household_id", householdId)
    .eq("id", taskId)
    .is("archived_at", null)
    .single();

  if (error || !data) {
    throw new TaskServiceError();
  }

  const [task] = await decorateTasksWithAssignees([data]);
  return task;
}

export async function createTaskForCurrentUser(
  householdId: string,
  values: TaskFormValues,
): Promise<Task> {
  const household = await getHouseholdForCurrentUser(householdId);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_task", {
    target_household_id: household.id,
    task_assigned_to: values.assignedTo,
    task_description: values.description,
    task_due_date: values.dueDate,
    task_priority: values.priority,
    task_recurrence_rule: serializeTaskFormRecurrence(values),
    task_recurrence_timezone: values.recurrenceRule ? household.timezone : null,
    task_title: values.title,
  });

  if (error || !data) {
    throw new TaskServiceError();
  }

  return data;
}

export async function updateTaskForCurrentUser(
  householdId: string,
  taskId: string,
  values: TaskFormValues,
): Promise<Task> {
  const [household] = await Promise.all([
    getHouseholdForCurrentUser(householdId),
    getTaskForCurrentUser(householdId, taskId),
  ]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("update_task", {
    target_task_id: taskId,
    task_assigned_to: values.assignedTo,
    task_description: values.description,
    task_due_date: values.dueDate,
    task_priority: values.priority,
    task_recurrence_rule: serializeTaskFormRecurrence(values),
    task_recurrence_timezone: values.recurrenceRule ? household.timezone : null,
    task_status: values.status,
    task_title: values.title,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new TaskServiceError();
  }

  return data;
}

export async function completeTaskForCurrentUser(
  householdId: string,
  taskId: string,
): Promise<Task> {
  await getTaskForCurrentUser(householdId, taskId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_task", {
    target_task_id: taskId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new TaskServiceError();
  }

  return data;
}

export async function archiveTaskForCurrentUser(
  householdId: string,
  taskId: string,
): Promise<Task> {
  await getTaskForCurrentUser(householdId, taskId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_task", {
    target_task_id: taskId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new TaskServiceError();
  }

  return data;
}

export async function listTaskCommentsForCurrentUser(
  householdId: string,
  taskId: string,
): Promise<TaskCommentWithAuthor[]> {
  await getTaskForCurrentUser(householdId, taskId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select(
      "author_id, body, created_at, deleted_at, household_id, id, task_id, updated_at",
    )
    .eq("household_id", householdId)
    .eq("task_id", taskId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new TaskServiceError();
  }

  return decorateCommentsWithAuthors(data ?? []);
}

export async function createTaskCommentForCurrentUser(
  householdId: string,
  taskId: string,
  values: TaskCommentFormValues,
): Promise<TaskComment> {
  await getTaskForCurrentUser(householdId, taskId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_task_comment", {
    comment_body: values.body,
    target_task_id: taskId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new TaskServiceError();
  }

  return data;
}

export async function getTaskDashboardSummary(
  householdId: string,
): Promise<TaskDashboardSummary> {
  const household = await getHouseholdForCurrentUser(householdId);
  const today = getDateOnlyInTimeZone(new Date(), household.timezone);
  const comingUpEnd = addDaysToDateOnly(today, 7);
  const supabase = await createClient();

  const [dueTodayResult, overdueResult, comingUpResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(taskSelect)
      .eq("household_id", householdId)
      .is("archived_at", null)
      .in("status", ["open", "in_progress"])
      .eq("due_date", today)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select(taskSelect)
      .eq("household_id", householdId)
      .is("archived_at", null)
      .in("status", ["open", "in_progress"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("tasks")
      .select(taskSelect)
      .eq("household_id", householdId)
      .is("archived_at", null)
      .in("status", ["open", "in_progress"])
      .gt("due_date", today)
      .lte("due_date", comingUpEnd)
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  if (dueTodayResult.error || overdueResult.error || comingUpResult.error) {
    throw new TaskServiceError();
  }

  return {
    comingUp: await decorateTasksWithAssignees(comingUpResult.data ?? []),
    dueToday: await decorateTasksWithAssignees(dueTodayResult.data ?? []),
    overdue: await decorateTasksWithAssignees(overdueResult.data ?? []),
    today,
  };
}

export async function listRecentActivityForHousehold(
  householdId: string,
): Promise<ActivityEvent[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      "action, actor_id, created_at, entity_id, entity_type, household_id, id, metadata, summary",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new TaskServiceError();
  }

  return data ?? [];
}

export async function listTaskFormMembers(householdId: string) {
  return listHouseholdMembers(householdId);
}

async function decorateTasksWithAssignees(
  tasks: Task[],
): Promise<TaskListItem[]> {
  const profileIds = [
    ...new Set(
      tasks.flatMap((task) => (task.assigned_to ? [task.assigned_to] : [])),
    ),
  ];

  if (profileIds.length === 0) {
    return tasks.map((task) => ({ ...task, assignee: null }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return tasks.map((task) => ({
    ...task,
    assignee: task.assigned_to
      ? (profiles.get(task.assigned_to) ?? null)
      : null,
  }));
}

async function decorateCommentsWithAuthors(
  comments: TaskComment[],
): Promise<TaskCommentWithAuthor[]> {
  const authorIds = [...new Set(comments.map((comment) => comment.author_id))];
  const profiles = await getProfilesByIds(authorIds);

  return comments.map((comment) => ({
    ...comment,
    author: profiles.get(comment.author_id) ?? null,
  }));
}

async function getProfilesByIds(
  profileIds: string[],
): Promise<Map<string, ProfileSummary>> {
  if (profileIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, id")
    .in("id", profileIds);

  if (error) {
    throw new TaskServiceError();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile] as const));
}
