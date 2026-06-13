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

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <div className="section-heading">
          <h1 id="page-title">{household.name} tasks</h1>
          <Link href={`/app/${household.id}/tasks/new`}>New task</Link>
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

                return (
                  <tr key={task.id}>
                    <td>
                      <Link href={`/app/${household.id}/tasks/${task.id}`}>
                        {task.title}
                      </Link>
                    </td>
                    <td>{formatTaskDate(task.due_date)}</td>
                    <td>{task.assignee?.display_name ?? "Unassigned"}</td>
                    <td>{formatTaskPriority(task.priority)}</td>
                    <td>{formatTaskStatus(task.status)}</td>
                    <td>
                      {isOpenTaskStatus(task.status) ? (
                        <form action={completeTask}>
                          <button type="submit">Complete</button>
                        </form>
                      ) : (
                        <span>{formatTaskStatus(task.status)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No tasks yet.</p>
        )}
      </section>
    </main>
  );
}
