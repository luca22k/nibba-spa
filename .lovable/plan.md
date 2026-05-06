## Problem

After the recent security hardening migration, all REST queries fail with:
```
permission denied for function is_owner
```

This is because `EXECUTE` was revoked from `authenticated` on `is_owner`, `has_role`, `user_has_branch`, `has_permission`, and `user_branch_ids`. These functions are referenced inside the RLS policies on nearly every table (`user_roles`, `profiles`, `branch_admins`, `admin_permissions`, `branches`, etc.). When PostgREST evaluates a policy as the `authenticated` role, it must be able to execute those functions — otherwise every SELECT/INSERT returns 403.

That's why the app shows "Your account has no role assigned": `AuthContext` can't read `user_roles`, so `role` is `null`, and `AppLayout` renders the fallback message.

The user accounts themselves are intact — `admin1@spa.test` authenticated successfully (we can see a valid JWT in the failing requests). No data is missing; only execute privileges need to be restored.

## Plan

Single migration that restores `EXECUTE` on the `SECURITY DEFINER` helper functions to `authenticated`. These are still safe — they're `SECURITY DEFINER` with a fixed `search_path` and only return booleans/uuids about the caller.

```sql
GRANT EXECUTE ON FUNCTION public.is_owner(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_branch(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, permission_feature, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_branch_ids(uuid)     TO authenticated;
```

`anon` and `public` remain revoked, so unauthenticated callers still cannot probe these helpers.

## Security note

The previous scan finding that flagged these functions was a false positive in this app's context: they are required by RLS policies and are designed to be safe to expose to authenticated users (they only reveal facts about the caller's own roles/branches when policies use `auth.uid()`). I'll update the security memory and mark the related findings as ignored with that justification after the fix is applied.

No code or user data changes are needed — only the migration above.
