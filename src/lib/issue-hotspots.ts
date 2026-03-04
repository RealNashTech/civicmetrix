import { db } from "@/lib/db";

type ClusterEntry = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  issues: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    department: string | null;
    program: string | null;
  }>;
};

export type IssueHotspotResult = {
  hotspotCount: number;
  topHotspots: ClusterEntry[];
  departmentHotspots: Array<{ department: string; count: number }>;
  programHotspots: Array<{ program: string; count: number }>;
};

export async function getIssueHotspots(organizationId: string): Promise<IssueHotspotResult> {
  const [issues, programs] = await Promise.all([
    db().issueReport.findMany({
      where: { organizationId },
      include: {
        department: {
          select: { id: true, name: true },
        },
        assignedDepartment: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db().program.findMany({
      where: { organizationId },
      select: { id: true, name: true, departmentId: true },
    }),
  ]);

  const clusterMap = new Map<string, ClusterEntry>();
  const deptMap = new Map<string, number>();
  const programMap = new Map<string, number>();

  for (const issue of issues) {
    const departmentName = issue.assignedDepartment?.name ?? issue.department?.name ?? "Unassigned";
    const scopedDepartmentId = issue.assignedDepartment?.id ?? issue.department?.id ?? null;
    deptMap.set(departmentName, (deptMap.get(departmentName) ?? 0) + 1);
    if (scopedDepartmentId) {
      const relatedPrograms = programs.filter((program) => program.departmentId === scopedDepartmentId);
      if (relatedPrograms.length > 0) {
        for (const program of relatedPrograms) {
          programMap.set(program.name, (programMap.get(program.name) ?? 0) + 1);
        }
      } else {
        programMap.set("Unassigned Program", (programMap.get("Unassigned Program") ?? 0) + 1);
      }
    } else {
      programMap.set("Unassigned Program", (programMap.get("Unassigned Program") ?? 0) + 1);
    }

    if (issue.latitude == null || issue.longitude == null) {
      continue;
    }

    const roundedLat = Number(issue.latitude.toFixed(2));
    const roundedLon = Number(issue.longitude.toFixed(2));
    const key = `${roundedLat},${roundedLon}`;

    const existing = clusterMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.issues.push({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        department: departmentName,
        program: null,
      });
      continue;
    }

    clusterMap.set(key, {
      key,
      latitude: roundedLat,
      longitude: roundedLon,
      count: 1,
      issues: [
        {
          id: issue.id,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          department: departmentName,
          program: null,
        },
      ],
    });
  }

  const topHotspots = [...clusterMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  const departmentHotspots = [...deptMap.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const programHotspots = [...programMap.entries()]
    .map(([program, count]) => ({ program, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    hotspotCount: clusterMap.size,
    topHotspots,
    departmentHotspots,
    programHotspots,
  };
}
