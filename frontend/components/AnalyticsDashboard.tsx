'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Target, Clock, CheckCircle, Users, Briefcase } from 'lucide-react';
import { applicationApi, type Application } from '@/lib/api';

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byAppliedVia: Record<string, number>;
}

interface AnalyticsProps {
  stats: Stats;
  applications: Application[];
}

export default function AnalyticsDashboard({ stats, applications }: AnalyticsProps) {
  const responseRate = stats.total > 0
    ? Math.round(((stats.byStatus?.interview || 0) + (stats.byStatus?.offer || 0) + (stats.byStatus?.rejected || 0)) / stats.total * 100)
    : 0;

  const interviewRate = stats.total > 0
    ? Math.round((stats.byStatus?.interview || 0) / stats.total * 100)
    : 0;

  const offerRate = stats.total > 0
    ? Math.round((stats.byStatus?.offer || 0) / stats.total * 100)
    : 0;

  const statusLabels: Record<string, string> = {
    applied: 'Applied',
    in_review: 'In Review',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected',
    accepted: 'Accepted'
  };

  const statusColors: Record<string, string> = {
    applied: 'bg-blue-500',
    in_review: 'bg-yellow-500',
    interview: 'bg-purple-500',
    offer: 'bg-green-500',
    rejected: 'bg-red-500',
    accepted: 'bg-green-600'
  };

  const maxCount = Math.max(...Object.values(stats.byStatus || {}), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Application Analytics</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total || 0}</p>
              <p className="text-sm text-gray-500">Total Applications</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{responseRate}%</p>
              <p className="text-sm text-gray-500">Response Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{interviewRate}%</p>
              <p className="text-sm text-gray-500">Interview Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{offerRate}%</p>
              <p className="text-sm text-gray-500">Offer Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold mb-4">Applications by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-600">{statusLabels[status]}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`${statusColors[status]} h-2 rounded-full transition-all`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-sm font-medium text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold mb-4">Application Methods</h3>
          <div className="flex items-center gap-8">
            <div className="space-y-2">
              {Object.entries(stats.byAppliedVia || {}).map(([via, count]) => (
                <div key={via} className="flex items-center gap-2">
                  <span className="text-sm capitalize text-gray-600">{via.replace('_', ' ')}</span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {Object.entries(stats.byAppliedVia || {}).reduce((acc, [via, count], i, arr) => {
                    const total = arr.reduce((sum, [, c]) => sum + c, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const dashArr = `${pct} ${100 - pct}`;
                    acc.push(
                      <circle
                        key={via}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={via === 'manual' ? '#4F46E5' : '#10B981'}
                        strokeWidth="4"
                        strokeDasharray={dashArr}
                        strokeDashoffset={-acc.reduce((s: number, _: unknown, idx: number) => {
                          const p = (arr[idx - 1]?.[1] || 0) / total * 100;
                          return s + (idx === 0 ? 0 : p);
                        }, 0)}
                      />
                    );
                    return acc;
                  }, [] as any)}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {applications.slice(0, 5).map(app => (
            <div key={app.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-sm">
                  {app.job?.title || 'Manual Application'}
                </p>
                <p className="text-xs text-gray-500">
                  {app.job?.company || ''} • Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                app.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                app.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                app.status === 'offer' ? 'bg-green-100 text-green-700' :
                app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'
              }`}>
                {statusLabels[app.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}