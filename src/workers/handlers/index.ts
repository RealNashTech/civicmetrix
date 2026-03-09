import { assistanceHandler } from "@/workers/handlers/assistance";
import { grantHandler } from "@/workers/handlers/grants";
import { infrastructureHandler } from "@/workers/handlers/infrastructure";
import { DatasetHandler } from "@/workers/handlers/types";

export const datasetHandlers: Record<string, DatasetHandler> = {
  AssistanceRecord: assistanceHandler,
  Grant: grantHandler,
  InfrastructureAsset: infrastructureHandler,
};
