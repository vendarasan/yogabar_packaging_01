import React, { useState, useEffect, useRef } from 'react';
import { PRESET_USERS, SHADOW_AVATAR } from '../../constants';
import { getUsers, createTeamMember, updateTeamMember, deleteTeamMember } from '../../api';

export default function UserDirectoryModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('structure'); // 'structure' | 'users' | 'matrix'
  const [structureViewMode, setStructureViewMode] = useState('tree'); // 'tree' | 'cards'
  const [users, setUsers] = useState(PRESET_USERS);
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // File input refs
  const editFileInputRef = useRef(null);
  const addFileInputRef = useRef(null);

  // Form fields for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'updater',
    title: 'Executive',
    team: 'Regular',
    department: '',
    mobile: '',
    avatar: '',
    password: ''
  });

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(currentUser?.role);

  const fetchUserDirectory = () => {
    setLoading(true);
    getUsers()
      .then(res => {
        if (res.data?.users && res.data.users.length > 0) {
          const apiUsers = res.data.users;
          const merged = apiUsers.map(u => {
            const preset = PRESET_USERS.find(p => p.email?.toLowerCase() === u.email?.toLowerCase() || p.username?.toLowerCase() === u.email?.toLowerCase());
            return {
              ...preset,
              ...u,
              avatar: u.avatar || preset?.avatar || '',
              mobile: u.mobile || preset?.mobile || '',
              title: u.title || preset?.title || (u.role === 'superadmin' ? 'Packaging Head' : u.role === 'admin' ? 'Project Manager' : 'Executive'),
              team: u.team || preset?.team || (u.role === 'superadmin' ? 'Packaging Leadership' : 'Regular Vertical')
            };
          });
          setUsers(merged);
        }
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setUsers(PRESET_USERS);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      setActionError('');
      setActionSuccess('');
      fetchUserDirectory();
    }
  }, [isOpen]);

  if (!isOpen || !isAdmin) return null;

  // File upload for Edit
  const handleEditFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // File upload for Add
  const handleAddFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Edit Handlers
  const handleStartEdit = (user) => {
    setActionError('');
    setActionSuccess('');
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'updater',
      title: user.title || '',
      team: user.team || 'Regular',
      department: (user.department || '').replace(/\bOperations\b/gi, 'Packaging'),
      mobile: user.mobile || '',
      avatar: user.avatar || '',
      password: ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setActionError('Name cannot be empty.');
      return;
    }
    setActionError('');
    setActionSuccess('');
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email ? formData.email.trim().toLowerCase() : undefined,
        role: formData.role,
        title: formData.title.trim(),
        team: formData.team.trim(),
        department: formData.department.trim(),
        mobile: formData.mobile.trim(),
        avatar: formData.avatar.trim()
      };

      const res = await updateTeamMember(editingUser.email, payload);
      setActionSuccess(`Successfully updated ${formData.name}!`);
      setEditingUser(null);
      fetchUserDirectory();

      if (onUserUpdated && (currentUser?.email === editingUser.email || (currentUser?.role === 'superadmin' && editingUser.role === 'superadmin'))) {
        onUserUpdated(res.data.user);
      }
    } catch (err) {
      console.error('Failed to update member:', err);
      setActionError(err.response?.data?.error || 'Failed to update member.');
    } finally {
      setLoading(false);
    }
  };

  // Add Member Handlers
  const handleStartAdd = () => {
    setActionError('');
    setActionSuccess('');
    setIsAddModalOpen(true);
    setFormData({
      name: '',
      email: '',
      role: 'updater',
      title: 'Executive',
      team: 'Regular Vertical',
      department: 'Regular Vertical Packaging',
      mobile: '',
      avatar: '',
      password: 'User@2024'
    });
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setActionError('Name and Email are required.');
      return;
    }
    setActionError('');
    setActionSuccess('');
    setLoading(true);

    try {
      await createTeamMember({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        title: formData.title.trim(),
        team: formData.team.trim(),
        department: formData.department.trim(),
        mobile: formData.mobile.trim(),
        avatar: formData.avatar.trim()
      });
      setActionSuccess(`Successfully added team member ${formData.name}!`);
      setIsAddModalOpen(false);
      fetchUserDirectory();
    } catch (err) {
      console.error('Failed to create member:', err);
      setActionError(err.response?.data?.error || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Handler (Super Admin only)
  const handleDeleteMember = async (user) => {
    if (!window.confirm(`Are you sure you want to remove ${user.name} (${user.email}) from the team?`)) {
      return;
    }
    setActionError('');
    setActionSuccess('');
    setLoading(true);

    try {
      await deleteTeamMember(user.email);
      setActionSuccess(`Removed ${user.name} from team.`);
      fetchUserDirectory();
    } catch (err) {
      console.error('Failed to delete member:', err);
      setActionError(err.response?.data?.error || 'Failed to remove member.');
    } finally {
      setLoading(false);
    }
  };

  // Categorize users for exact hierarchy structure:
  // 1. Packaging Head (Super Admin)
  const packagingHead = users.find(u => u.role === 'superadmin' || u.email?.toLowerCase().includes('alexsander') || u.title?.toLowerCase().includes('head')) || users[0];

  // 2. Regular Vertical
  const regularUsers = users.filter(u => u !== packagingHead && (u.team?.includes('Regular') || u.department?.toLowerCase().includes('regular')));
  const regularPM = regularUsers.find(u => u.role === 'admin' || u.title?.toLowerCase().includes('manager') || u.email?.includes('balaji')) || regularUsers[0];
  const regularExec = regularUsers.find(u => u !== regularPM && (u.title?.toLowerCase().includes('executive') || u.email?.includes('akshr'))) || regularUsers[1];
  const regularInterns = [1, 2, 3].map(n => {
    return regularUsers.find(u => u !== regularPM && u !== regularExec && (u.name?.toLowerCase().includes(`${n}`) || u.email?.toLowerCase().includes(`intern${n}`)))
      || regularUsers.filter(u => u !== regularPM && u !== regularExec)[n - 1];
  });

  // 3. Growth Vertical
  const growthUsers = users.filter(u => u !== packagingHead && (u.team?.includes('Growth') || u.department?.toLowerCase().includes('growth')));
  const growthPM = growthUsers.find(u => u.role === 'admin' || u.title?.toLowerCase().includes('manager') || u.name?.toLowerCase().includes('unassigned') || u.email?.includes('growth.pm')) || growthUsers[0];
  const growthExec = growthUsers.find(u => u !== growthPM && (u.title?.toLowerCase().includes('executive') || u.email?.includes('manideep'))) || growthUsers[1];
  const growthInterns = [1, 2, 3].map(n => {
    return growthUsers.find(u => u !== growthPM && u !== growthExec && (u.name?.toLowerCase().includes(`${n}`) || u.email?.toLowerCase().includes(`intern${n}`)))
      || growthUsers.filter(u => u !== growthPM && u !== growthExec)[n - 1];
  });

  const assignedUsers = [packagingHead, regularPM, regularExec, ...regularInterns, growthPM, growthExec, ...growthInterns].filter(Boolean);
  const otherMembers = users.filter(u => !assignedUsers.includes(u));

  const permissions = [
    { name: 'Project Creation (from Brief)', superadmin: true, admin: true, updater: false, note: 'Admins create based on formal brief' },
    { name: 'Permanent Project Deletion', superadmin: true, admin: false, updater: false, note: 'Super Admin exclusive' },
    { name: 'Team Member Profile Setup & Editing', superadmin: true, admin: true, updater: false, note: 'Super Admin & Admin can configure all profiles & team hierarchy' },
    { name: 'Stage Revocation (Project & Material)', superadmin: true, admin: true, updater: false, note: 'Rollback updater movements on test/artwork failure' },
    { name: 'Stage Advancement (Next All & Next)', superadmin: true, admin: true, updater: true, note: 'Move materials based on physical project progress' },
    { name: 'Inline FG Code Edit', superadmin: true, admin: true, updater: true, note: 'Update Finished Goods SAP code' },
    { name: 'Inline PM Code Edit', superadmin: true, admin: true, updater: true, note: 'Update Packaging Material code per component' },
    { name: 'Technical Specifications (Dieline, GSM, Dims)', superadmin: true, admin: true, updater: true, note: 'Enter/modify engineering specs' },
    { name: 'Purchase Order Updates (Status & PO #)', superadmin: true, admin: true, updater: true, note: 'Update PO: Raised, Under approval, RFQ' },
    { name: 'Factory, Supplier & Description Edits', superadmin: true, admin: true, updater: true, note: 'Maintain line allocation & supplier notes' },
    { name: 'Commercial Launch Confirmation', superadmin: true, admin: true, updater: false, note: 'Confirm first commercial sale date' },
    { name: 'Live Audit Activity Stream', superadmin: true, admin: true, updater: false, note: 'Real-time action logging & notification stream' }
  ];

  const filteredUsers = filterRole === 'all' ? users : users.filter(u => u.role === filterRole);

  // ── Render Tree Node Card ──
  const renderTreeNode = (u, { defaultName, defaultTitle, defaultRole, roleBadge, badgeColor, badgeBg, borderColor, isRoot, isCompact, isUnassigned, defaultTeam }) => {
    const name = u?.name || defaultName;
    const title = u?.title || defaultTitle;
    const email = u?.email || '';
    const mobile = u?.mobile || '';
    const avatar = u?.avatar || '';
    const isCur = currentUser?.email?.toLowerCase() === email?.toLowerCase() || (u?.role === 'superadmin' && currentUser?.role === 'superadmin');

    return (
      <div
        style={{
          background: 'rgba(7, 36, 42, 0.95)',
          border: `1.5px solid ${borderColor || 'rgba(0, 212, 200, 0.35)'}`,
          borderRadius: 12,
          padding: isCompact ? '10px 8px' : '12px 14px',
          width: isCompact ? '100%' : isRoot ? '290px' : '260px',
          boxShadow: isRoot ? '0 0 20px rgba(239, 68, 68, 0.25)' : '0 4px 14px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          textAlign: 'left'
        }}
      >
        {isCur && (
          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '8.5px', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#059669', color: '#fff' }}>
            YOU
          </span>
        )}

        {/* Top: Avatar, Name & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 8 : 12, marginBottom: isCompact ? 6 : 8 }}>
          <img
            src={avatar || SHADOW_AVATAR}
            alt={name}
            style={{
              width: isCompact ? 34 : 44,
              height: isCompact ? 34 : 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${badgeColor}`,
              flexShrink: 0,
              background: 'rgba(0,0,0,0.4)'
            }}
            onError={(e) => { e.target.src = SHADOW_AVATAR; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isCompact ? '11px' : '13px',
              fontWeight: 700,
              color: isUnassigned ? '#94a3b8' : 'var(--text-main)',
              fontStyle: isUnassigned ? 'italic' : 'normal',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {name}
            </div>
            <div style={{
              fontSize: isCompact ? '9.5px' : '11px',
              color: badgeColor,
              fontWeight: 600,
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {title}
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCompact ? 6 : 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: isCompact ? '8.5px' : '9.5px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 4,
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeColor}40`,
            whiteSpace: 'nowrap'
          }}>
            {roleBadge}
          </span>
        </div>

        {/* Contact Snippet */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: isCompact ? '4px 6px' : '6px 8px',
          borderRadius: 6,
          marginBottom: isCompact ? 6 : 8,
          fontSize: isCompact ? '9px' : '10px',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span>✉</span> {email ? <span style={{ color: '#93c5fd' }}>{email}</span> : <span style={{ color: '#64748b', fontStyle: 'italic' }}>No email</span>}
          </div>
          {mobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#86efac' }}>
              <span>📞</span> <span>{mobile}</span>
            </div>
          )}
        </div>

        {/* Edit Button */}
        <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleStartEdit(u || { name, title, email, role: defaultRole, team: defaultTeam || 'Regular Vertical' })}
            style={{
              flex: 1,
              fontSize: isCompact ? '9px' : '10.5px',
              padding: isCompact ? '3px 4px' : '4px 8px',
              background: `${badgeColor}20`,
              border: `1px solid ${badgeColor}50`,
              color: badgeColor,
              fontWeight: 700,
              justifyContent: 'center'
            }}
          >
            ✏ {isUnassigned ? 'Assign PM' : 'Edit Member'}
          </button>
        </div>
      </div>
    );
  };

  const renderMemberCard = (u, teamTag) => {
    const isSuper = u.role === 'superadmin';
    const isAdm = u.role === 'admin';
    const isCur = currentUser?.email?.toLowerCase() === u.email?.toLowerCase() || (isSuper && currentUser?.role === 'superadmin');
    
    let roleBadge = '⚡ Updater';
    let badgeBg = 'rgba(20, 184, 166, 0.15)';
    let badgeCol = '#2dd4bf';

    if (isSuper) {
      roleBadge = '👑 Super Admin';
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeCol = '#f87171';
    } else if (isAdm) {
      roleBadge = '🛡 Project Manager (Admin)';
      badgeBg = 'rgba(124, 58, 237, 0.15)';
      badgeCol = '#c084fc';
    } else if (u.title?.toLowerCase().includes('exec')) {
      roleBadge = '⚡ Executive';
      badgeBg = 'rgba(0, 191, 165, 0.15)';
      badgeCol = '#00bfa5';
    } else if (u.title?.toLowerCase().includes('intern')) {
      roleBadge = '⚡ Intern';
      badgeBg = 'rgba(2, 132, 199, 0.15)';
      badgeCol = '#38bdf8';
    }

    return (
      <div
        key={u.email || u.name}
        style={{
          background: 'rgba(7, 36, 42, 0.85)',
          border: isSuper ? '1px solid rgba(239, 68, 68, 0.45)' : isAdm ? '1px solid rgba(124, 58, 237, 0.4)' : '1px solid rgba(20, 184, 166, 0.3)',
          borderRadius: 12,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
        }}
      >
        {isCur && (
          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#059669', color: '#fff' }}>
            YOU
          </span>
        )}

        {/* Top: Avatar, Name, Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <img
            src={u.avatar || SHADOW_AVATAR}
            alt={u.name}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${badgeCol}`,
              flexShrink: 0
            }}
            onError={(e) => { e.target.src = SHADOW_AVATAR; }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                {u.name}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent, #00d4c8)', fontWeight: 600, marginTop: 1 }}>
              {u.title || (isSuper ? 'Packaging Head' : isAdm ? 'Project Manager' : 'Executive')}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
              🏢 {(u.department ? u.department.replace(/\bOperations\b/gi, 'Packaging') : (u.team?.toLowerCase().includes('packaging') ? u.team : `${u.team || 'Packaging'} Packaging`))}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: badgeBg, color: badgeCol, border: `1px solid ${badgeCol}40` }}>
            {roleBadge}
          </span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
            🏷 {u.team || teamTag || 'Packaging'}
          </span>
        </div>

        {/* Contact Info (Email & Mobile) */}
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '8px 10px',
          borderRadius: 8,
          marginBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div style={{ fontSize: '10.5px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, wordBreak: 'break-all' }}>
            <span>✉</span> <a href={`mailto:${u.email}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>{u.email}</a>
          </div>
          {u.mobile ? (
            <div style={{ fontSize: '10.5px', color: '#86efac', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📞</span> <span>{u.mobile}</span>
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              📞 No mobile added
            </div>
          )}
        </div>

        {/* Authority / Description */}
        <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.4, marginBottom: 12, flex: 1 }}>
          {u.description || u.authority}
        </div>

        {/* Actions (Edit / Delete) */}
        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 'auto' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleStartEdit(u)}
            style={{
              flex: 1,
              fontSize: '10px',
              padding: '4px 8px',
              background: 'rgba(124, 58, 237, 0.2)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              color: '#d8b4fe'
            }}
          >
            ✏ Edit Member
          </button>

          {isSuperAdmin && !isSuper && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => handleDeleteMember(u)}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
              title="Remove user from team"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal modal-lg"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '1040px', width: '96%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* MODAL HEADER */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 22px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🏢</span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                Team Setup &amp; Organization Directory
              </span>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 12, background: 'rgba(0, 212, 200, 0.15)', color: '#00d4c8', fontWeight: 700 }}>
                Editable by Admin &amp; Super Admin
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Packaging Head (Alexsander) → Regular Vertical &amp; Growth Vertical (Project Manager → Executive → 3 Interns each)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleStartAdd}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>＋</span> Add Team Member
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionError && (
          <div style={{ padding: '8px 20px', background: 'rgba(239, 68, 68, 0.18)', borderBottom: '1px solid #ef4444', color: '#fca5a5', fontSize: '11.5px' }}>
            ⚠️ {actionError}
          </div>
        )}
        {actionSuccess && (
          <div style={{ padding: '8px 20px', background: 'rgba(0, 230, 118, 0.15)', borderBottom: '1px solid #00e676', color: '#69f0ae', fontSize: '11.5px' }}>
            ✅ {actionSuccess}
          </div>
        )}

        {/* TAB CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 22px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-sm ${activeTab === 'structure' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('structure')}
            >
              🏢 Team Hierarchy (Org Tree)
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('users')}
            >
              👥 All Members ({users.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('matrix')}
            >
              📊 Authority Matrix
            </button>
          </div>

          {activeTab === 'users' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'superadmin', 'admin', 'updater'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRole(r)}
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: filterRole === r ? 'var(--teal)' : 'rgba(255,255,255,0.06)',
                    color: filterRole === r ? '#062a30' : 'var(--text-muted)'
                  }}
                >
                  {r === 'all' ? `All (${users.length})` : r === 'superadmin' ? 'Super Admin' : r === 'admin' ? 'Admins' : 'Updaters'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {activeTab === 'structure' && (
            <div>
              {/* Controls bar: Title + View Mode Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🌳</span> Exact Team Structure Hierarchy
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Super Admin (Packaging Head) → 2 Vertical Branches (Regular &amp; Growth) → Project Manager → Executive → 3 Interns each
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={() => setStructureViewMode('tree')}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: structureViewMode === 'tree' ? 'var(--teal)' : 'transparent',
                      color: structureViewMode === 'tree' ? '#042024' : 'var(--text-muted)'
                    }}
                  >
                    🌳 Org Tree Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => setStructureViewMode('cards')}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: structureViewMode === 'cards' ? 'var(--teal)' : 'transparent',
                      color: structureViewMode === 'cards' ? '#042024' : 'var(--text-muted)'
                    }}
                  >
                    📋 Vertical Cards
                  </button>
                </div>
              </div>

              {structureViewMode === 'tree' ? (
                /* ── VISUAL ORG TREE DIAGRAM ── */
                <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
                  <div style={{ minWidth: '920px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* ROOT LEVEL: Alexsander (Packaging Head) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {renderTreeNode(packagingHead, {
                        defaultName: 'Alexsander',
                        defaultTitle: 'Packaging Head',
                        defaultRole: 'superadmin',
                        roleBadge: '👑 Super Admin',
                        badgeColor: '#ef4444',
                        badgeBg: 'rgba(239, 68, 68, 0.15)',
                        borderColor: '#ef4444',
                        isRoot: true,
                        defaultTeam: 'Packaging Leadership'
                      })}
                      
                      {/* Stem down from Alexsander */}
                      <div style={{ width: 2, height: 26, background: '#00d4c8' }} />
                    </div>

                    {/* HORIZONTAL CROSSBAR connecting Regular Vertical & Growth Vertical */}
                    <div style={{ width: '84%', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Crossbar connecting both vertical centers */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '25%',
                        right: '25%',
                        height: 2,
                        background: '#00d4c8'
                      }} />

                      {/* ── LEFT BRANCH: Regular Vertical ── */}
                      <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {/* Drop stem from crossbar */}
                        <div style={{ width: 2, height: 22, background: '#00d4c8' }} />

                        {/* Branch Title Pill */}
                        <div style={{
                          padding: '5px 16px',
                          borderRadius: 20,
                          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(7, 36, 42, 0.95))',
                          border: '1.5px solid #7c3aed',
                          color: '#c084fc',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          boxShadow: '0 2px 10px rgba(124, 58, 237, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span>📦</span> Regular Vertical
                        </div>

                        {/* Stem down to Project Manager */}
                        <div style={{ width: 2, height: 18, background: '#7c3aed' }} />

                        {/* Level 1: Balaji Sathishkumar (Project Manager) */}
                        {renderTreeNode(regularPM, {
                          defaultName: 'Balaji Sathishkumar',
                          defaultTitle: 'Project Manager',
                          defaultRole: 'admin',
                          roleBadge: '🛡 Project Manager (Admin)',
                          badgeColor: '#7c3aed',
                          badgeBg: 'rgba(124, 58, 237, 0.15)',
                          borderColor: '#7c3aed',
                          defaultTeam: 'Regular Vertical'
                        })}

                        {/* Stem down to Executive */}
                        <div style={{ width: 2, height: 18, background: '#00bfa5' }} />

                        {/* Level 2: Akshra Ojha (Executive) */}
                        {renderTreeNode(regularExec, {
                          defaultName: 'Akshra Ojha',
                          defaultTitle: 'Executive',
                          defaultRole: 'updater',
                          roleBadge: '⚡ Executive',
                          badgeColor: '#00bfa5',
                          badgeBg: 'rgba(0, 191, 165, 0.15)',
                          borderColor: '#00bfa5',
                          defaultTeam: 'Regular Vertical'
                        })}

                        {/* Stem down to Interns crossbar */}
                        <div style={{ width: 2, height: 18, background: '#00bfa5' }} />

                        {/* 3-Way Interns crossbar */}
                        <div style={{ width: '96%', position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '16.6%',
                            right: '16.6%',
                            height: 2,
                            background: '#00bfa5'
                          }} />

                          {[0, 1, 2].map(idx => {
                            const u = regularInterns[idx];
                            return (
                              <div key={idx} style={{ width: '31%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 2, height: 14, background: '#00bfa5' }} />
                                {renderTreeNode(u, {
                                  defaultName: `Intern ${idx + 1}`,
                                  defaultTitle: 'Intern',
                                  defaultRole: 'updater',
                                  roleBadge: `⚡ Intern ${idx + 1}`,
                                  badgeColor: '#14b8a6',
                                  badgeBg: 'rgba(20, 184, 166, 0.15)',
                                  borderColor: 'rgba(20, 184, 166, 0.45)',
                                  isCompact: true,
                                  defaultTeam: 'Regular Vertical'
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── RIGHT BRANCH: Growth Vertical ── */}
                      <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {/* Drop stem from crossbar */}
                        <div style={{ width: 2, height: 22, background: '#00d4c8' }} />

                        {/* Branch Title Pill */}
                        <div style={{
                          padding: '5px 16px',
                          borderRadius: 20,
                          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(7, 36, 42, 0.95))',
                          border: '1.5px solid #0284c7',
                          color: '#38bdf8',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span>🚀</span> Growth Vertical
                        </div>

                        {/* Stem down to Project Manager */}
                        <div style={{ width: 2, height: 18, background: '#0284c7' }} />

                        {/* Level 1: [Unassigned] (Project Manager) */}
                        {renderTreeNode(growthPM, {
                          defaultName: '[Unassigned]',
                          defaultTitle: 'Project Manager',
                          defaultRole: 'admin',
                          roleBadge: '🛡 Project Manager (Admin)',
                          badgeColor: '#0284c7',
                          badgeBg: 'rgba(2, 132, 199, 0.15)',
                          borderColor: '#0284c7',
                          isUnassigned: !growthPM || growthPM.name === '[Unassigned]',
                          defaultTeam: 'Growth Vertical'
                        })}

                        {/* Stem down to Executive */}
                        <div style={{ width: 2, height: 18, background: '#ff6d00' }} />

                        {/* Level 2: Manideep (Executive) */}
                        {renderTreeNode(growthExec, {
                          defaultName: 'Manideep',
                          defaultTitle: 'Executive',
                          defaultRole: 'updater',
                          roleBadge: '⚡ Executive',
                          badgeColor: '#ff6d00',
                          badgeBg: 'rgba(255, 109, 0, 0.15)',
                          borderColor: '#ff6d00',
                          defaultTeam: 'Growth Vertical'
                        })}

                        {/* Stem down to Interns crossbar */}
                        <div style={{ width: 2, height: 18, background: '#ff6d00' }} />

                        {/* 3-Way Interns crossbar */}
                        <div style={{ width: '96%', position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '16.6%',
                            right: '16.6%',
                            height: 2,
                            background: '#ff6d00'
                          }} />

                          {[0, 1, 2].map(idx => {
                            const u = growthInterns[idx];
                            return (
                              <div key={idx} style={{ width: '31%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 2, height: 14, background: '#ff6d00' }} />
                                {renderTreeNode(u, {
                                  defaultName: `Intern ${idx + 1}`,
                                  defaultTitle: 'Intern',
                                  defaultRole: 'updater',
                                  roleBadge: `⚡ Intern ${idx + 1}`,
                                  badgeColor: '#f59e0b',
                                  badgeBg: 'rgba(245, 158, 11, 0.15)',
                                  borderColor: 'rgba(245, 158, 11, 0.45)',
                                  isCompact: true,
                                  defaultTeam: 'Growth Vertical'
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── VERTICAL CARDS VIEW ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* 1. PACKAGING LEADERSHIP */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(239, 68, 68, 0.25)', paddingBottom: 6 }}>
                      <span style={{ fontSize: '16px' }}>👑</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171', letterSpacing: '0.5px' }}>
                        PACKAGING HEAD (SUPER ADMIN)
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                      {packagingHead && renderMemberCard(packagingHead, 'Packaging Leadership')}
                    </div>
                  </div>

                  {/* 2. REGULAR VERTICAL */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(124, 58, 237, 0.25)', paddingBottom: 6 }}>
                      <span style={{ fontSize: '16px' }}>📦</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc', letterSpacing: '0.5px' }}>
                        REGULAR VERTICAL (5 MEMBERS)
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        • Project Manager, Executive &amp; 3 Interns
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                      {regularPM && renderMemberCard(regularPM, 'Regular Vertical')}
                      {regularExec && renderMemberCard(regularExec, 'Regular Vertical')}
                      {regularInterns.filter(Boolean).map(u => renderMemberCard(u, 'Regular Vertical'))}
                    </div>
                  </div>

                  {/* 3. GROWTH VERTICAL */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(2, 132, 199, 0.25)', paddingBottom: 6 }}>
                      <span style={{ fontSize: '16px' }}>🚀</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px' }}>
                        GROWTH VERTICAL (5 MEMBERS)
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        • Project Manager, Executive &amp; 3 Interns
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                      {growthPM && renderMemberCard(growthPM, 'Growth Vertical')}
                      {growthExec && renderMemberCard(growthExec, 'Growth Vertical')}
                      {growthInterns.filter(Boolean).map(u => renderMemberCard(u, 'Growth Vertical'))}
                    </div>
                  </div>

                  {/* 4. OTHER MEMBERS (if any) */}
                  {otherMembers.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 6 }}>
                        <span style={{ fontSize: '16px' }}>🌐</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                          ADDITIONAL TEAM MEMBERS
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                        {otherMembers.map(u => renderMemberCard(u, u.team || 'Member'))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
              {filteredUsers.map(u => renderMemberCard(u, u.team))}
            </div>
          )}

          {activeTab === 'matrix' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#062024', borderBottom: '2px solid var(--teal)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-main)' }}>Action / Capability</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#f87171' }}>👑 Super Admin (Packaging Head)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c084fc' }}>🛡 Admins (Regular &amp; Growth PM)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#2dd4bf' }}>⚡ Updaters (Executives &amp; Interns)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>Operational Governance</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'rgba(7, 36, 42, 0.6)' : 'rgba(10, 42, 48, 0.3)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: '600', color: '#f1f5f9' }}>{p.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {p.superadmin ? <span style={{ color: '#34d399', fontWeight: '800' }}>✓ YES</span> : <span style={{ color: '#ef4444', fontWeight: '800' }}>✕ NO</span>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {p.admin ? <span style={{ color: '#34d399', fontWeight: '800' }}>✓ YES</span> : <span style={{ color: '#64748b', fontWeight: '800' }}>✕ NO</span>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {p.updater ? <span style={{ color: '#34d399', fontWeight: '800' }}>✓ YES</span> : <span style={{ color: '#f87171', fontWeight: '800' }}>✕ NO</span>}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '10px' }}>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="modal-foot" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 22px', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Super Admin &amp; Admin can edit roles, titles, phone numbers, and display pictures.
          </div>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close Team Setup
          </button>
        </div>
      </div>

      {/* ── EDIT MEMBER SUB-MODAL (ONE BELOW THE OTHER) ── */}
      {editingUser && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1200 }} 
          onClick={() => setEditingUser(null)}
        >
          <div 
            className="modal-box" 
            style={{ maxWidth: 480, width: '92%', borderRadius: 14, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(124, 58, 237, 0.12)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  ✏ Edit Team Member: {editingUser.name}
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Email: {editingUser.email}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '20px' }}>
              {/* 1. Display Picture (Upload & Shadow Fallback) */}
              <div style={{
                marginBottom: 16,
                padding: '12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>
                  Display Picture
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img
                    src={formData.avatar || SHADOW_AVATAR}
                    alt="avatar"
                    style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent, #7c3aed)', flexShrink: 0 }}
                    onError={(e) => { e.target.src = SHADOW_AVATAR; }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="file"
                        ref={editFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleEditFileUpload}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => editFileInputRef.current?.click()}
                        style={{ fontSize: '10.5px' }}
                      >
                        📁 Upload Picture
                      </button>
                      {formData.avatar && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setFormData({ ...formData, avatar: '' })}
                          style={{ fontSize: '10.5px', color: '#f87171' }}
                        >
                          🗑 Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Name (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* 3. Work Email (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Work Email Address *
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* 4. Mobile Number (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Mobile Number 📞
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 5. Title / Position (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Title / Position
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Project Manager, Executive, Intern"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 6. Team Assignment (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Team Assignment
                </label>
                <select
                  className="form-control"
                  value={formData.team}
                  onChange={e => setFormData({ ...formData, team: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="Regular Vertical">Regular Vertical</option>
                  <option value="Growth Vertical">Growth Vertical</option>
                  <option value="Packaging Leadership">Packaging Leadership</option>
                </select>
              </div>

              {/* 7. Role (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  System Role &amp; Access Level
                </label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  disabled={!isSuperAdmin && editingUser.role === 'admin'}
                  style={{ width: '100%' }}
                >
                  {isSuperAdmin && <option value="superadmin">👑 Packaging Head (Super Admin)</option>}
                  {isSuperAdmin && <option value="admin">🛡 Project Manager (Admin)</option>}
                  <option value="updater">⚡ Executive / Intern (Updater)</option>
                </select>
              </div>

              {/* 8. Department (One below the other) */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Department / Organization Unit
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Regular Vertical Packaging"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingUser(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER SUB-MODAL (ONE BELOW THE OTHER) ── */}
      {isAddModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1200 }} 
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="modal-box" 
            style={{ maxWidth: 480, width: '92%', borderRadius: 14, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 212, 200, 0.12)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  ＋ Onboard New Team Member
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Assign to Regular, Growth, or Leadership team
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveAdd} style={{ padding: '20px' }}>
              {/* 1. Display Picture (Upload & Shadow Fallback) */}
              <div style={{
                marginBottom: 16,
                padding: '12px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>
                  Display Picture
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img
                    src={formData.avatar || SHADOW_AVATAR}
                    alt="avatar"
                    style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #00d4c8', flexShrink: 0 }}
                    onError={(e) => { e.target.src = SHADOW_AVATAR; }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="file"
                        ref={addFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAddFileUpload}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => addFileInputRef.current?.click()}
                        style={{ fontSize: '10.5px' }}
                      >
                        📁 Upload Picture
                      </button>
                      {formData.avatar && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setFormData({ ...formData, avatar: '' })}
                          style={{ fontSize: '10.5px', color: '#f87171' }}
                        >
                          🗑 Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Full Name (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* 3. Work Email (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* 4. Mobile Number (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Mobile Number 📞
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 5. Title / Position (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Title / Position
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Project Manager, Executive, Intern"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* 6. Team Assignment (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Team Assignment
                </label>
                <select
                  className="form-control"
                  value={formData.team}
                  onChange={e => setFormData({ ...formData, team: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="Regular Vertical">Regular Vertical</option>
                  <option value="Growth Vertical">Growth Vertical</option>
                  <option value="Packaging Leadership">Packaging Leadership</option>
                </select>
              </div>

              {/* 7. Role (One below the other) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  System Role &amp; Access Level
                </label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="updater">⚡ Executive / Intern (Updater)</option>
                  {isSuperAdmin && <option value="admin">🛡 Project Manager (Admin)</option>}
                  {isSuperAdmin && <option value="superadmin">👑 Packaging Head (Super Admin)</option>}
                </select>
              </div>

              {/* 8. Initial Password (One below the other) */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  Initial Password
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="User@2024"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
