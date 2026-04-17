import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
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

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files allowed'));
    }
  }
});

router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    let cvText = '';

    if (req.file.mimetype === 'application/pdf') {
      const pdfParse = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const data = await fs.promises.readFile(req.file.path);
      const pdf = await pdfParse.getDocument({ data: new Uint8Array(data) }).promise;
      const textParts: string[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        textParts.push(content.items.map((item: any) => item.str).join(' '));
      }
      cvText = textParts.join('\n');
    } else if (req.file.originalname.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: req.file.path });
      cvText = result.value;
    }

    if (!cvText.trim()) {
      res.status(400).json({ error: 'Could not extract text from file' });
      return;
    }

    const aiService = getAIService();
    const rawParsedData = await aiService.parseCV(cvText);
    const parsedData = stripMarkdownJson(rawParsedData);

    const baseCv = await prisma.baseCv.create({
      data: {
        userId: req.userId!,
        filePath: req.file.path,
        fileName: req.file.originalname,
        originalFileName: req.file.originalname,
        parsedData
      }
    });

    res.status(201).json({
      id: baseCv.id,
      fileName: baseCv.fileName,
      parsedData: JSON.parse(parsedData),
      createdAt: baseCv.createdAt
    });
  } catch (error) {
    console.error('CV upload error:', error);
    res.status(500).json({ error: 'Failed to process CV' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const baseCvs = await prisma.baseCv.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        originalFileName: true,
        parsedData: true,
        createdAt: true
      }
    });

    res.json({
      cvs: baseCvs.map(cv => ({
        ...cv,
        parsedData: JSON.parse(stripMarkdownJson(cv.parsedData))
      }))
    });
  } catch (error) {
    console.error('Get CVs error:', error);
    res.status(500).json({ error: 'Failed to get CVs' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const cv = await prisma.baseCv.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!cv) {
      res.status(404).json({ error: 'CV not found' });
      return;
    }

    res.json({
      ...cv,
      parsedData: JSON.parse(stripMarkdownJson(cv.parsedData))
    });
  } catch (error) {
    console.error('Get CV error:', error);
    res.status(500).json({ error: 'Failed to get CV' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const updateSchema = z.object({
      parsedData: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        summary: z.string().optional(),
        experience: z.array(z.any()).optional(),
        education: z.array(z.any()).optional(),
        skills: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional()
      }).passthrough()
    });

    const { parsedData } = updateSchema.parse(req.body);

    const cv = await prisma.baseCv.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!cv) {
      res.status(404).json({ error: 'CV not found' });
      return;
    }

    const updatedCv = await prisma.baseCv.update({
      where: { id: req.params.id },
      data: { parsedData: JSON.stringify(parsedData) }
    });

    res.json({
      ...updatedCv,
      parsedData: JSON.parse(stripMarkdownJson(updatedCv.parsedData))
    });
  } catch (error) {
    console.error('Update CV error:', error);
    res.status(500).json({ error: 'Failed to update CV' });
  }
});

router.get('/fill-data', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const latestCv = await prisma.baseCv.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: { parsedData: true }
    });

    if (!latestCv) {
      res.status(404).json({ error: 'No CV found. Please upload a CV first.' });
      return;
    }

    const parsedData = JSON.parse(latestCv.parsedData);

    const fillData = {
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      location: parsedData.location,
      summary: parsedData.summary,
      experience: parsedData.experience,
      education: parsedData.education,
      skills: parsedData.skills,
      languages: parsedData.languages
    };

    res.json({ fillData });
  } catch (error) {
    console.error('Get fill data error:', error);
    res.status(500).json({ error: 'Failed to get fill data' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const cv = await prisma.baseCv.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!cv) {
      res.status(404).json({ error: 'CV not found' });
      return;
    }

    await prisma.baseCv.delete({
      where: { id: req.params.id }
    });

    if (cv.filePath) {
      try {
        await fs.promises.unlink(cv.filePath);
      } catch {}
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete CV error:', error);
    res.status(500).json({ error: 'Failed to delete CV' });
  }
});

export default router;