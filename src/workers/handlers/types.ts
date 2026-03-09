export interface DatasetHandler {
  persist(params: {
    prisma: any;
    organizationId: string;
    rows: any[];
    importSessionId?: string;
  }): Promise<{
    successCount: number;
    failureCount: number;
  }>;
}
