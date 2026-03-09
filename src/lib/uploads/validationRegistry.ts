export type UploadFieldType = "string" | "number" | "date";

export type FieldValidationRule = {
  required?: boolean;
  type?: UploadFieldType;
  min?: number;
  max?: number;
};

export type DatasetValidationRules = Record<string, Record<string, FieldValidationRule>>;

export const validationRegistry: DatasetValidationRules = {
  InfrastructureAsset: {
    assetName: {
      required: true,
      type: "string",
    },
    conditionScore: {
      required: true,
      type: "number",
      min: 0,
      max: 100,
    },
    inspectionDate: {
      type: "date",
    },
    department: {
      type: "string",
    },
  },
  Grant: {
    name: {
      required: true,
      type: "string",
    },
    amount: {
      required: true,
      type: "number",
      min: 0,
    },
    status: {
      type: "string",
    },
  },
  AssistanceRecord: {
    organizationName: {
      required: true,
      type: "string",
    },
    programName: {
      required: true,
      type: "string",
    },
    category: {
      required: true,
      type: "string",
    },
    householdsServed: {
      required: true,
      type: "number",
      min: 0,
    },
    reportDate: {
      required: true,
      type: "date",
    },
    latitude: {
      type: "number",
    },
    longitude: {
      type: "number",
    },
    city: {
      type: "string",
    },
    zipcode: {
      type: "string",
    },
  },
};
