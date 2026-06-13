import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { TaskForm } from "@/components/TaskForm";
import { getFormMessage } from "@/lib/forms/messages";
import { formatTaskDate, formatTaskStatus } from "@/lib/tasks/display";
import { isOpenTaskStatus } from "@/lib/validation/task";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import {
  archiveTaskAction,
  completeTaskAction,
  createTaskCommentAction,
  updateTaskAction,
} from "@/server/tasks/actions";
import {
  getTaskForCurrentUser,
  listTaskCommentsForCurrentUser,
  listTaskFormMembers,
} from "@/server/tasks/service";

type TaskPageProps = {
  params: Promise<{
    householdId: string;
    taskId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function TaskPage({
  params,
  searchParams,
}: TaskPageProps) {
  const { householdId, taskId } = await params;
  const [household, task, members, comments] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    getTaskForCurrentUser(householdId, taskId).catch(() => notFound()),
    listTaskFormMembers(householdId).catch(() => notFound()),
    listTaskCommentsForCurrentUser(householdId, taskId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const updateTask = updateTaskAction.bind(null, household.id, task.id);
  const completeTask = completeTaskAction.bind(null, household.id, task.id);
  const archiveTask = archiveTaskAction.bind(null, household.id, task.id);
  const createComment = createTaskCommentAction.bind(
    null,
    household.id,
    task.id,
  );

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/tasks`}>Back to tasks</Link>
        </p>
        <p className="eyebrow">{formatTaskStatus(task.status)}</p>
        <h1 id="page-title">{task.title}</h1>
        <FormMessage message={message} />
        <p>Due: {formatTaskDate(task.due_date)}</p>
        <p>Assigned to: {task.assignee?.display_name ?? "Unassigned"}</p>

        <div className="inline-actions">
          {isOpenTaskStatus(task.status) ? (
            <form action={completeTask}>
              <button type="submit">Complete</button>
            </form>
          ) : null}
          <form action={archiveTask}>
            <button type="submit">Archive</button>
          </form>
        </div>
      </section>

      <section className="stack section-spaced" aria-labelledby="edit-title">
        <h2 id="edit-title">Edit task</h2>
        {task.status === "completed" ? (
          <p>Completed tasks cannot be edited.</p>
        ) : (
          <TaskForm
            action={updateTask}
            members={members}
            submitLabel="Save task"
            task={task}
          />
        )}
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="comments-title"
      >
        <h2 id="comments-title">Comments</h2>
        {comments.length > 0 ? (
          <ul className="plain-list">
            {comments.map((comment) => (
              <li key={comment.id}>
                <span>{comment.body}</span>
                <span>
                  {comment.author?.display_name ?? "Household member"} -{" "}
                  {formatDateTime(comment.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No comments yet.</p>
        )}

        <form className="form-grid" action={createComment}>
          <label htmlFor="body">Add comment</label>
          <textarea id="body" name="body" required maxLength={2000} rows={3} />
          <button type="submit">Add comment</button>
        </form>
      </section>
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
