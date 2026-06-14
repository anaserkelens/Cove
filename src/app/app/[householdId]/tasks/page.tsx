import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import {
  formatTaskDate,
  formatTaskPriority,
  formatTaskStatus,
} from "@/lib/tasks/display";
import { isOpenTaskStatus } from "@/lib/validation/task";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import { completeTaskAction } from "@/server/tasks/actions";
import { listTasksForHousehold } from "@/server/tasks/service";

type TasksPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function TasksPage({
  params,
  searchParams,
}: TasksPageProps) {
  const { householdId } = await params;
  const [household, tasks] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listTasksForHousehold(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);

  const openCount = tasks.filter((task) => isOpenTaskStatus(task.status)).length;

  return (
    <main className="app-main" aria-labelledby="page-title">
      <div className="page-head">
        <div className="page-head-text">
          <p className="eyebrow">Tasks &amp; chores</p>
          <h1 id="page-title">Tasks</h1>
          <p>
            {tasks.length > 0
              ? `${openCount} open of ${tasks.length} in ${household.name}.`
              : `Nothing on the list for ${household.name} yet.`}
          </p>
        </div>
        <Link href={`/app/${household.id}/tasks/new`} className="btn">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            width={18}
            height={18}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New task
        </Link>
      </div>

      <FormMessage message={message} />

      {tasks.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Due</th>
              <th scope="col">Assigned to</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const completeTask = completeTaskAction.bind(
                null,
                household.id,
                task.id,
              );
              const open = isOpenTaskStatus(task.status);

              return (
                <tr key={task.id}>
                  <td>
                    <Link href={`/app/${household.id}/tasks/${task.id}`}>
                      {task.title}
                    </Link>
                  </td>
                  <td>{formatTaskDate(task.due_date)}</td>
                  <td>{task.assignee?.display_name ?? "Unassigned"}</td>
                  <td>
                    <span className="pill">
                      {formatTaskPriority(task.priority)}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${open ? "pill-accent" : "pill-success"}`}>
                      {formatTaskStatus(task.status)}
                    </span>
                  </td>
                  <td>
                    {open ? (
                      <form action={completeTask}>
                        <button type="submit" className="btn-sm">
                          Complete
                        </button>
                      </form>
                    ) : (
                      <span className="pill pill-success">
                        {formatTaskStatus(task.status)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="empty">
          <span className="empty-ico">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.85}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 3 4 10l-2-2" />
              <path d="m21 6-9 9-2-2" />
              <path d="M11 18H4" />
              <path d="M21 13v6" />
            </svg>
          </span>
          <p>No tasks yet — add the first chore to get the household rolling.</p>
          <Link href={`/app/${household.id}/tasks/new`} className="btn">
            New task
          </Link>
        </div>
      )}
    </main>
  );
}
