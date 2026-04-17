'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Mail, CheckCircle, Target, Sparkles } from 'lucide-react';
import { jobApi, cvApi, aiApi, exportApi, type Job, type BaseCV, type ParsedCV } from '@/lib/api';

export default function TailorJobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [cv, setCv] = useState<BaseCV | null>(null);
  const [tailoredCV, setTailoredCV] = useState<ParsedCV | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.jobId]);

  const loadData = async () => {
    try {
      const [savedJobsData, cvData] = await Promise.all([
        jobApi.saved(),
        cvApi.list()
      ]);

      const foundJob = savedJobsData.jobs.find((j: Job) => j.id === params.jobId);
      setJob(foundJob || null);

      if (cvData.cvs.length > 0) {
        setCv(cvData.cvs[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleTailorCV = async () => {
    if (!cv || !job?.description) return;

    setTailoring(true);
    try {
      const result = await aiApi.tailor(cv.id, job.description, job.id);
      setTailoredCV(result.tailoredCV);
      setMatchScore(result.matchScore);
    } catch (error) {
      console.error('Failed to tailor CV:', error);
    } finally {
      setTailoring(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!cv || !job?.description) return;

    setGeneratingCover(true);
    try {
      const result = await aiApi.coverLetter(cv.id, job.description, job.company);
      setCoverLetter(result.coverLetter);
    } catch (error) {
      console.error('Failed to generate cover letter:', error);
    } finally {
      setGeneratingCover(false);
    }
  };

  const handleDownload = async (format: 'docx' | 'html') => {
    if (!tailoredCV) return;

    try {
      const blob = await exportApi.toDocx(tailoredCV, `tailored-cv-${job?.title || 'job'}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-cv-${job?.title || 'cv'}.${format === 'html' ? 'html' : 'docx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleDownloadCoverLetter = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${job?.company || 'company'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = async () => {
    if (!job) return;
    try {
      await jobApi.deleteSaved(job.id);
      router.push('/dashboard/jobs');
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  };

  if (!job) {
    return (
      <div className="flex justify-center py-16">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to jobs
      </button>

      <div className="grid grid-cols-2 gap-6">
        {/* Job Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="text-gray-600 text-lg">{job.company}</p>
            </div>
            {job.remote && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Remote
              </span>
            )}
          </div>

          {job.location && (
            <p className="text-gray-500 mb-4">📍 {job.location}</p>
          )}

          {job.salaryMin && (
            <p className="text-green-600 font-medium mb-4">
              ${job.salaryMin.toLocaleString()}{job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : ''}
            </p>
          )}

          {job.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Job Description</h3>
              <div className="prose prose-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-[400px] overflow-y-auto">
                {job.description}
              </div>
            </div>
          )}

          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              View original posting →
            </a>
          )}
        </div>

        {/* AI Customization */}
        <div className="space-y-4">
          {!tailoredCV && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="text-primary" size={24} />
                AI CV Customization
              </h2>
              
              {!cv && (
                <p className="text-gray-500">Please upload a CV first to customize it.</p>
              )}

              {cv && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Tailor your CV for this specific job. Our AI will:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Highlight relevant experience</li>
                    <li>Include keywords from the job description</li>
                    <li>Reorder skills to match requirements</li>
                  </ul>
                  
                  <button
                    onClick={handleTailorCV}
                    disabled={tailoring || !job.description}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {tailoring ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        Tailoring CV...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Tailor CV for this Job
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {tailoredCV && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="text-primary" size={24} />
                    Tailored CV
                  </h2>
                  {matchScore !== null && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      matchScore >= 80 ? 'bg-green-100 text-green-700' :
                      matchScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <Target size={16} />
                      {matchScore}% match
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-[300px] overflow-y-auto">
                  <p className="font-semibold text-lg">{tailoredCV.name}</p>
                  <p className="text-gray-600">{tailoredCV.email} | {tailoredCV.phone} | {tailoredCV.location}</p>
                  
                  {tailoredCV.summary && (
                    <div className="mt-4">
                      <h4 className="font-semibold">Summary</h4>
                      <p className="text-sm text-gray-700">{tailoredCV.summary}</p>
                    </div>
                  )}

                  {tailoredCV.experience.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold">Experience</h4>
                      {tailoredCV.experience.map((exp, i) => (
                        <div key={i} className="mt-2 text-sm">
                          <p className="font-medium">{exp.title} at {exp.company}</p>
                          <p className="text-gray-500">{exp.startDate} - {exp.endDate}</p>
                          {exp.description && <p className="text-gray-700">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {tailoredCV.skills.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {tailoredCV.skills.map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload('docx')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Download size={18} />
                    DOCX
                  </button>
                  <button
                    onClick={() => handleDownload('html')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Download size={18} />
                    HTML
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {!coverLetter ? (
                  <>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Mail className="text-primary" size={24} />
                      Cover Letter
                    </h2>
                    <button
                      onClick={handleGenerateCoverLetter}
                      disabled={generatingCover}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 disabled:opacity-50"
                    >
                      {generatingCover ? (
                        <>
                          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} />
                          Generate Cover Letter
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={24} />
                        Cover Letter Ready
                      </h2>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                      {coverLetter}
                    </div>
                    <button
                      onClick={handleDownloadCoverLetter}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Download size={18} />
                      Download Cover Letter
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90"
              >
                Done — Apply to this Job
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}