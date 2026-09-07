import React, { useState, useEffect } from 'react';
import {
  getMe, logout, getProjects, createProject, updateProject, deleteProject,
  advanceProject, revokeProject, launchProject, changeBriefDate,
  advanceMaterial, revokeMaterial, saveSpecs, getLogs, getSeenAt
} from './api';

import AuthScreen from './components/Auth/AuthScreen';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Toast from './components/Toast';

import Dashboard from './components/Dashboard/Dashboard';
import Tracker from './components/Tracker/Tracker';
import Gantt from './components/Gantt/Gantt';
import StageGuide from './components/StageGuide/StageGuide';
import RACI from './components/RACI/RACI';
import Risks from './components/Risks/Risks';

import AddProjectModal from './components/Modals/AddProjectModal';
import LaunchModal from './components/Modals/LaunchModal';
import BriefModal from './components/Modals/BriefModal';
import DetailModal from './components/Modals/DetailModal';
import SpecModal from './components/Tracker/SpecModal';

import { fmt, getProjectStage } from './utils';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [seenAt, setSeenAt] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const [launchModalState, setLaunchModalState] = useState({ isOpen: false, project: null });
  const [briefModalState, setBriefModalState] = useState({ isOpen: false, project: null });
  const [detailModalState, setDetailModalState] = useState({ isOpen: false, project: null });
  const [specModalData, setSpecModalData] = useState(null);

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3300);
  };

  // Session Restore
  useEffect(() => {
    getMe()
      .then(res => {
        setCurrentUser(res.data.user);
        fetchProjects();
        fetchLogs(res.data.user);
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data.projects);
    } catch (e) {
      showToast('⚠ Error fetching projects', true);
    }
  };

  const fetchLogs = async (user) => {
    const usr = user || currentUser;
    if (!usr || !['admin', 'superadmin'].includes(usr.role)) return;
    try {
      const [lRes, sRes] = await Promise.all([getLogs(), getSeenAt()]);
      setLogs(lRes.data.logs);
      setSeenAt(sRes.data.seenAt);
    } catch (e) {}
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setProjects([]);
      setLogs([]);
    } catch (e) {}
  };

  const handleFilterStage = (stage) => {
    setStageFilter(stage);
    setActiveTab('tracker');
  };

  const handleSaveProject = async (formData, editId) => {
    try {
      if (editId) {
        const res = await updateProject(editId, formData);
        showToast(`✅ Updated ${res.data.project.projectName}`);
      } else {
        const res = await createProject(formData);
        showToast(`✨ Created ${res.data.project.projectName}`);
      }
      setIsAddModalOpen(false);
      setEditProject(null);
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Failed to save project', true);
    }
  };

  const handleDeleteProject = async (pid) => {
    if (!window.confirm('Delete this project permanently?')) return;
    try {
      await deleteProject(pid);
      showToast('🗑 Project deleted');
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast('⚠ Delete failed', true);
    }
  };

  const handleAdvanceProject = async (pid) => {
    try {
      const res = await advanceProject(pid);
      showToast(`▶ Advanced to stage: ${getProjectStage(res.data.project)}`);
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Failed to advance', true);
    }
  };

  const handleRevokeProject = async (pid) => {
    if (!window.confirm('Revoke project to previous stage?')) return;
    try {
      const res = await revokeProject(pid);
      showToast(`↩ Revoked to stage: ${getProjectStage(res.data.project)}`);
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Failed to revoke', true);
    }
  };

  const handleConfirmLaunch = async (pid, date) => {
    try {
      const res = await launchProject(pid, date);
      showToast(`🚀 LAUNCHED! Commercial date: ${fmt(date)}`);
      setLaunchModalState({ isOpen: false, project: null });
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Launch failed', true);
    }
  };

  const handleConfirmBriefDate = async (pid, briefDate) => {
    try {
      await changeBriefDate(pid, briefDate);
      showToast(`📅 Brief date set to ${fmt(briefDate)} — Milestones recalculated`);
      setBriefModalState({ isOpen: false, project: null });
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Recalculation failed', true);
    }
  };

  const handleAdvanceMaterial = async (pid, mIdx) => {
    try {
      const res = await advanceMaterial(pid, mIdx);
      if (res.data.canLaunch) {
        showToast('🎉 All materials at Connectivity! Ready to launch!');
      } else {
        showToast(`▶ Material advanced`);
      }
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Advance failed', true);
    }
  };

  const handleRevokeMaterial = async (pid, mIdx) => {
    try {
      await revokeMaterial(pid, mIdx);
      showToast('↩ Material stage revoked');
      fetchProjects();
      fetchLogs();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Revoke failed', true);
    }
  };

  const handleOpenSpecModal = (pid, mIdx) => {
    const p = projects.find(x => x.id === pid);
    if (!p || !p.materials[mIdx]) return;
    setSpecModalData({ project: p, material: p.materials[mIdx], mIdx });
  };

  const handleSaveSpecs = async (pid, mIdx, specs) => {
    try {
      await saveSpecs(pid, mIdx, specs);
      showToast('📋 Specifications saved');
      setSpecModalData(null);
      fetchProjects();
    } catch (e) {
      showToast(e.response?.data?.error || '⚠ Failed to save specs', true);
    }
  };

  const handleProjectUpdated = (updatedProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const exportCSV = () => {
    if (!projects.length) { showToast('⚠ No data to export', true); return; }
    const headers = ['ID','FG Code','Project Name','Grammage','Stage','Status','Risk','Brief Date','Target Launch','Actual Launch','Supplier','Factory','Comments'];
    const rows = projects.map(p => [
      p.id, p.fgCode || '', `"${(p.projectName || '').replace(/"/g, '""')}"`, p.grammage || '',
      getProjectStage(p), p.status, p.risk, p.briefDate || '', p.targetLaunchDate || '', p.launchDate || '',
      `"${(p.supplier || '').replace(/"/g, '""')}"`, `"${(p.factory || '').replace(/"/g, '""')}"`, `"${(p.comments || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PKG_Tracker_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-dark)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)', fontFamily: 'var(--font-family)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '16px' }}>📦</div>
          <div style={{ fontWeight: '800', letterSpacing: '1.5px', fontSize: '13px' }}>INITIALIZING SAAS DASHBOARD...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(u) => { setCurrentUser(u); fetchProjects(); fetchLogs(u); }} showToast={showToast} />;
  }

  const unreadCount = logs.filter(e => e.timestamp > (seenAt || 0)).length;

  return (
    <div className="app-layout">
      {/* ENTERPRISE SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        logs={logs}
        onOpenNotif={() => setActiveTab('tracker')}
      />

      {/* MAIN SAAS CONTAINER */}
      <div className="main-content">
        <Header
          activeTab={activeTab}
          currentUser={currentUser}
          onOpenAddModal={() => { setEditProject(null); setIsAddModalOpen(true); }}
          logs={logs}
          seenAt={seenAt}
          onLogsMarkedSeen={(ts) => setSeenAt(ts)}
          exportCSV={exportCSV}
        />

        <div className="page-container">
          {activeTab === 'dashboard' && (
            <Dashboard
              projects={projects}
              onFilterStage={handleFilterStage}
              onSwitchToTracker={() => setActiveTab('tracker')}
              onOpenAddModal={() => { setEditProject(null); setIsAddModalOpen(true); }}
              canEdit={['admin', 'editor', 'superadmin'].includes(currentUser.role)}
            />
          )}

          {activeTab === 'tracker' && (
            <Tracker
              projects={projects}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              currentUser={currentUser}
              onOpenAddModal={() => { setEditProject(null); setIsAddModalOpen(true); }}
              onOpenEditModal={(p) => { setEditProject(p); setIsAddModalOpen(true); }}
              onDeleteProject={handleDeleteProject}
              onAdvanceProject={handleAdvanceProject}
              onRevokeProject={handleRevokeProject}
              onOpenLaunchModal={(pid) => setLaunchModalState({ isOpen: true, project: projects.find(x => x.id === pid) })}
              onOpenBriefModal={(pid) => setBriefModalState({ isOpen: true, project: projects.find(x => x.id === pid) })}
              onOpenDetailModal={(p) => setDetailModalState({ isOpen: true, project: p })}
              onAdvanceMaterial={handleAdvanceMaterial}
              onRevokeMaterial={handleRevokeMaterial}
              onOpenSpecModal={handleOpenSpecModal}
              onProjectUpdated={handleProjectUpdated}
              showToast={showToast}
            />
          )}

          {activeTab === 'gantt' && <Gantt projects={projects} />}
          {activeTab === 'stages' && <StageGuide />}
          {activeTab === 'raci' && <RACI />}
          {activeTab === 'risks' && <Risks />}
        </div>
      </div>

      <Toast toast={toast} />

      {/* MODALS */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditProject(null); }}
        onSave={handleSaveProject}
        editProject={editProject}
      />

      <LaunchModal
        isOpen={launchModalState.isOpen}
        project={launchModalState.project}
        onClose={() => setLaunchModalState({ isOpen: false, project: null })}
        onConfirm={handleConfirmLaunch}
      />

      <BriefModal
        isOpen={briefModalState.isOpen}
        project={briefModalState.project}
        onClose={() => setBriefModalState({ isOpen: false, project: null })}
        onConfirm={handleConfirmBriefDate}
      />

      <DetailModal
        isOpen={detailModalState.isOpen}
        project={detailModalState.project}
        onClose={() => setDetailModalState({ isOpen: false, project: null })}
      />

      <SpecModal
        specData={specModalData}
        onClose={() => setSpecModalData(null)}
        onSave={handleSaveSpecs}
        canEdit={['admin', 'editor', 'superadmin'].includes(currentUser.role)}
      />
    </div>
  );
}
