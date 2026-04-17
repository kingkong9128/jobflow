import { Document, Packer, Paragraph, TextRun, HeadingLevel, Alignment, WidthType, BorderStyle, Table, TableRow, TableCell, ShadingType } from 'docx';
import fs from 'fs';
import path from 'path';

export interface CVData {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduationDate?: string;
  }>;
  skills: string[];
  languages: string[];
}

export type CVTemplate = 'modern' | 'classic' | 'creative' | 'minimal';

export class ExportService {
  static async toDocx(cvData: CVData, template: CVTemplate = 'modern'): Promise<Buffer> {
    switch (template) {
      case 'classic':
        return this.toClassicDocx(cvData);
      case 'creative':
        return this.toCreativeDocx(cvData);
      case 'minimal':
        return this.toMinimalDocx(cvData);
      default:
        return this.toModernDocx(cvData);
    }
  }

  static async toModernDocx(cvData: CVData): Promise<Buffer> {
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: cvData.name, bold: true, size: 48 })],
        alignment: Alignment.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: cvData.email, color: '666666' }),
          cvData.phone && new TextRun({ text: ` | ${cvData.phone}`, color: '666666' }),
          cvData.location && new TextRun({ text: ` | ${cvData.location}`, color: '666666' }),
        ].filter(Boolean) as TextRun[],
        alignment: Alignment.CENTER,
      }),
      new Paragraph({ children: [] })
    );

    if (cvData.summary) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Professional Summary', bold: true, size: 28, color: '4F46E5' })],
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [new TextRun({ text: cvData.summary, size: 22 })],
        }),
        new Paragraph({ children: [] })
      );
    }

    if (cvData.experience.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Work Experience', bold: true, size: 28, color: '4F46E5' })],
          heading: HeadingLevel.HEADING_2,
        })
      );

      for (const exp of cvData.experience) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title || '', bold: true, size: 24 }),
              exp.company && new TextRun({ text: ` at ${exp.company}`, size: 24 }),
            ].filter(Boolean) as TextRun[],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${exp.startDate || ''}${exp.endDate ? ` - ${exp.endDate}` : ''}${exp.location ? ` | ${exp.location}` : ''}`, italics: true, size: 20, color: '666666' }),
            ].filter(Boolean) as TextRun[],
          }),
          exp.description && new Paragraph({
            children: [new TextRun({ text: exp.description, size: 22 })],
          }),
          new Paragraph({ children: [] })
        );
      }
    }

    if (cvData.education.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Education', bold: true, size: 28, color: '4F46E5' })],
          heading: HeadingLevel.HEADING_2,
        })
      );

      for (const edu of cvData.education) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: edu.degree || '', bold: true, size: 24 })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: edu.institution || '', size: 22 }),
              edu.graduationDate && new TextRun({ text: ` | ${edu.graduationDate}`, size: 22, color: '666666' }),
            ].filter(Boolean) as TextRun[],
          }),
          new Paragraph({ children: [] })
        );
      }
    }

    if (cvData.skills.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Skills', bold: true, size: 28, color: '4F46E5' })],
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [new TextRun({ text: cvData.skills.join(', '), size: 22 })],
        }),
        new Paragraph({ children: [] })
      );
    }

    if (cvData.languages.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Languages', bold: true, size: 28, color: '4F46E5' })],
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [new TextRun({ text: cvData.languages.join(', '), size: 22 })],
        })
      );
    }

    const doc = new Document({
      sections: [{ children }],
    });

    return await Packer.toBuffer(doc);
  }

  static async toClassicDocx(cvData: CVData): Promise<Buffer> {
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: cvData.name, bold: true, size: 52 })],
        alignment: Alignment.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: cvData.email, size: 20 }),
          cvData.phone && new TextRun({ text: ` | ${cvData.phone}`, size: 20 }),
          cvData.location && new TextRun({ text: ` | ${cvData.location}`, size: 20 }),
        ].filter(Boolean) as TextRun[],
        alignment: Alignment.CENTER,
      }),
      new Paragraph({ children: [], spacing: { after: 400 } })
    );

    const section = (title: string, content: Paragraph[]) => [
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 26, color: '000000' })],
        border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 } },
        spacing: { after: 200 }
      }),
      ...content,
      new Paragraph({ children: [] })
    ];

    if (cvData.summary) {
      children.push(...section('PROFESSIONAL SUMMARY', [
        new Paragraph({ children: [new TextRun({ text: cvData.summary, size: 22 })] })
      ]));
    }

    if (cvData.experience.length > 0) {
      const expContent: Paragraph[] = [];
      for (const exp of cvData.experience) {
        expContent.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title || '', bold: true, size: 24 }),
              exp.company && new TextRun({ text: `, ${exp.company}`, size: 24 })
            ].filter(Boolean) as TextRun[],
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: `${exp.startDate || ''}${exp.endDate ? ` - ${exp.endDate}` : ''}${exp.location ? `, ${exp.location}` : ''}`, 
              italics: true, size: 20, color: '444444' 
            })]
          }),
          exp.description && new Paragraph({ children: [new TextRun({ text: exp.description, size: 22 })] }),
          new Paragraph({ children: [] })
        );
      }
      children.push(...section('WORK EXPERIENCE', expContent));
    }

    if (cvData.education.length > 0) {
      const eduContent: Paragraph[] = [];
      for (const edu of cvData.education) {
        eduContent.push(
          new Paragraph({
            children: [new TextRun({ text: edu.degree || '', bold: true, size: 24 })]
          }),
          new Paragraph({
            children: [new TextRun({ text: edu.institution || '', size: 22 })]
          }),
          edu.graduationDate && new Paragraph({
            children: [new TextRun({ text: edu.graduationDate, size: 20, italics: true })]
          }),
          new Paragraph({ children: [] })
        );
      }
      children.push(...section('EDUCATION', eduContent));
    }

    if (cvData.skills.length > 0) {
      children.push(...section('SKILLS', [
        new Paragraph({ children: [new TextRun({ text: cvData.skills.join(' • '), size: 22 })] })
      ]));
    }

    if (cvData.languages.length > 0) {
      children.push(...section('LANGUAGES', [
        new Paragraph({ children: [new TextRun({ text: cvData.languages.join(', '), size: 22 })] })
      ]));
    }

    const doc = new Document({ sections: [{ children }] });
    return await Packer.toBuffer(doc);
  }

  static async toCreativeDocx(cvData: CVData): Promise<Buffer> {
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: cvData.name.toUpperCase(), bold: true, size: 56, color: '1a1a2e' })],
        alignment: Alignment.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: cvData.email, color: '4a4a6a', size: 22 }),
          new TextRun({ text: '  •  ', color: '4a4a6a' }),
          new TextRun({ text: cvData.phone || '', color: '4a4a6a', size: 22 }),
          new TextRun({ text: '  •  ', color: '4a4a6a' }),
          new TextRun({ text: cvData.location || '', color: '4a4a6a', size: 22 }),
        ],
        alignment: Alignment.CENTER,
      }),
      new Paragraph({ 
        border: { bottom: { color: '4F46E5', style: BorderStyle.SINGLE, size: 12 } },
        spacing: { after: 300 }
      })
    );

    if (cvData.summary) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'ABOUT', bold: true, size: 24, color: '4F46E5' })],
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: cvData.summary, size: 22, color: '333333' })],
          spacing: { after: 300 }
        })
      );
    }

    if (cvData.experience.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'EXPERIENCE', bold: true, size: 24, color: '4F46E5' })],
          spacing: { before: 400 }
        })
      );
      for (const exp of cvData.experience) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title || '', bold: true, size: 26, color: '1a1a2e' }),
              exp.company && new TextRun({ text: ` @ ${exp.company}`, size: 24, color: '666666' })
            ].filter(Boolean) as TextRun[],
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: `${exp.startDate || 'Present'} - ${exp.endDate || 'Present'} ${exp.location ? `| ${exp.location}` : ''}`, 
              size: 18, color: '888888', italics: true 
            })]
          }),
          exp.description && new Paragraph({
            children: [new TextRun({ text: exp.description, size: 20, color: '444444' })],
            spacing: { after: 200 }
          })
        );
      }
    }

    if (cvData.education.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'EDUCATION', bold: true, size: 24, color: '4F46E5' })],
          spacing: { before: 400 }
        })
      );
      for (const edu of cvData.education) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: edu.degree || '', bold: true, size: 24, color: '1a1a2e' })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `${edu.institution || ''} ${edu.graduationDate ? `• ${edu.graduationDate}` : ''}`, size: 20, color: '666666' })]
          })
        );
      }
    }

    if (cvData.skills.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'SKILLS', bold: true, size: 24, color: '4F46E5' })],
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: cvData.skills.map((skill, i) => 
            new TextRun({ text: skill, size: 22, bold: i % 3 === 0, color: i % 3 === 0 ? '4F46E5' : '333333' })
          ),
        })
      );
    }

    const doc = new Document({ sections: [{ children }] });
    return await Packer.toBuffer(doc);
  }

  static async toMinimalDocx(cvData: CVData): Promise<Buffer> {
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        children: [new TextRun({ text: cvData.name, bold: true, size: 44 })],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: cvData.email, size: 22 }),
          cvData.phone && new TextRun({ text: `  ·  ${cvData.phone}`, size: 22 }),
          cvData.location && new TextRun({ text: `  ·  ${cvData.location}`, size: 22 }),
        ].filter(Boolean) as TextRun[],
      }),
      new Paragraph({ children: [], spacing: { after: 400 } })
    );

    if (cvData.summary) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: cvData.summary, size: 22, color: '555555' })],
        }),
        new Paragraph({ children: [], spacing: { after: 300 } })
      );
    }

    if (cvData.experience.length > 0) {
      for (const exp of cvData.experience) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title || '', bold: true, size: 24 }),
              exp.company && new TextRun({ text: `  ·  ${exp.company}`, size: 22 })
            ].filter(Boolean) as TextRun[],
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: `${exp.startDate || ''} – ${exp.endDate || 'Present'}`, 
              size: 18, color: '888888' 
            })]
          }),
          exp.description && new Paragraph({
            children: [new TextRun({ text: exp.description, size: 20 })],
            spacing: { after: 200 }
          })
        );
      }
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }

    if (cvData.education.length > 0) {
      for (const edu of cvData.education) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: edu.degree || '', bold: true, size: 22 })]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: edu.institution || '', size: 20 }),
              edu.graduationDate && new TextRun({ text: `  ·  ${edu.graduationDate}`, size: 18, color: '888888' })
            ].filter(Boolean) as TextRun[],
          })
        );
      }
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }

    if (cvData.skills.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Skills: ' + cvData.skills.join(', '), size: 20, color: '666666' })]
        })
      );
    }

    const doc = new Document({ sections: [{ children }] });
    return await Packer.toBuffer(doc);
  }

  static async saveDocx(cvData: CVData, filePath: string, template?: CVTemplate): Promise<string> {
    const buffer = await this.toDocx(cvData, template);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  static async toHtml(cvData: CVData, template: CVTemplate = 'modern'): Promise<string> {
    const experiences = cvData.experience.map(exp => `
      <div class="experience">
        <h3>${exp.title || ''}${exp.company ? ` at ${exp.company}` : ''}</h3>
        <p class="meta">${[exp.startDate, exp.endDate, exp.location].filter(Boolean).join(' | ')}</p>
        ${exp.description ? `<p>${exp.description}</p>` : ''}
      </div>
    `).join('');

    const education = cvData.education.map(edu => `
      <div class="education">
        <h3>${edu.degree || ''}</h3>
        <p class="meta">${[edu.institution, edu.graduationDate].filter(Boolean).join(' | ')}</p>
      </div>
    `).join('');

    const skills = cvData.skills.map(s => `<span class="skill">${s}</span>`).join('');

    const templateStyles: Record<CVTemplate, string> = {
      modern: `
        h2 { color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 5px; }
        .skill { background: #e0e7ff; color: #4F46E5; }
      `,
      classic: `
        h2 { color: #333; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; }
        .skill { background: #f0f0f0; }
      `,
      creative: `
        h2 { color: #1a1a2e; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
        .skill { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
      `,
      minimal: `
        h2 { color: #999; font-size: 12px; font-weight: normal; letter-spacing: 1px; }
        .skill { background: transparent; border: 1px solid #ddd; }
      `
    };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    h1 { margin-bottom: 5px; }
    .contact { color: #666; margin-bottom: 30px; }
    h2 { margin-top: 30px; }
    .experience h3, .education h3 { margin-bottom: 5px; }
    .meta { color: #888; font-style: italic; font-size: 14px; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { padding: 4px 12px; border-radius: 15px; font-size: 14px; }
    ${templateStyles[template]}
  </style>
</head>
<body>
  <h1>${cvData.name || ''}</h1>
  <p class="contact">${[cvData.email, cvData.phone, cvData.location].filter(Boolean).join(' | ')}</p>
  
  ${cvData.summary ? `<h2>Professional Summary</h2><p>${cvData.summary}</p>` : ''}
  
  ${cvData.experience.length > 0 ? `<h2>Work Experience</h2>${experiences}` : ''}
  
  ${cvData.education.length > 0 ? `<h2>Education</h2>${education}` : ''}
  
  ${cvData.skills.length > 0 ? `<h2>Skills</h2><div class="skills">${skills}</div>` : ''}
  
  ${cvData.languages.length > 0 ? `<h2>Languages</h2><p>${cvData.languages.join(', ')}</p>` : ''}
</body>
</html>`;
  }
}