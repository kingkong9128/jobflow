import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const JOOBLE_API_URL = 'https://jooble.org/api';
const INDEED_RAPIDAPI_URL = 'https://indeed44.p.rapidapi.com';

interface NormalizedJob {
  source: string;
  sourceId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  salary?: string;
  url: string;
  postedAt: Date | null;
  remote: boolean;
}

async function searchJooble(keywords: string, location: string, remote: boolean): Promise<NormalizedJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  
  const searchUrl = apiKey 
    ? `${JOOBLE_API_URL}/${apiKey}`
    : `${JOOBLE_API_URL}`;

  const searchParams: Record<string, string> = {
    keywords: keywords,
    location: location,
    page: '1'
  };

  if (remote) {
    searchParams.remoteFilter = 'true';
  }

  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    });

    if (!response.ok) {
      throw new Error(`Jooble API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.jobs || []).map((job: any) => ({
      source: 'jooble',
      sourceId: job.id || job.link,
      title: job.title || 'Unknown Title',
      company: job.company || 'Unknown Company',
      location: job.location || location || 'Not specified',
      description: job.snippet || job.description || '',
      salary: job.salary || '',
      url: job.link || job.url || '',
      postedAt: job.posted ? new Date(job.posted) : null,
      remote: remote || job.remote === true
    }));
  } catch (error) {
    console.error('Jooble search error:', error);
    return [];
  }
}

async function searchIndeed(keywords: string, location: string, remote: boolean): Promise<NormalizedJob[]> {
  const apiKey = process.env.INDEED_API_KEY;
  
  if (!apiKey) {
    console.log('Indeed API key not configured');
    return [];
  }

  try {
    const queryParams = new URLSearchParams({
      query: keywords,
      location: location,
      page_size: '20'
    });

    if (remote) {
      queryParams.append('remote', 'true');
    }

    const response = await fetch(`${INDEED_RAPIDAPI_URL}/jobs?${queryParams}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'indeed44.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`Indeed API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.jobs || []).map((job: any) => ({
      source: 'indeed',
      sourceId: job.job_id || job.link,
      title: job.title || 'Unknown Title',
      company: job.company_name || 'Unknown Company',
      location: job.location || location || 'Not specified',
      description: job.job_description || job.snippet || '',
      salaryMin: job.salary?.min ? parseInt(job.salary.min.replace(/[^0-9]/g, '')) : undefined,
      salaryMax: job.salary?.max ? parseInt(job.salary.max.replace(/[^0-9]/g, '')) : undefined,
      url: job.job_url || job.link || '',
      postedAt: job.posted_date ? new Date(job.posted_date) : null,
      remote: remote || job.remote === true
    }));
  } catch (error) {
    console.error('Indeed search error:', error);
    return [];
  }
}

async function searchAdzuna(keywords: string, location: string, remote: boolean): Promise<NormalizedJob[]> {
  const apiKey = process.env.ADZUNA_API_KEY;
  const appId = process.env.ADZUNA_APP_ID;

  if (!apiKey || !appId) {
    console.log('Adzuna API credentials not configured');
    return [];
  }

  try {
    const country = location?.toLowerCase().includes('uk') || location?.toLowerCase().includes('london') 
      ? 'gb' 
      : 'us';
    
    const params = new URLSearchParams({
      app_id: appId,
      app_key: apiKey,
      what: keywords,
      results_per_page: '20'
    });

    if (location) {
      params.append('where', location);
    }

    if (remote) {
      params.append('where', 'Remote');
    }

    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
    
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.results || []).map((job: any) => ({
      source: 'adzuna',
      sourceId: String(job.id),
      title: job.title || 'Unknown Title',
      company: job.company?.display_name || job.company?.name || 'Unknown',
      location: job.location?.display_name || location || 'Not specified',
      description: job.description || '',
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      url: job.redirect_url || '',
      postedAt: job.created ? new Date(job.created) : null,
      remote
    }));
  } catch (error) {
    console.error('Adzuna search error:', error);
    return [];
  }
}

function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Map<string, NormalizedJob>();
  
  for (const job of jobs) {
    const key = `${job.source}:${job.sourceId}`;
    
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      if (!existing.description && job.description) {
        existing.description = job.description;
      }
      if (!existing.url && job.url) {
        existing.url = job.url;
      }
      if (!existing.postedAt && job.postedAt) {
        existing.postedAt = job.postedAt;
      }
    } else {
      seen.set(key, job);
    }
  }

  const deduped = Array.from(seen.values());

  const titleCompanyMap = new Map<string, NormalizedJob>();
  for (const job of deduped) {
    const normalizedTitle = job.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedCompany = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${normalizedTitle}:${normalizedCompany}`;
    
    if (titleCompanyMap.has(key)) {
      const existing = titleCompanyMap.get(key)!;
      if (existing.description.length < job.description.length) {
        titleCompanyMap.set(key, job);
      }
    } else {
      titleCompanyMap.set(key, job);
    }
  }

  return Array.from(titleCompanyMap.values());
}

const searchSchema = z.object({
  keywords: z.string().min(1),
  location: z.string().default(''),
  remote: z.boolean().default(false),
  sources: z.array(z.enum(['jooble', 'indeed', 'adzuna'])).default(['jooble'])
});

router.get('/search', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { keywords, location, remote, sources } = searchSchema.parse({
      keywords: req.query.keywords,
      location: req.query.location || '',
      remote: req.query.remote === 'true',
      sources: req.query.sources ? (req.query.sources as string).split(',') : ['jooble']
    });

    if (!keywords.trim()) {
      res.status(400).json({ error: 'Keywords required' });
      return;
    }

    let results: NormalizedJob[] = [];
    const errors: string[] = [];

    const searchPromises: Promise<void>[] = [];

    if (sources.includes('jooble')) {
      searchPromises.push(
        searchJooble(keywords, location, remote).then(joobleResults => {
          results.push(...joobleResults);
        }).catch(() => {
          errors.push('Jooble search failed');
        })
      );
    }

    if (sources.includes('indeed')) {
      searchPromises.push(
        searchIndeed(keywords, location, remote).then(indeedResults => {
          results.push(...indeedResults);
        }).catch(() => {
          errors.push('Indeed search failed');
        })
      );
    }

    if (sources.includes('adzuna')) {
      searchPromises.push(
        searchAdzuna(keywords, location, remote).then(adzunaResults => {
          results.push(...adzunaResults);
        }).catch(() => {
          errors.push('Adzuna search failed');
        })
      );
    }

    await Promise.all(searchPromises);

    const uniqueResults = deduplicateJobs(results);

    res.json({ 
      jobs: uniqueResults, 
      total: uniqueResults.length,
      sourcesSearched: sources,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Job search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/save', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const saveSchema = z.object({
      source: z.string(),
      sourceId: z.string(),
      title: z.string(),
      company: z.string().optional(),
      location: z.string().optional(),
      remote: z.boolean().default(false),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      description: z.string().optional(),
      url: z.string().optional(),
      postedAt: z.string().datetime().optional()
    });

    const jobData = saveSchema.parse(req.body);

    const savedJob = await prisma.savedJob.upsert({
      where: {
        userId_source_sourceId: {
          userId: req.userId!,
          source: jobData.source,
          sourceId: jobData.sourceId
        }
      },
      update: jobData,
      create: {
        userId: req.userId!,
        ...jobData,
        postedAt: jobData.postedAt ? new Date(jobData.postedAt) : null
      }
    });

    res.status(201).json(savedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Save job error:', error);
    res.status(500).json({ error: 'Failed to save job' });
  }
});

router.get('/saved', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: req.userId },
      orderBy: { savedAt: 'desc' }
    });

    res.json({ jobs: savedJobs });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({ error: 'Failed to get saved jobs' });
  }
});

router.delete('/saved/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.savedJob.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    await prisma.savedJob.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete saved job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

router.get('/sources', (_, res) => {
  res.json({
    sources: [
      { id: 'jooble', name: 'Jooble', enabled: true, docs: 'https://jooble.org/api' },
      { id: 'indeed', name: 'Indeed', enabled: !!process.env.INDEED_API_KEY, docs: 'RapidAPI Indeed API' },
      { id: 'adzuna', name: 'Adzuna', enabled: !!(process.env.ADZUNA_API_KEY && process.env.ADZUNA_APP_ID), docs: 'https://developer.adzuna.com' }
    ]
  });
});

export default router;