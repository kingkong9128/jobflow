'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Check, X, Edit2, Save } from 'lucide-react';
import { cvApi, type ParsedCV, type BaseCV } from '@/lib/api';

export default function CVPage() {
  const [cv, setCv] = useState<BaseCV | null>(null);
  const [editing, setEditing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCV | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError('');
    
    try {
      const result = await cvApi.upload(file);
      setCv(result);
      setParsedData(result.parsedData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process CV');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx'))) {
      handleFileUpload(file);
    } else {
      setError('Please upload a PDF or DOCX file');
    }
  }, [handleFileUpload]);

  const handleInputChange = (field: string, value: any) => {
    setParsedData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleExperienceChange = (index: number, field: string, value: string) => {
    setParsedData(prev => {
      if (!prev) return null;
      const experience = [...prev.experience];
      experience[index] = { ...experience[index], [field]: value };
      return { ...prev, experience };
    });
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    setParsedData(prev => {
      if (!prev) return null;
      const education = [...prev.education];
      education[index] = { ...education[index], [field]: value };
      return { ...prev, education };
    });
  };

  const handleSkillsChange = (value: string) => {
    setParsedData(prev => prev ? { ...prev, skills: value.split(',').map(s => s.trim()) } : null);
  };

  const handleSave = async () => {
    if (!cv || !parsedData) return;
    
    try {
      await cvApi.update(cv.id, parsedData);
      setEditing(false);
    } catch (err) {
      setError('Failed to save changes');
    }
  };

  const handleCancel = () => {
    if (cv) {
      setParsedData(cv.parsedData);
    }
    setEditing(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My CV</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={18} /></button>
        </div>
      )}

      {!cv && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary/50 transition-colors"
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Upload your CV</h3>
          <p className="text-gray-500 mb-4">PDF or DOCX, max 10MB</p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg cursor-pointer hover:bg-primary/90">
            <FileText size={20} />
            Choose File
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
          {uploading && <p className="mt-4 text-gray-500">Processing...</p>}
        </div>
      )}

      {cv && parsedData && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="text-primary" size={24} />
              <div>
                <p className="font-medium">{cv.fileName || cv.originalFileName}</p>
                <p className="text-sm text-gray-500">Uploaded {new Date(cv.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Edit2 size={18} />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Save size={18} />
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {editing ? (
                  <input
                    value={parsedData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="py-2">{parsedData.name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {editing ? (
                  <input
                    value={parsedData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="py-2">{parsedData.email || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {editing ? (
                  <input
                    value={parsedData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="py-2">{parsedData.phone || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                {editing ? (
                  <input
                    value={parsedData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <p className="py-2">{parsedData.location || '-'}</p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              {editing ? (
                <textarea
                  value={parsedData.summary || ''}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              ) : (
                <p className="py-2 text-gray-700">{parsedData.summary || '-'}</p>
              )}
            </div>

            {/* Experience */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Experience</h3>
              <div className="space-y-4">
                {parsedData.experience.map((exp, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        {editing ? (
                          <input
                            value={exp.title || ''}
                            onChange={(e) => handleExperienceChange(i, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p className="font-medium">{exp.title || '-'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Company</label>
                        {editing ? (
                          <input
                            value={exp.company || ''}
                            onChange={(e) => handleExperienceChange(i, 'company', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p>{exp.company || '-'}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      {editing ? (
                        <textarea
                          value={exp.description || ''}
                          onChange={(e) => handleExperienceChange(i, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{exp.description || '-'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Education</h3>
              <div className="space-y-4">
                {parsedData.education.map((edu, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Degree</label>
                        {editing ? (
                          <input
                            value={edu.degree || ''}
                            onChange={(e) => handleEducationChange(i, 'degree', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p className="font-medium">{edu.degree || '-'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Institution</label>
                        {editing ? (
                          <input
                            value={edu.institution || ''}
                            onChange={(e) => handleEducationChange(i, 'institution', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p>{edu.institution || '-'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Skills</h3>
              {editing ? (
                <textarea
                  value={parsedData.skills?.join(', ') || ''}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  placeholder="Skill 1, Skill 2, Skill 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {parsedData.skills?.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {skill}
                    </span>
                  )) || <span className="text-gray-400">No skills listed</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}