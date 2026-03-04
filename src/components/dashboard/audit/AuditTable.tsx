type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
};

export default function AuditTable({ logs }: { logs: AuditRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="p-3">Time</th>
            <th className="p-3">Action</th>
            <th className="p-3">Entity</th>
            <th className="p-3">Entity ID</th>
            <th className="p-3">User</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="p-3 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="p-3">{log.action}</td>
              <td className="p-3">{log.entityType}</td>
              <td className="p-3 font-mono text-xs">{log.entityId}</td>
              <td className="p-3 font-mono text-xs">{log.userId}</td>
            </tr>
          ))}

          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-muted-foreground">
                No audit entries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
