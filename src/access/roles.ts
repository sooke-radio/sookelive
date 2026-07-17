export const ROLES = {
  admin: 'admin',
  host: 'host',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const roleOptions = Object.values(ROLES).map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}))

// `unknown` (not `User`) so this works for both the server-side `req.user`
// and the sanitized `ClientUser` admin components receive (e.g. in
// `admin.hidden`) — the two types don't structurally overlap.
export const hasRole = (user: unknown, role: Role): boolean => {
  const roles = (user as { roles?: unknown } | null | undefined)?.roles
  return Array.isArray(roles) && roles.includes(role)
}

export const isAdminUser = (user: unknown): boolean => {
  return hasRole(user, ROLES.admin)
}
