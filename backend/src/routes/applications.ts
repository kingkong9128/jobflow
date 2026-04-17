import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createApplicationSchema = z.object({
  jobId: z.string().optional(),
  baseCvId: z.string().optional(),
  customizedCvPath: z.string().optional(),
  coverLetterPath: z.string().optional(),
  appliedVia: z.enum(['manual', 'auto_fill', 'auto_submit']).default('manual')
});

const updateApplicationSchema = z.object({
  status: z.enum(['applied', 'in_review', 'interview', 'offer', 'rejected', 'accepted']).optional(),
  notes: z.string().optional()
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = createApplicationSchema.parse(req.body);

    const application = await prisma.application.create({
      data: {
        userId: req.userId!,
        jobId: data.jobId,
        baseCvId: data.baseCvId,
        customizedCvPath: data.customizedCvPath,
        coverLetterPath: data.coverLetterPath,
        appliedVia: data.appliedVia,
        appliedAt: new Date()
      }
    });

    res.status(201).json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const appliedVia = req.query.appliedVia as string | undefined;

    const where: any = { userId: req.userId };
    if (status) where.status = status;
    if (appliedVia) where.appliedVia = appliedVia;

    const applications = await prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        job: true,
        baseCv: {
          select: { id: true, fileName: true }
        }
      }
    });

    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status, notes } = updateApplicationSchema.parse(req.body);

    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      }
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const total = await prisma.application.count({ where: { userId: req.userId } });
    
    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      where: { userId: req.userId },
      _count: true
    });

    const appliedViaCounts = await prisma.application.groupBy({
      by: ['appliedVia'],
      where: { userId: req.userId },
      _count: true
    });

    res.json({
      total,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byAppliedVia: appliedViaCounts.reduce((acc, item) => {
        acc[item.appliedVia] = item._count;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;