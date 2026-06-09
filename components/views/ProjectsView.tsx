'use client';
import { toast } from '@/app/context/ToastContext';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useApp } from '@/app/context/AppContext';
import PageHeader from '../ui/PageHeader';
import LayoutContainer from '../ui/LayoutContainer';
import { getDetailedProjectsAction, getProjectUnitsAction } from '@/app/actions/projects';
import ProjectsOverview from '@/components/projects/ProjectsOverview';
import ProjectDetail from '@/components/projects/ProjectDetail';

interface TelemetryEvent {
  id: string;
  type: string;
  projectId: number | string;
  timestamp: string;
  actorId: string;
  payload: any;
}

export default function ProjectsView() {
  const { hasPermission } = useAuth();
  const { lang } = useApp();
  const isArabic = lang === 'AR';

  const [selectedProjectId, setSelectedProjectId] = useState<number | string | null>(null);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [projectUnits, setProjectUnits] = useState<any[]>([]);
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([
    {
      id: 'evt_init',
      type: 'system.initialized',
      projectId: 0,
      timestamp: new Date().toISOString(),
      actorId: 'system_core',
      payload: { message: 'تهيئة منصة مراقبة المشاريع العقارية بنجاح' }
    }
  ]);

  useEffect(() => {
    async function loadProjects() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const result = await getDetailedProjectsAction();
        const data = result && 'data' in result ? result.data : (Array.isArray(result) ? result : []);
        if (data && data.length > 0) {
          setUsingFallback(false);
          setProjectsList(data.map((p: any) => ({
            id: p.id, name: p.name, location: p.city,
            status: p.status === 'COMPLETED' ? 'مكتمل' : p.status === 'PLANNING' ? 'مخطط له' : 'قيد الإنشاء',
            unitsTotal: p.unitsTotal, unitsSold: p.unitsSold, progressPercent: p.progressPercent,
            description: p.description || '', createdAt: p.createdAt, updatedAt: p.createdAt,
          })));
          addTelemetryEvent('api.projects_loaded', 0, { count: data.length });
        } else {
          setUsingFallback(true);
          setProjectsList([]);
          addTelemetryEvent('api.projects_loaded_fallback', 0, { count: 0 });
        }
      } catch (err: any) {
        setUsingFallback(true);
        setFetchError(err.message);
        setProjectsList([]);
        addTelemetryEvent('api.error', 0, { error: err.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  const addTelemetryEvent = (type: string, projId: number | string, payload: any) => {
    const newEvent: TelemetryEvent = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      projectId: projId,
      timestamp: new Date().toISOString(),
      actorId: 'usr_active',
      payload
    };
    setTelemetryLogs(prev => [newEvent, ...prev]);
  };

  const handleSelectProject = async (id: number | string) => {
    setSelectedProjectId(id);
    addTelemetryEvent('project.opened', id, { name: projectsList.find(p => p.id === id)?.name });
    try {
      const dbUnits = await getProjectUnitsAction(String(id));
      setProjectUnits(dbUnits);
      addTelemetryEvent('api.units_loaded', id, { count: dbUnits.length });
    } catch {
      setProjectUnits([]);
    }
  };

  const handleRefreshProjects = async () => {
    try {
      const refreshResult2 = await getDetailedProjectsAction();
      const refreshData2 = refreshResult2 && 'data' in refreshResult2 ? refreshResult2.data : (Array.isArray(refreshResult2) ? refreshResult2 : []);
      if (refreshData2 && refreshData2.length > 0) {
        setUsingFallback(false);
        setProjectsList(refreshData2.map((p: any) => ({
          id: p.id, name: p.name, location: p.city,
          status: p.status === 'COMPLETED' ? 'مكتمل' : p.status === 'PLANNING' ? 'مخطط له' : 'قيد الإنشاء',
          unitsTotal: p.unitsTotal, unitsSold: p.unitsSold, progressPercent: p.progressPercent,
          description: p.description || '', createdAt: p.createdAt, updatedAt: p.createdAt,
        })));
      }
    } catch {
      // Silently handle refresh errors
    }
  };

  const selectedProject = projectsList.find(p => p.id === selectedProjectId);

  return (
    <>
      {!selectedProjectId ? (
        <ProjectsOverview
          projects={projectsList}
          isLoading={isLoading}
          usingFallback={usingFallback}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectProject={handleSelectProject}
          onRefresh={handleRefreshProjects}
          hasPermission={hasPermission}
          lang={lang}
          isArabic={isArabic}
        />
      ) : selectedProject && (
        <ProjectDetail
          project={selectedProject}
          phases={[]}
          units={projectUnits}
          reports={[]}
          documents={[]}
          bookings={[]}
          accounting={{ contractsTotal: 0, collected: 0, outstanding: 0 }}
          hasPermission={hasPermission}
          onBack={() => {
            setSelectedProjectId(null);
            addTelemetryEvent('project.closed', selectedProject.id, { name: selectedProject.name });
          }}
          lang={lang}
          isArabic={isArabic}
          addTelemetryEvent={addTelemetryEvent}
        />
      )}
    </>
  );
}
