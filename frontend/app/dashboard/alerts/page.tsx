'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Mail, Pause, Play, RefreshCw, CheckCircle, X } from 'lucide-react';
import { alertApi, type JobAlert } from '@/lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    keywords: '',
    location: '',
    remote: false,
    frequency: 'daily' as 'daily' | 'weekly'
  });
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { count: number; jobs: any[] }>>({});

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertApi.list();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.keywords) return;
    
    setCreating(true);
    try {
      const newAlert = await alertApi.create({
        name: form.name || undefined,
        keywords: form.keywords,
        location: form.location || undefined,
        remote: form.remote,
        frequency: form.frequency
      });
      
      setAlerts([newAlert, ...alerts]);
      setForm({ name: '', keywords: '', location: '', remote: false, frequency: 'daily' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create alert:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await alertApi.delete(id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const updated = await alertApi.update(id, { active: !currentActive });
      setAlerts(alerts.map(a => a.id === id ? updated : a));
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await alertApi.test(id);
      setTestResults(prev => ({
        ...prev,
        [id]: { count: result.totalMatches, jobs: result.matchingJobs }
      }));
    } catch (error) {
      console.error('Failed to test alert:', error);
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Job Alerts</h1>
          <p className="text-gray-500 mt-1">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} configured
            • Get emailed when matching jobs are posted
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <Plus size={18} />
          Create Alert
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <h3 className="font-semibold mb-4">Create Job Alert</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Name (optional)</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Senior Developer Jobs"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords *</label>
              <input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="e.g., Software Engineer, React, Python"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., London, UK or leave empty for all"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as 'daily' | 'weekly' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.remote}
                  onChange={(e) => setForm({ ...form, remote: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <span>Remote jobs only</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!form.keywords || creating}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Alert'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-500">
          <Bell size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No job alerts yet</p>
          <p className="text-sm">Create an alert to get notified when matching jobs are posted</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${alert.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                    {alert.active ? <Mail size={20} /> : <Bell size={20} />}
                  </div>
                  <div>
                    <h4 className="font-medium">{alert.name || alert.criteria.keywords}</h4>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">{alert.criteria.keywords}</span>
                      {alert.criteria.location && ` • ${alert.criteria.location}`}
                      {alert.criteria.remote && ' • Remote only'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {alert.frequency === 'daily' ? 'Daily email' : 'Weekly email'} • 
                      Last sent: {alert.lastSentAt ? new Date(alert.lastSentAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(alert.id)}
                    disabled={testingId === alert.id}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Test alert - see matching jobs"
                  >
                    {testingId === alert.id ? (
                      <div className="animate-spin h-4 w-4 border border-gray-300 border-t-primary rounded-full" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => handleToggleActive(alert.id, alert.active)}
                    className={`p-2 rounded-lg ${alert.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={alert.active ? 'Pause alert' : 'Resume alert'}
                  >
                    {alert.active ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete alert"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {testResults[alert.id] && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      Found {testResults[alert.id].count} matching jobs
                    </span>
                    <button
                      onClick={() => setTestResults(prev => {
                        const next = { ...prev };
                        delete next[alert.id];
                        return next;
                      })}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {testResults[alert.id].jobs.slice(0, 3).map((job, i) => (
                      <div key={i} className="text-sm p-2 bg-white rounded border border-gray-100">
                        <p className="font-medium">{job.title}</p>
                        <p className="text-gray-500 text-xs">{job.company} • {job.location || 'Location not specified'}</p>
                      </div>
                    ))}
                    {testResults[alert.id].count > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        + {testResults[alert.id].count - 3} more jobs
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}