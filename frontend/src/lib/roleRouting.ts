import type { Session } from "@supabase/supabase-js";
import { loadCurrentLmsUser, type CurrentLmsUser } from "./lms";

export const ADMIN_APP_ROLES = ["owner", "admin", "editor", "hr", "support"] as const;

export type AdminAppRole = (typeof ADMIN_APP_ROLES)[number];
export type DashboardRole = "admin" | "instructor" | "student";

export type DashboardAccess = {
  role: DashboardRole;
  path: "/awexen" | "/instructor" | "/learn";
  adminRole: AdminAppRole | null;
  lmsUser: CurrentLmsUser | null;
};

export function isAdminAppRole(value: unknown): value is AdminAppRole {
  return ADMIN_APP_ROLES.includes(String(value) as AdminAppRole);
}

export function resolveDashboardAccess(
  session: Session,
  lmsUser: CurrentLmsUser | null,
): DashboardAccess {
  const metadataRole = session.user.app_metadata.role;
  const adminRole = isAdminAppRole(metadataRole) ? metadataRole : null;
  const adminMembership = lmsUser?.memberships.find((membership) =>
    ["organization_admin", "lms_manager", "support_agent"].includes(membership.role),
  );

  if (lmsUser?.platform_role === "super_admin" || adminRole || adminMembership) {
    const membershipAdminRole: AdminAppRole | null = adminMembership?.role === "organization_admin"
      ? "admin"
      : adminMembership?.role === "lms_manager"
        ? "editor"
        : adminMembership?.role === "support_agent"
          ? "support"
          : null;
    return {
      role: "admin",
      path: "/awexen",
      adminRole: lmsUser?.platform_role === "super_admin" ? "owner" : adminRole ?? membershipAdminRole ?? "admin",
      lmsUser,
    };
  }

  if (lmsUser?.memberships.some((membership) => membership.role === "instructor")) {
    return { role: "instructor", path: "/instructor", adminRole: null, lmsUser };
  }

  return { role: "student", path: "/learn", adminRole: null, lmsUser };
}

export async function loadDashboardAccess(session: Session): Promise<DashboardAccess> {
  try {
    return resolveDashboardAccess(session, await loadCurrentLmsUser());
  } catch (error) {
    // CMS admins can still reach the admin panel if the LMS function is
    // temporarily unavailable; learning roles never fall back to metadata.
    if (isAdminAppRole(session.user.app_metadata.role)) {
      return resolveDashboardAccess(session, null);
    }
    throw error;
  }
}

export function pathMatchesDashboardRole(pathname: string, role: DashboardRole) {
  if (role === "admin") return pathname === "/awexen" || pathname.startsWith("/awexen/");
  if (role === "instructor") return pathname === "/instructor" || pathname.startsWith("/instructor/");
  return pathname === "/learn"
    || pathname.startsWith("/learn/")
    || pathname.startsWith("/checkout/");
}
