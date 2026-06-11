type StaffIdentityRecord = {
  id?: unknown;
  staff_id?: unknown;
  staffId?: unknown;
  user_id?: unknown;
  userId?: unknown;
  verified?: unknown;
  is_verified?: unknown;
  isVerified?: unknown;
  verified_status?: unknown;
  verify_status?: unknown;
  status?: unknown;
  role_title?: unknown;
  roleTitle?: unknown;
  staff?: {
    id?: unknown;
    staff_id?: unknown;
    verified?: unknown;
    is_verified?: unknown;
  };
  user?: {
    id?: unknown;
    user_id?: unknown;
    verified?: unknown;
    is_verified?: unknown;
  };
};

function toPositiveNumber(value: unknown) {
  const numeric = value;

  return !!numeric
    ? numeric
    : null;
}

export function getStaffId(value: unknown) {
  const record = value as StaffIdentityRecord;
  const candidates = [
    record.id,
    record.staff_id,
    record.staffId,
    record.user_id,
    record.userId,
    record.staff?.id,
    record.staff?.staff_id,
    record.user?.id,
    record.user?.user_id,
  ];

  for (const candidate of candidates) {
    const id = toPositiveNumber(candidate);
    if (id !== null) return id;
  }

  return null;
}

export function getStaffRowKey(value: unknown, index: number, prefix = "staff") {
  const id = getStaffId(value);
  if (id !== null) return `${prefix}-${id}`;

  return `${prefix}-unknown-${index}`;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "approved", "verified", "active"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "pending", "rejected", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

export function getStaffVerified(value: unknown) {
  const record = value as StaffIdentityRecord;
  const candidates = [
    record.is_verified,
    record.verified,
    record.isVerified,
    record.verify_status,
    record.verified_status,
    record.status,
    record.staff?.is_verified,
    record.staff?.verified,
    record.user?.is_verified,
    record.user?.verified,
  ];

  for (const candidate of candidates) {
    const verified = toBoolean(candidate);
    if (verified !== null) return verified;
  }

  return false;
}

export function isDoctorStaffRecord(value: unknown) {
  const record = value as StaffIdentityRecord;
  const rawRole = record.role_title ?? record.roleTitle;

  if (typeof rawRole !== "string") return true;

  const role = rawRole.trim().toLowerCase();

  return role === "" || role === "doctor" || role === "طبيب";
}

export function getStaffRoleLabel(value: unknown) {
  const record = value as StaffIdentityRecord;
  const rawRole = record.role_title ?? record.roleTitle;

  if (typeof rawRole !== "string" || !rawRole.trim()) return "طبيب";

  return isDoctorStaffRecord(value) ? "طبيب" : rawRole.trim();
}

export function normalizeStaffRecord<T extends object>(value: T) {
  const id = getStaffId(value);
  const verified = getStaffVerified(value);

  return {
    ...value,
    ...(id !== null ? { id } : {}),
    verified,
    is_verified: verified,
  };
}
