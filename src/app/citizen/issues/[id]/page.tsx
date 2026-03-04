import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { requireCitizenSession } from "@/lib/citizen-auth";
import { db } from "@/lib/db";

import { addCitizenComment } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CitizenIssuePage({ params }: Props) {
  const citizen = await requireCitizenSession();
  const resolvedParams = await params;

  const issue = await db().issueReport.findFirst({
    where: {
      id: resolvedParams.id,
      citizenId: citizen.citizenId,
    },
    include: {
      department: {
        select: { name: true },
      },
      assignedDepartment: {
        select: { name: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!issue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card title="Issue Detail">
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Title:</span> {issue.title}
          </p>
          <p>
            <span className="font-semibold">Description:</span> {issue.description}
          </p>
          <p>
            <span className="font-semibold">Status:</span> {issue.status.replace("_", " ")}
          </p>
          <p>
            <span className="font-semibold">Department:</span>{" "}
            {issue.assignedDepartment?.name ?? issue.department?.name ?? "-"}
          </p>
          <p>
            <span className="font-semibold">Created:</span>{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(issue.createdAt)}
          </p>
          <p>
            <span className="font-semibold">Resolution:</span>{" "}
            {issue.resolvedAt
              ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(issue.resolvedAt)
              : "Not resolved"}
          </p>
          {issue.photoUrl ? (
            <div>
              <p className="font-semibold">Photo:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={issue.photoUrl} alt={issue.title} className="mt-2 max-h-72 rounded-md border border-slate-200 object-cover" />
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="Comment Thread">
        <div className="space-y-3">
          {issue.comments.length > 0 ? (
            issue.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-800">{comment.authorType}</p>
                <p className="text-slate-700">{comment.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(comment.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}

          <form
            action={async (formData) => {
              "use server";
              await addCitizenComment({
                issueId: issue.id,
                message: String(formData.get("message") ?? ""),
              });
            }}
            className="space-y-2 rounded-md border border-slate-200 p-3"
          >
            <textarea
              name="message"
              required
              placeholder="Add a comment or clarification"
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add Comment
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
