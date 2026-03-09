export type LegacyStaffRole = "ADMIN" | "EDITOR" | "VIEWER";

export type RbacRoleName =
  | "SYSTEM_ADMIN"
  | "CITY_ADMIN"
  | "DEPARTMENT_ADMIN"
  | "STAFF"
  | "COUNCIL_MEMBER"
  | "PUBLIC_USER";

export type AppRole = LegacyStaffRole | RbacRoleName;
