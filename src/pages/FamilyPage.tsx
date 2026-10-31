import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import type { UserRole, FamilySide, Invitation } from '../types/auth';
import {
  Users,
  Plus,
  Copy,
  Check,
  Share2,
  Trash2,
  UserCheck,
  Clock,
  XCircle,
  AlertCircle,
  Crown,
} from 'lucide-react';

export const FamilyPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';

  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'FAMILY_MEMBER' | 'VIEWER'>('FAMILY_MEMBER');
  const [inviteSide, setInviteSide] = useState<FamilySide>('mutual');
  const [inviteExpiryDays, setInviteExpiryDays] = useState(7);

  // Newly generated invite result
  const [generatedInvite, setGeneratedInvite] = useState<{
    rawToken: string;
    inviteLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('shaadisaathi_session_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const loadFamilyData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setError(null);
      setCurrentTime(Date.now());

      // 1. Members
      const membersRes = await fetch('/api/family/members', { headers: getAuthHeaders() });
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      // 2. Invitations (if owner)
      if (isOwner) {
        const invRes = await fetch('/api/invitations', { headers: getAuthHeaders() });
        if (invRes.ok) {
          const data = await invRes.json();
          setInvitations(data.invitations || []);
        }
      }
    } catch {
      setError('Failed to fetch family team data.');
    } finally {
      setIsLoadingData(false);
    }
  }, [isOwner]);

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          side: inviteSide,
          expiresInDays: inviteExpiryDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create invitation.');
        return;
      }

      setGeneratedInvite({
        rawToken: data.rawToken,
        inviteLink: `${window.location.origin}${data.inviteLink}`,
      });

      // Reload invitations
      loadFamilyData();
    } catch {
      setError('Connection failed.');
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!window.confirm(t.invitations.revokeConfirm)) return;
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        loadFamilyData();
      }
    } catch {
      setError('Failed to revoke invitation.');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      const res = await fetch(`/api/family/members/${memberId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to update role.');
      } else {
        loadFamilyData();
      }
    } catch {
      alert('Failed to update role.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm(t.family.removeConfirm)) return;
    try {
      const res = await fetch(`/api/family/members/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to remove member.');
      } else {
        loadFamilyData();
      }
    } catch {
      alert('Failed to remove member.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setGeneratedInvite(null);
    setInviteName('');
    setInviteEmail('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.family.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.family.subtitle}
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-gold-light" />
            <span>{t.family.inviteMemberBtn}</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Family Members Section */}
      <div className="bg-ivory-light rounded-2xl border border-gold/30 card-shadow overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gold/20">
          <div className="flex items-center gap-2 font-royal font-bold text-base text-burgundy">
            <Users className="w-5 h-5" />
            <h2>{t.family.membersHeading}</h2>
            <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-dark text-xs font-sans font-bold">
              {members.length}
            </span>
          </div>

          {!isOwner && (
            <Badge variant="outline" size="sm">
              {language === 'hi' ? 'केवल व्यवस्थापक निमंत्रण दे सकते हैं' : 'Owner-Managed Access'}
            </Badge>
          )}
        </div>

        {isLoadingData ? (
          <div className="py-8 text-center text-xs text-charcoal-muted">
            <div className="w-6 h-6 border-2 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>{t.common.loading}</span>
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            title="No Family Members"
            description={t.family.emptyMembers}
            actionLabel={isOwner ? t.family.inviteMemberBtn : undefined}
            onAction={isOwner ? () => setIsInviteModalOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-ivory p-4 rounded-xl border border-gold/30 card-shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant={
                        member.role === 'OWNER'
                          ? 'burgundy'
                          : member.role === 'FAMILY_MEMBER'
                          ? 'gold'
                          : 'outline'
                      }
                      size="sm"
                      icon={member.role === 'OWNER' ? <Crown className="w-3 h-3 text-gold-light" /> : undefined}
                    >
                      {member.role === 'OWNER'
                        ? t.family.roleOwner
                        : member.role === 'FAMILY_MEMBER'
                        ? t.family.roleMember
                        : t.family.roleViewer}
                    </Badge>

                    <Badge
                      variant={
                        member.side === 'bride' ? 'rose' : member.side === 'groom' ? 'gold' : 'sage'
                      }
                      size="sm"
                    >
                      {member.side === 'bride'
                        ? t.common.brideSide
                        : member.side === 'groom'
                        ? t.common.groomSide
                        : t.common.mutual}
                    </Badge>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-burgundy">
                    {member.name}
                    {member.id === user?.id && (
                      <span className="text-[11px] font-normal text-charcoal-muted ml-1.5">
                        ({language === 'hi' ? 'आप' : 'You'})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-charcoal-muted font-mono mt-0.5">
                    {member.email}
                  </p>
                </div>

                {/* Owner Actions */}
                {isOwner && member.id !== user?.id && (
                  <div className="pt-2 border-t border-gold/20 flex items-center justify-between text-xs">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                      className="px-2 py-1 rounded-lg border border-gold/40 bg-ivory-light text-xs font-semibold text-charcoal focus:outline-none"
                    >
                      <option value="FAMILY_MEMBER">{t.family.roleMember}</option>
                      <option value="VIEWER">{t.family.roleViewer}</option>
                      <option value="OWNER">{t.family.roleOwner}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 rounded-lg text-burgundy hover:bg-rose/40 transition-colors cursor-pointer"
                      title={t.family.removeMember}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitations Section (Owners Only) */}
      {isOwner && (
        <div className="bg-ivory-light rounded-2xl border border-gold/30 card-shadow overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gold/20">
            <div className="flex items-center gap-2 font-royal font-bold text-base text-burgundy">
              <Clock className="w-5 h-5 text-gold-dark" />
              <h2>{t.family.invitationsHeading}</h2>
              <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-dark text-xs font-sans font-bold">
                {invitations.length}
              </span>
            </div>
          </div>

          {invitations.length === 0 ? (
            <p className="text-xs text-charcoal-muted py-4 text-center">
              {t.family.emptyInvitations}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-ivory border-b border-gold/20 text-charcoal-muted uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Invitee</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Expires</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/15">
                  {invitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at).getTime() < currentTime;
                    const isAccepted = !!inv.accepted_at;
                    const isRevoked = !!inv.is_revoked;

                    return (
                      <tr key={inv.id} className="hover:bg-rose-light/30">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-charcoal">{inv.name}</div>
                          <div className="text-[11px] text-charcoal-muted font-mono">{inv.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" size="sm">
                            {inv.role === 'FAMILY_MEMBER' ? t.family.roleMember : t.family.roleViewer}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-charcoal-muted text-[11px]">
                          {inv.expires_at.split('T')[0]}
                        </td>
                        <td className="py-3 px-3">
                          {isAccepted ? (
                            <Badge variant="sage" size="sm" icon={<UserCheck className="w-3 h-3 text-sage" />}>
                              {t.invitations.statusAccepted}
                            </Badge>
                          ) : isRevoked ? (
                            <Badge variant="rose" size="sm" icon={<XCircle className="w-3 h-3 text-burgundy" />}>
                              {t.invitations.statusRevoked}
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="charcoal" size="sm">
                              {t.invitations.statusExpired}
                            </Badge>
                          ) : (
                            <Badge variant="gold" size="sm" icon={<Clock className="w-3 h-3 text-gold-dark" />}>
                              {t.invitations.statusPending}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {!isAccepted && !isRevoked && !isExpired && (
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-2.5 py-1 rounded-lg border border-burgundy/30 text-burgundy hover:bg-rose/40 text-xs font-semibold cursor-pointer"
                            >
                              {t.invitations.revokeBtn}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Invitation Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
        title={t.invitations.createTitle}
        subtitle={t.invitations.createSubtitle}
        maxWidth="md"
      >
        {generatedInvite ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sage/15 border border-sage/40 text-sage-dark text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Check className="w-4 h-4 text-sage" />
                <span>{t.invitations.successTitle}</span>
              </div>
              <p className="leading-relaxed">{t.invitations.successDesc}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-burgundy block">
                {language === 'hi' ? 'सुरक्षित निमंत्रण लिंक' : 'Secure Invitation Link'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInvite.inviteLink}
                  className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedInvite.inviteLink)}
                  className="p-2.5 rounded-xl bg-burgundy text-ivory hover:bg-burgundy-dark transition-colors cursor-pointer flex-shrink-0"
                  title={t.invitations.copyLinkBtn}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <span className="text-[11px] text-sage font-bold block">
                  {t.invitations.linkCopied}
                </span>
              )}
            </div>

            {/* WhatsApp Share Button */}
            <div className="pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${t.family.whatsappMessage}${generatedInvite.inviteLink}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.family.whatsappShare}</span>
              </a>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={closeInviteModal}
                className="px-5 py-2 rounded-xl bg-ivory border border-gold/40 text-charcoal text-xs font-semibold hover:bg-rose/40 cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <label htmlFor="invite-name" className="block text-xs font-semibold text-charcoal mb-1">
                {t.invitations.nameLabel} *
              </label>
              <input
                id="invite-name"
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder={t.invitations.namePlaceholder}
                className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
              />
            </div>

            <div>
              <label htmlFor="invite-email" className="block text-xs font-semibold text-charcoal mb-1">
                {t.invitations.emailLabel} *
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t.invitations.emailPlaceholder}
                className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="invite-role" className="block text-xs font-semibold text-charcoal mb-1">
                  {t.invitations.roleLabel}
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                >
                  <option value="FAMILY_MEMBER">{t.family.roleMember}</option>
                  <option value="VIEWER">{t.family.roleViewer}</option>
                </select>
              </div>

              <div>
                <label htmlFor="invite-side" className="block text-xs font-semibold text-charcoal mb-1">
                  {t.invitations.sideLabel}
                </label>
                <select
                  id="invite-side"
                  value={inviteSide}
                  onChange={(e) => setInviteSide(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
                >
                  <option value="bride">{t.common.brideSide}</option>
                  <option value="groom">{t.common.groomSide}</option>
                  <option value="mutual">{t.common.mutual}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="invite-expiry" className="block text-xs font-semibold text-charcoal mb-1">
                {t.invitations.expiryLabel}
              </label>
              <select
                id="invite-expiry"
                value={inviteExpiryDays}
                onChange={(e) => setInviteExpiryDays(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-sm focus:border-burgundy"
              >
                <option value={7}>{t.invitations.expiry7Days}</option>
                <option value={14}>{t.invitations.expiry14Days}</option>
                <option value={30}>{t.invitations.expiry30Days}</option>
              </select>
            </div>

            <p className="text-[11px] text-charcoal-muted leading-tight">
              🔒 {t.invitations.roleOwnerNotice}
            </p>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeInviteModal}
                className="px-4 py-2 rounded-xl border border-gold/40 text-charcoal text-xs font-semibold hover:bg-rose/40 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-burgundy text-ivory text-xs font-semibold hover:bg-burgundy-dark cursor-pointer shadow-sm"
              >
                {t.invitations.generateBtn}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
