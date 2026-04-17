import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { getAIService } from '../services/ai.js';

const router = Router();

function stripMarkdownJson(text: string): string {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) return match[1].trim();
  const jsMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (jsMatch) return jsMatch[1].trim();
  return text.trim();
}

router.post('/tailor', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tailorSchema = z.object({
      baseCvId: z.string(),
      jobId: z.string().optional(),
      jobDescription: z.string(),
      jobTitle: z.string().optional(),
      company: z.string().optional()
    });

    const { baseCvId, jobId, jobDescription, jobTitle, company } = tailorSchema.parse(req.body);

    const baseCv = await prisma.baseCv.findFirst({
      where: { id: baseCvId, userId: req.userId }
    });

    if (!baseCv) {
      res.status(404).json({ error: 'CV not found' });
      return;
    }

    const aiService = getAIService();
    const cvText = JSON.stringify(JSON.parse(stripMarkdownJson(baseCv.parsedData)), null, 2);
    const tailoredCV = await aiService.tailorCV(cvText, jobDescription);
    const cleanedCV = stripMarkdownJson(tailoredCV);

    const matchScore = await aiService.calculateMatchScore(cvText, jobDescription);

    const customization = await prisma.cvCustomization.create({
      data: {
        userId: req.userId!,
        baseCvId,
        jobId,
        customizedData: cleanedCV,
        matchScore
      }
    });

    res.json({
      id: customization.id,
      tailoredCV: JSON.parse(cleanedCV),
      matchScore,
      createdAt: customization.createdAt
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Tailor CV error:', error);
    res.status(500).json({ error: 'Failed to tailor CV' });
  }
});

router.post('/cover-letter', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const coverLetterSchema = z.object({
      baseCvId: z.string(),
      jobId: z.string().optional(),
      jobDescription: z.string(),
      jobTitle: z.string().optional(),
      company: z.string().optional()
    });

    const { baseCvId, jobDescription, jobTitle, company } = coverLetterSchema.parse(req.body);

    const baseCv = await prisma.baseCv.findFirst({
      where: { id: baseCvId, userId: req.userId }
    });

    if (!baseCv) {
      res.status(404).json({ error: 'CV not found' });
      return;
    }

    const aiService = getAIService();
    const cvText = JSON.stringify(JSON.parse(stripMarkdownJson(baseCv.parsedData)), null, 2);
    const coverLetter = await aiService.generateCoverLetter(
      cvText,
      jobDescription,
      company || 'the company'
    );

    res.json({
      coverLetter,
      jobTitle,
      company
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Cover letter error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

router.get('/match-score', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { baseCvId, jobDescription } = z.object({
      baseCvId: z.string(),
      jobDescription: z.string()
    }).parse(req.query);

    const baseCv = await prisma.baseCv.findFirst({
      where: { id: baseCvId, userId: req.userId }
    });

    if (!baseCv) {
      res.status(404).json({ error: 'CV not found' });
      return;
    }

    const aiService = getAIService();
    const cvText = JSON.stringify(JSON.parse(stripMarkdownJson(baseCv.parsedData)), null, 2);
    const matchScore = await aiService.calculateMatchScore(cvText, jobDescription);

    res.json({ matchScore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    console.error('Match score error:', error);
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

export default router;