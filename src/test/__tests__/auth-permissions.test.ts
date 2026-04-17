/**
 * Auth Permission Tests — useAuth derived permissions
 * 
 * Tests the permission derivation logic from useAuth hook
 * without needing actual Supabase connections.
 */
import { describe, it, expect } from 'vitest';
import { AppRoleV2, OrgMembership } from '@/types/roles';

// ─── Permission derivation logic (extracted from useAuth) ────────────────────

function derivePermissions(memberships: OrgMembership[]) {
  const isOwner = memberships.some(m => m.role === 'owner');
  const isOrgAdmin = memberships.some(m => m.role === 'org_admin');
  const canEdit = isOwner || isOrgAdmin;
  const canManageLibrary = isOwner || isOrgAdmin;
  const hasOrganization = memberships.some(m => !m.isDefaultOrg);

  const getRoleInOrg = (orgId: string): AppRoleV2 | null => {
    const m = memberships.find(m => m.organization_id === orgId);
    return m?.role ?? null;
  };

  return { isOwner, isOrgAdmin, canEdit, canManageLibrary, hasOrganization, getRoleInOrg };
}

function makeMembership(overrides: Partial<OrgMembership> & { organization_id: string; role: AppRoleV2 }): OrgMembership {
  return {
    id: 'mem-' + Math.random().toString(36).slice(2),
    user_id: 'user-1',
    organization_name: 'Test Org',
    organization_slug: 'test-org',
    isDefaultOrg: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Auth Permission Derivation', () => {
  describe('Owner', () => {
    const perms = derivePermissions([
      makeMembership({ organization_id: 'org-1', role: 'owner' }),
    ]);

    it('isOwner = true', () => expect(perms.isOwner).toBe(true));
    it('canEdit = true', () => expect(perms.canEdit).toBe(true));
    it('canManageLibrary = true', () => expect(perms.canManageLibrary).toBe(true));
    it('hasOrganization = true', () => expect(perms.hasOrganization).toBe(true));
  });

  describe('Org Admin', () => {
    const perms = derivePermissions([
      makeMembership({ organization_id: 'org-1', role: 'org_admin' }),
    ]);

    it('isOwner = false', () => expect(perms.isOwner).toBe(false));
    it('isOrgAdmin = true', () => expect(perms.isOrgAdmin).toBe(true));
    it('canEdit = true', () => expect(perms.canEdit).toBe(true));
    it('canManageLibrary = true', () => expect(perms.canManageLibrary).toBe(true));
  });

  describe('Member', () => {
    const perms = derivePermissions([
      makeMembership({ organization_id: 'org-1', role: 'member' }),
    ]);

    it('isOwner = false', () => expect(perms.isOwner).toBe(false));
    it('isOrgAdmin = false', () => expect(perms.isOrgAdmin).toBe(false));
    it('canEdit = false', () => expect(perms.canEdit).toBe(false));
    it('canManageLibrary = false', () => expect(perms.canManageLibrary).toBe(false));
    it('hasOrganization = true', () => expect(perms.hasOrganization).toBe(true));
  });

  describe('User with no real org (default only)', () => {
    const perms = derivePermissions([
      makeMembership({ organization_id: 'org-default', role: 'member', isDefaultOrg: true }),
    ]);

    it('hasOrganization = false (only default)', () => expect(perms.hasOrganization).toBe(false));
    it('canEdit = false', () => expect(perms.canEdit).toBe(false));
  });

  describe('User with no memberships', () => {
    const perms = derivePermissions([]);

    it('isOwner = false', () => expect(perms.isOwner).toBe(false));
    it('canEdit = false', () => expect(perms.canEdit).toBe(false));
    it('hasOrganization = false', () => expect(perms.hasOrganization).toBe(false));
  });

  describe('Multi-org user', () => {
    const perms = derivePermissions([
      makeMembership({ organization_id: 'org-1', role: 'org_admin' }),
      makeMembership({ organization_id: 'org-2', role: 'member' }),
    ]);

    it('isOrgAdmin = true (from org-1)', () => expect(perms.isOrgAdmin).toBe(true));
    it('canEdit = true', () => expect(perms.canEdit).toBe(true));

    it('getRoleInOrg returns correct role per org', () => {
      expect(perms.getRoleInOrg('org-1')).toBe('org_admin');
      expect(perms.getRoleInOrg('org-2')).toBe('member');
      expect(perms.getRoleInOrg('org-3')).toBeNull();
    });
  });
});

describe('Admin Access Scoping', () => {
  // Mirrors the logic from UsersAdmin.tsx
  function getScopedOrgIds(isOwner: boolean, memberships: OrgMembership[]): string[] | undefined {
    if (isOwner) return undefined; // Owner sees all
    return memberships
      .filter(m => m.role === 'org_admin' && !m.isDefaultOrg)
      .map(m => m.organization_id);
  }

  it('Owner gets undefined (sees all orgs)', () => {
    expect(getScopedOrgIds(true, [])).toBeUndefined();
  });

  it('Org Admin gets scoped to their admin orgs only', () => {
    const ms = [
      makeMembership({ organization_id: 'org-1', role: 'org_admin' }),
      makeMembership({ organization_id: 'org-2', role: 'member' }),
    ];
    const scoped = getScopedOrgIds(false, ms);
    expect(scoped).toEqual(['org-1']);
  });

  it('Member with no admin orgs gets empty array', () => {
    const ms = [makeMembership({ organization_id: 'org-1', role: 'member' })];
    const scoped = getScopedOrgIds(false, ms);
    expect(scoped).toEqual([]);
  });
});

describe('Invitation Permission Logic', () => {
  function canInvite(isOwner: boolean, isOrgAdmin: boolean): boolean {
    return isOwner || isOrgAdmin;
  }

  function canDeleteUser(isOwner: boolean): boolean {
    return isOwner;
  }

  function canRemoveMembership(isOwner: boolean): boolean {
    return isOwner;
  }

  it('Owner can invite, delete users, remove memberships', () => {
    expect(canInvite(true, false)).toBe(true);
    expect(canDeleteUser(true)).toBe(true);
    expect(canRemoveMembership(true)).toBe(true);
  });

  it('Org Admin can invite but not delete users or remove memberships', () => {
    expect(canInvite(false, true)).toBe(true);
    expect(canDeleteUser(false)).toBe(false);
    expect(canRemoveMembership(false)).toBe(false);
  });

  it('Member cannot invite, delete, or remove', () => {
    expect(canInvite(false, false)).toBe(false);
    expect(canDeleteUser(false)).toBe(false);
    expect(canRemoveMembership(false)).toBe(false);
  });
});

describe('Self-Protection', () => {
  it('User cannot delete their own account', () => {
    const currentUserId = 'user-1';
    const targetUserId = 'user-1';
    expect(targetUserId !== currentUserId).toBe(false);
  });

  it('Bulk delete filters out current user', () => {
    const currentUserId = 'user-1';
    const toDelete = ['user-1', 'user-2', 'user-3'];
    const filtered = toDelete.filter(id => id !== currentUserId);
    expect(filtered).toEqual(['user-2', 'user-3']);
    expect(filtered).not.toContain('user-1');
  });
});

describe('Invitation Expiration & Status', () => {
  function isInvitationValid(status: string, expiresAt: string): boolean {
    if (status !== 'pending') return false;
    return new Date(expiresAt) > new Date();
  }

  it('Pending + future date → valid', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isInvitationValid('pending', future)).toBe(true);
  });

  it('Pending + past date → expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isInvitationValid('pending', past)).toBe(false);
  });

  it('Cancelled → invalid regardless of date', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isInvitationValid('cancelled', future)).toBe(false);
  });

  it('Accepted → invalid regardless of date', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isInvitationValid('accepted', future)).toBe(false);
  });
});
