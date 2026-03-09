export type FieldAliasRegistry = Record<string, Record<string, string[]>>;

export const fieldRegistry: FieldAliasRegistry = {
  InfrastructureAsset: {
    assetName: ["asset", "asset name", "street name", "road name", "name"],
    conditionScore: ["condition", "condition score", "score", "health score"],
    inspectionDate: ["inspection date", "last inspection", "inspected on"],
    department: ["department", "dept", "division"],
  },
  Grant: {
    name: ["grant", "grant name", "program name"],
    amount: ["amount", "funding", "grant amount", "award amount"],
    status: ["status", "grant status"],
    department: ["department", "dept", "division"],
  },
  CivicIssue: {
    title: ["issue", "issue title", "title"],
    category: ["category", "issue category", "type"],
    status: ["status", "issue status"],
    description: ["description", "details", "summary"],
  },
  Permit: {
    permitNumber: ["permit", "permit number", "permit id"],
    permitType: ["permit type", "type"],
    status: ["status", "permit status"],
  },
  Inspection: {
    inspectionDate: ["inspection date", "date inspected", "inspected on"],
    status: ["status", "inspection status"],
    inspectorName: ["inspector", "inspector name"],
  },
  AssistanceRecord: {
    organizationName: ["organization", "organization name", "org", "agency"],
    programName: ["program", "program name", "assistance program"],
    category: ["category", "program category", "type"],
    householdsServed: ["households served", "households", "served", "beneficiaries"],
    reportDate: ["report date", "date", "reported on"],
    latitude: ["latitude", "lat"],
    longitude: ["longitude", "lng", "lon"],
    city: ["city", "municipality", "town"],
    zipcode: ["zipcode", "zip", "postal code"],
  },
};
