import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { TaskForm } from "@/components/TaskForm";
import { getFormMessage } from "@/lib/forms/messages";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import { createTaskAction } from "@/server/tasks/actions";
import { listTaskFormMembers } from "@/server/tasks/service";

type NewTaskPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function NewTaskPage({
  params,
  searchParams,
}: NewTaskPageProps) {
  const { householdId } = await params;
  const [household, members] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listTaskFormMembers(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const createTask = createTaskAction.bind(null, household.id);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/tasks`}>Back to tasks</Link>
        </p>
        <h1 id="page-title">New task</h1>
        <FormMessage message={message} />
        <TaskForm
          action={createTask}
          members={members}
          submitLabel="Create task"
        />
      </section>
    </main>
  );
}
