import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { ExportService, CVData } from '../services/export.js';

const router = Router();

const exportDir = process.env.EXPORT_DIR || './exports';
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

router.post('/pdf', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      cvData: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        location: z.string().optional(),
        summary: z.string().optional(),
        experience: z.array(z.any()),
        education: z.array(z.any()),
        skills: z.array(z.string()),
        languages: z.array(z.string())
      }),
      filename: z.string().optional()
    });

    const { cvData, filename } = schema.parse(req.body);

    const html = await ExportService.toHtml(cvData);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'cv'}.html"`);
    res.send(html);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export CV' });
  }
});

router.post('/docx', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      cvData: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        location: z.string().optional(),
        summary: z.string().optional(),
        experience: z.array(z.any()),
        education: z.array(z.any()),
        skills: z.array(z.string()),
        languages: z.array(z.string())
      }),
      filename: z.string().optional()
    });

    const { cvData, filename } = schema.parse(req.body);

    const buffer = await ExportService.toDocx(cvData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'cv'}.docx"`);
    res.send(buffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export CV' });
  }
});

router.post('/save', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      cvData: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string().optional(),
        location: z.string().optional(),
        summary: z.string().optional(),
        experience: z.array(z.any()),
        education: z.array(z.any()),
        skills: z.array(z.string()),
        languages: z.array(z.string())
      }),
      baseCvId: z.string().optional(),
      jobId: z.string().optional(),
      format: z.enum(['docx', 'html']).default('docx')
    });

    const { cvData, baseCvId, jobId, format } = schema.parse(req.body);

    const userId = req.userId!;
    const filename = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${format}`;
    const filePath = path.join(exportDir, filename);

    if (format === 'docx') {
      await ExportService.saveDocx(cvData, filePath);
    } else {
      const html = await ExportService.toHtml(cvData);
      fs.writeFileSync(filePath, html);
    }

    const savedExport = await prisma.cvCustomization.create({
      data: {
        userId,
        baseCvId: baseCvId || '',
        jobId: jobId || null,
        customizedData: JSON.stringify(cvData),
        matchScore: null
      }
    });

    res.json({
      id: savedExport.id,
      filePath: `/exports/${filename}`,
      format
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Save export error:', error);
    res.status(500).json({ error: 'Failed to save export' });
  }
});

router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const customizations = await prisma.cvCustomization.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        baseCvId: true,
        jobId: true,
        matchScore: true,
        createdAt: true
      }
    });

    res.json({ customizations });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

export default router;