import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DocumentsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const documents = await db().document.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card title="Upload Document">
        <form
          action="/api/documents/upload"
          method="post"
          encType="multipart/form-data"
          className="grid gap-3 md:grid-cols-2"
        >
          <input
            name="name"
            required
            placeholder="Document name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="type"
            required
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select type
            </option>
            <option value="GrantReport">GrantReport</option>
            <option value="ProgramDocument">ProgramDocument</option>
            <option value="CouncilPacket">CouncilPacket</option>
            <option value="AuditEvidence">AuditEvidence</option>
          </select>
          <input
            name="entityType"
            placeholder="Linked entity type (optional)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="entityId"
            placeholder="Linked entity id (optional)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="file"
            type="file"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Upload
            </button>
          </div>
        </form>
      </Card>

      <Card title="Documents">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Document</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Linked Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Upload Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {documents.length > 0 ? (
                documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-3 text-slate-800">
                      <a href={`/api/documents/${document.id}`} className="text-blue-700 hover:underline" target="_blank">
                        {document.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{document.type}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {document.entityType && document.entityId
                        ? `${document.entityType}:${document.entityId}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(document.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={4}>
                    No documents uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
