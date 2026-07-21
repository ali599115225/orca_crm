-- G3-09 RBAC integrity preflight.
-- READ ONLY. Every violation_count must equal zero before constraint validation.
-- Run only against an isolated/rehearsal database after G3-03 + G3-04.

WITH integrity_checks AS (
  SELECT 'orphan_org_unit_tenant' AS check_name, count(*)::bigint AS violation_count
  FROM org_units ou
  LEFT JOIN tenants t ON t.id = ou.tenant_id
  WHERE t.id IS NULL

  UNION ALL
  SELECT 'cross_tenant_org_parent', count(*)::bigint
  FROM org_units child
  JOIN org_units parent ON parent.id = child.parent_id
  WHERE parent.tenant_id <> child.tenant_id

  UNION ALL
  SELECT 'org_unit_self_parent', count(*)::bigint
  FROM org_units
  WHERE parent_id = id

  UNION ALL
  SELECT 'orphan_or_cross_tenant_org_assignment_user', count(*)::bigint
  FROM org_assignments oa
  LEFT JOIN users u ON u.id = oa.user_id AND u.tenant_id = oa.tenant_id
  WHERE u.id IS NULL

  UNION ALL
  SELECT 'orphan_or_cross_tenant_org_assignment_unit', count(*)::bigint
  FROM org_assignments oa
  LEFT JOIN org_units ou ON ou.id = oa.org_unit_id AND ou.tenant_id = oa.tenant_id
  WHERE ou.id IS NULL

  UNION ALL
  SELECT 'invalid_org_assignment_window', count(*)::bigint
  FROM org_assignments
  WHERE valid_until IS NOT NULL AND valid_until <= valid_from

  UNION ALL
  SELECT 'orphan_access_role_tenant', count(*)::bigint
  FROM access_roles ar
  LEFT JOIN tenants t ON t.id = ar.tenant_id
  WHERE t.id IS NULL

  UNION ALL
  SELECT 'orphan_or_cross_tenant_role_permission_role', count(*)::bigint
  FROM access_role_permissions arp
  LEFT JOIN access_roles ar
    ON ar.id = arp.access_role_id AND ar.tenant_id = arp.tenant_id
  WHERE ar.id IS NULL

  UNION ALL
  SELECT 'orphan_role_permission_permission', count(*)::bigint
  FROM access_role_permissions arp
  LEFT JOIN access_permissions ap ON ap.id = arp.permission_id
  WHERE ap.id IS NULL

  UNION ALL
  SELECT 'orphan_or_cross_tenant_role_assignment_user', count(*)::bigint
  FROM role_assignments ra
  LEFT JOIN users u ON u.id = ra.user_id AND u.tenant_id = ra.tenant_id
  WHERE u.id IS NULL

  UNION ALL
  SELECT 'orphan_or_cross_tenant_role_assignment_role', count(*)::bigint
  FROM role_assignments ra
  LEFT JOIN access_roles ar
    ON ar.id = ra.access_role_id AND ar.tenant_id = ra.tenant_id
  WHERE ar.id IS NULL

  UNION ALL
  SELECT 'orphan_or_cross_tenant_role_assignment_scope_unit', count(*)::bigint
  FROM role_assignments ra
  LEFT JOIN org_units ou
    ON ou.id = ra.scope_org_unit_id AND ou.tenant_id = ra.tenant_id
  WHERE ra.scope_org_unit_id IS NOT NULL AND ou.id IS NULL

  UNION ALL
  SELECT 'invalid_role_assignment_window', count(*)::bigint
  FROM role_assignments
  WHERE valid_until IS NOT NULL AND valid_until <= valid_from

  UNION ALL
  SELECT 'invalid_role_assignment_scope_shape', count(*)::bigint
  FROM role_assignments
  WHERE NOT (
    (scope_type = 'TENANT' AND scope_org_unit_id IS NULL AND resource_type IS NULL AND resource_id IS NULL)
    OR (scope_type IN ('BRANCH', 'DEPARTMENT', 'TEAM') AND scope_org_unit_id IS NOT NULL AND resource_type IS NULL AND resource_id IS NULL)
    OR (scope_type = 'SELF' AND scope_org_unit_id IS NULL AND resource_type IS NULL AND resource_id IS NULL)
    OR (scope_type = 'RESOURCE' AND scope_org_unit_id IS NULL AND resource_type IS NOT NULL AND resource_id IS NOT NULL)
  )

  UNION ALL
  SELECT 'invalid_permission_key_format', count(*)::bigint
  FROM access_permissions
  WHERE key !~ '^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$'

  UNION ALL
  SELECT 'invalid_permission_risk', count(*)::bigint
  FROM access_permissions
  WHERE risk NOT IN ('READ', 'WRITE', 'APPROVE', 'ADMIN', 'SYSTEM')

  UNION ALL
  SELECT 'orphan_authorization_audit_tenant', count(*)::bigint
  FROM authorization_audits aa
  LEFT JOIN tenants t ON t.id = aa.tenant_id
  WHERE t.id IS NULL

  UNION ALL
  SELECT 'orphan_or_cross_tenant_authorization_audit_user', count(*)::bigint
  FROM authorization_audits aa
  LEFT JOIN users u ON u.id = aa.user_id AND u.tenant_id = aa.tenant_id
  WHERE aa.user_id IS NOT NULL AND u.id IS NULL

  UNION ALL
  SELECT 'orphan_authorization_audit_permission', count(*)::bigint
  FROM authorization_audits aa
  LEFT JOIN access_permissions ap ON ap.key = aa.permission_key
  WHERE ap.key IS NULL

  UNION ALL
  SELECT 'invalid_authorization_audit_reason_source', count(*)::bigint
  FROM authorization_audits
  WHERE length(btrim(reason_code)) = 0 OR length(btrim(source)) = 0
)
SELECT check_name, violation_count
FROM integrity_checks
ORDER BY check_name;

-- Aggregate gate: must return 0.
WITH integrity_checks AS (
  SELECT count(*)::bigint AS violations
  FROM org_units ou LEFT JOIN tenants t ON t.id = ou.tenant_id WHERE t.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM org_units child JOIN org_units parent ON parent.id = child.parent_id WHERE parent.tenant_id <> child.tenant_id OR parent.id = child.id
  UNION ALL SELECT count(*)::bigint FROM org_assignments oa LEFT JOIN users u ON u.id = oa.user_id AND u.tenant_id = oa.tenant_id WHERE u.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM org_assignments oa LEFT JOIN org_units ou ON ou.id = oa.org_unit_id AND ou.tenant_id = oa.tenant_id WHERE ou.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM org_assignments WHERE valid_until IS NOT NULL AND valid_until <= valid_from
  UNION ALL SELECT count(*)::bigint FROM access_roles ar LEFT JOIN tenants t ON t.id = ar.tenant_id WHERE t.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM access_role_permissions arp LEFT JOIN access_roles ar ON ar.id = arp.access_role_id AND ar.tenant_id = arp.tenant_id WHERE ar.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM access_role_permissions arp LEFT JOIN access_permissions ap ON ap.id = arp.permission_id WHERE ap.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM role_assignments ra LEFT JOIN users u ON u.id = ra.user_id AND u.tenant_id = ra.tenant_id WHERE u.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM role_assignments ra LEFT JOIN access_roles ar ON ar.id = ra.access_role_id AND ar.tenant_id = ra.tenant_id WHERE ar.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM role_assignments ra LEFT JOIN org_units ou ON ou.id = ra.scope_org_unit_id AND ou.tenant_id = ra.tenant_id WHERE ra.scope_org_unit_id IS NOT NULL AND ou.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM role_assignments WHERE valid_until IS NOT NULL AND valid_until <= valid_from
  UNION ALL SELECT count(*)::bigint FROM role_assignments WHERE NOT ((scope_type = 'TENANT' AND scope_org_unit_id IS NULL AND resource_type IS NULL AND resource_id IS NULL) OR (scope_type IN ('BRANCH', 'DEPARTMENT', 'TEAM') AND scope_org_unit_id IS NOT NULL AND resource_type IS NULL AND resource_id IS NULL) OR (scope_type = 'SELF' AND scope_org_unit_id IS NULL AND resource_type IS NULL AND resource_id IS NULL) OR (scope_type = 'RESOURCE' AND scope_org_unit_id IS NULL AND resource_type IS NOT NULL AND resource_id IS NOT NULL))
  UNION ALL SELECT count(*)::bigint FROM access_permissions WHERE key !~ '^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$' OR risk NOT IN ('READ', 'WRITE', 'APPROVE', 'ADMIN', 'SYSTEM')
  UNION ALL SELECT count(*)::bigint FROM authorization_audits aa LEFT JOIN tenants t ON t.id = aa.tenant_id WHERE t.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM authorization_audits aa LEFT JOIN users u ON u.id = aa.user_id AND u.tenant_id = aa.tenant_id WHERE aa.user_id IS NOT NULL AND u.id IS NULL
  UNION ALL SELECT count(*)::bigint FROM authorization_audits aa LEFT JOIN access_permissions ap ON ap.key = aa.permission_key WHERE ap.key IS NULL
  UNION ALL SELECT count(*)::bigint FROM authorization_audits WHERE length(btrim(reason_code)) = 0 OR length(btrim(source)) = 0
)
SELECT coalesce(sum(violations), 0)::bigint AS total_integrity_violations
FROM integrity_checks;
