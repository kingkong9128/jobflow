import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createAlertSchema = z.object({
  name: z.string().optional(),
  keywords: z.string().min(1),
  location: z.string().default(''),
  remote: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly']).default('daily')
});

const updateAlertSchema = z.object({
  name: z.string().optional(),
  frequency: z.enum(['daily', 'weekly']).optional(),
  active: z.boolean().optional()
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alerts = await prisma.jobAlert.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    const alertsWithCriteria = alerts.map(alert => ({
      ...alert,
      criteria: JSON.parse(alert.criteria)
    }));

    res.json({ alerts: alertsWithCriteria });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, keywords, location, remote, frequency } = createAlertSchema.parse(req.body);

    const alert = await prisma.jobAlert.create({
      data: {
        userId: req.userId!,
        name: name || keywords,
        criteria: JSON.stringify({ keywords, location, remote }),
        frequency,
        active: true
      }
    });

    res.status(201).json({
      ...alert,
      criteria: JSON.parse(alert.criteria)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, frequency, active } = updateAlertSchema.parse(req.body);

    const alert = await prisma.jobAlert.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const updated = await prisma.jobAlert.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(frequency !== undefined && { frequency }),
        ...(active !== undefined && { active })
      }
    });

    res.json({
      ...updated,
      criteria: JSON.parse(updated.criteria)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alert = await prisma.jobAlert.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    await prisma.jobAlert.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

router.post('/:id/test', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alert = await prisma.jobAlert.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const criteria = JSON.parse(alert.criteria);
    const matchingJobs = await findMatchingJobs(criteria.keywords, criteria.location, criteria.remote);

    res.json({
      alertId: alert.id,
      matchingJobs: matchingJobs.slice(0, 5),
      totalMatches: matchingJobs.length
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({ error: 'Failed to test alert' });
  }
});

router.post('/check-all', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const alertsToCheck = await prisma.jobAlert.findMany({
      where: {
        active: true,
        OR: [
          { lastSentAt: null },
          {
            frequency: 'daily',
            lastSentAt: { lte: oneDayAgo }
          },
          {
            frequency: 'weekly',
            lastSentAt: { lte: oneWeekAgo }
          }
        ]
      },
      include: { user: true }
    });

    const results = [];

    for (const alert of alertsToCheck) {
      try {
        const criteria = JSON.parse(alert.criteria);
        const matchingJobs = await findMatchingJobs(criteria.keywords, criteria.location, criteria.remote);

        if (matchingJobs.length > 0) {
          await sendAlertEmail(alert.user.email, alert.name || criteria.keywords, matchingJobs);
        }

        await prisma.jobAlert.update({
          where: { id: alert.id },
          data: { lastSentAt: now }
        });

        results.push({ alertId: alert.id, matched: matchingJobs.length, sent: true });
      } catch (error) {
        console.error(`Failed to process alert ${alert.id}:`, error);
        results.push({ alertId: alert.id, matched: 0, sent: false, error: error.message });
      }
    }

    res.json({ processed: alertsToCheck.length, results });
  } catch (error) {
    console.error('Check all alerts error:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

async function findMatchingJobs(keywords: string, location: string, remote: boolean) {
  const allJobs: any[] = [];

  const joobleResults = await searchFromSource('jooble', keywords, location, remote);
  allJobs.push(...joobleResults);

  const adzunaResults = await searchFromSource('adzuna', keywords, location, remote);
  allJobs.push(...adzunaResults);

  const seen = new Set();
  return allJobs.filter(job => {
    const key = `${job.source}:${job.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchFromSource(source: string, keywords: string, location: string, remote: boolean) {
  if (source === 'jooble') {
    return await searchJooble(keywords, location, remote);
  }
  if (source === 'adzuna') {
    return await searchAdzuna(keywords, location, remote);
  }
  return [];
}

async function searchJooble(keywords: string, location: string, remote: boolean): Promise<any[]> {
  const JOOBLE_API_URL = 'https://jooble.org/api';
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

    if (!response.ok) return [];

    const data = await response.json();
    
    return (data.jobs || []).map((job: any) => ({
      source: 'jooble',
      sourceId: job.id || job.link,
      title: job.title || 'Unknown Title',
      company: job.company || 'Unknown Company',
      location: job.location || location || 'Not specified',
      description: job.snippet || job.description || '',
      url: job.link || job.url || '',
      postedAt: job.posted ? new Date(job.posted) : null,
      remote: remote || job.remote === true
    }));
  } catch (error) {
    console.error('Jooble search error:', error);
    return [];
  }
}

async function searchAdzuna(keywords: string, location: string, remote: boolean): Promise<any[]> {
  const apiKey = process.env.ADZUNA_API_KEY;
  const appId = process.env.ADZUNA_APP_ID;

  if (!apiKey || !appId) return [];

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

    if (location) params.append('where', location);
    if (remote) params.append('where', 'Remote');

    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);
    
    if (!response.ok) return [];

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

async function sendAlertEmail(email: string, alertName: string, jobs: any[]) {
  const nodemailer = await import('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const jobList = jobs.slice(0, 10).map(job => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${job.title}</strong><br>
        <span style="color: #666;">${job.company}</span> ${job.location ? `• ${job.location}` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${job.remote ? '<span style="color: green;">Remote</span>' : ''}
        ${job.url ? `<a href="${job.url}" style="color: #4F46E5;">View →</a>` : ''}
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">New Jobs Matching: ${alertName}</h2>
      <p style="color: #666;">Found ${jobs.length} matching job${jobs.length !== 1 ? 's' : ''}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        ${jobList}
      </table>
      
      <p style="color: #999; font-size: 12px;">
        You received this email because you have a JobFlow alert set up.<br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/alerts" style="color: #666;">
          Manage your alerts
        </a>
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@jobflow.app',
      to: email,
      subject: `Job Alert: ${jobs.length} new jobs matching "${alertName}"`,
      html
    });
  } catch (error) {
    console.error('Failed to send alert email:', error);
    throw error;
  }
}

export default router;