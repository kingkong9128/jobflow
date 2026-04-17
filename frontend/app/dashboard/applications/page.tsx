'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Clock, CheckCircle, XCircle, MessageSquare, Plus, Calendar, ChevronDown, ChevronUp, X, Save, BarChart3 } from 'lucide-react';
import { applicationApi, jobApi, cvApi, type Application, type Job, type BaseCV } from '@/lib/api';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  applied: { label: 'Applied', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Clock },
  in_review: { label: 'In Review', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  interview: { label: 'Interview', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: MessageSquare },
  offer: { label: 'Offer', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle }
};

const columns = ['applied', 'in_review', 'interview', 'offer', 'rejected', 'accepted'];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCvId, setSelectedCvId] = useState('');
  const [draggedApp, setDraggedApp] = useState<Application | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'analytics'>('kanban');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, jobsData, cvsData, statsData] = await Promise.all([
        applicationApi.list(),
        jobApi.saved(),
        cvApi.list(),
        applicationApi.stats()
      ]);
      setApplications(appsData.applications);
      setSavedJobs(jobsData.jobs);
      setCvs(cvsData.cvs || []);
      setStats(statsData);
      if (cvsData.cvs?.length > 0) {
        setSelectedCvId(cvsData.cvs[0].id);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await applicationApi.update(id, { status });
      setApplications(prev =>
        prev.map(app => app.id === id ? { ...app, status } : app)
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddApplication = async () => {
    if (!selectedJobId && !selectedCvId) return;

    try {
      const newApp = await applicationApi.create({
        jobId: selectedJobId || undefined,
        baseCvId: selectedCvId || undefined,
        appliedVia: 'manual'
      });

      const newAppWithJob = {
        ...newApp,
        job: selectedJobId ? savedJobs.find(j => j.id === selectedJobId) : undefined
      };

      setApplications(prev => [newAppWithJob, ...prev]);
      setShowAddModal(false);
      setSelectedJobId('');
    } catch (error) {
      console.error('Failed to create application:', error);
    }
  };

  const handleSaveNotes = async (appId: string) => {
    try {
      await applicationApi.update(appId, { notes });
      setApplications(prev =>
        prev.map(app => app.id === appId ? { ...app, notes } : app)
      );
      setEditingNotes(null);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, app: Application) => {
    setDraggedApp(app);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedApp && draggedApp.status !== newStatus) {
      await handleStatusChange(draggedApp.id, newStatus);
    }
    setDraggedApp(null);
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
    setDragOverColumn(null);
  };

  const toggleExpand = (appId: string) => {
    setExpandedApp(expandedApp === appId ? null : appId);
  };

  if (loading) {
    return <div className="flex justify-center py-16">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>{stats.total || 0} total</span>
            {stats.byStatus?.applied && <span>• {stats.byStatus.applied} applied</span>}
            {stats.byStatus?.interview && <span>• {stats.byStatus.interview} interviews</span>}
            {stats.byStatus?.offer && <span>• {stats.byStatus.offer} offers</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'kanban' ? 'bg-white shadow text-primary' : 'text-gray-600'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'analytics' ? 'bg-white shadow text-primary' : 'text-gray-600'
              }`}
            >
              Analytics
            </button>
          </div>
          {view === 'kanban' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus size={18} />
              Add Application
            </button>
          )}
        </div>
      </div>

      {view === 'analytics' ? (
        <AnalyticsDashboard stats={stats} applications={applications} />
      ) : (
        <>
          {applications.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No applications yet</p>
          <p className="text-sm">Track your job applications by adding them here</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(status => {
            const config = statusConfig[status];
            const apps = applications.filter(app => app.status === status);
            const Icon = config.icon;
            const isDropTarget = dragOverColumn === status;
            
            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex-shrink-0 w-[280px] bg-gray-100 rounded-xl p-4 transition-colors ${
                  isDropTarget ? 'bg-primary/10 ring-2 ring-primary/50' : ''
                }`}
              >
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ${config.color} mb-4`}>
                  <Icon size={16} />
                  <span className="font-medium">{config.label}</span>
                  <span className="ml-auto font-bold">{apps.length}</span>
                </div>
                
                <div className="space-y-3 min-h-[200px]">
                  {apps.map(app => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                        draggedApp?.id === app.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div
                        onClick={() => toggleExpand(app.id)}
                        className="cursor-pointer"
                      >
                        {app.job ? (
                          <div>
                            <h4 className="font-medium text-sm truncate">{app.job.title}</h4>
                            <p className="text-xs text-gray-500 truncate">{app.job.company}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Manual application</p>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                          <span>
                            {app.appliedAt
                              ? new Date(app.appliedAt).toLocaleDateString()
                              : 'No date'}
                          </span>
                          {expandedApp === app.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </div>
                      </div>

                      {expandedApp === app.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          {app.job && (
                            <div className="text-xs">
                              <p className="text-gray-500">Location: {app.job.location || '-'}</p>
                              {app.job.remote && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  Remote
                                </span>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Notes</label>
                            {editingNotes === app.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Add notes..."
                                  className="w-full text-sm p-2 border border-gray-200 rounded resize-none"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveNotes(app.id)}
                                    className="flex items-center gap-1 text-xs px-2 py-1 bg-primary text-white rounded"
                                  >
                                    <Save size={12} />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingNotes(null)}
                                    className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingNotes(app.id);
                                  setNotes(app.notes || '');
                                }}
                                className="text-sm text-gray-700 min-h-[40px] p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                              >
                                {app.notes || 'Click to add notes...'}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {app.job?.url && (
                              <a
                                href={app.job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                View Posting
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (app.job) {
                                  window.location.href = `/dashboard/tailor/${app.job.id}`;
                                }
                              }}
                              className="text-xs px-2 py-1 bg-secondary text-white rounded hover:bg-secondary/90"
                            >
                              Tailor CV
                            </button>
                          </div>

                          <div className="text-xs text-gray-400 pt-2 border-t">
                            Applied via: {app.appliedVia}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Application</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Saved Jobs</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- None --</option>
                  {savedJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.title} at {job.company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-gray-400">or</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">With CV</label>
                <select
                  value={selectedCvId}
                  onChange={(e) => setSelectedCvId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {cvs.map(cv => (
                    <option key={cv.id} value={cv.id}>
                      {cv.originalFileName || cv.fileName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApplication}
                disabled={!selectedJobId && !selectedCvId}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Add Application
              </button>
            </div>
          </div>
        </div>
      )}