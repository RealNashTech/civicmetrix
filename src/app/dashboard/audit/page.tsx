import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AuditPage() {

  const session = await auth();
  const user = session?.user;

  if (!user?.organizationId) notFound();
  if (user.role !== "ADMIN") notFound();

  const logs = await db().auditLog.findMany({
    where: {
      organizationId: user.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <div className="p-8 space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Organization activity history.
        </p>
      </div>

      <table className="w-full border rounded-lg overflow-hidden text-sm">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Action</th>
            <th className="p-3 text-left">Entity</th>
            <th className="p-3 text-left">Entity ID</th>
            <th className="p-3 text-left">User</th>
            <th className="p-3 text-left">Date</th>
          </tr>
        </thead>

        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="p-3">{log.action}</td>
              <td className="p-3">{log.entityType}</td>
              <td className="p-3">{log.entityId}</td>
              <td className="p-3">{log.userId}</td>
              <td className="p-3">
                {new Date(log.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}
