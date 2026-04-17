import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config();

const CV_SCHEMA = {
  name: "parse_cv",
  description: "Parse a CV/resume and extract structured information",
  input: {
    type: "object",
    properties: {
      name: { type: "string", description: "Full name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      location: { type: "string", description: "City, Country" },
      summary: { type: "string", description: "Professional summary or objective" },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            location: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            description: { type: "string" }
          },
          required: ["title", "company", "description"]
        }
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            location: { type: "string" },
            graduationDate: { type: "string" },
            gpa: { type: "string" },
            grade: { type: "string" },
            highlights: { type: "array", items: { type: "string" } }
          },
          required: ["degree", "institution"]
        }
      },
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
      certifications: { type: "array", items: { type: "string" } },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            technologies: { type: "array", items: { type: "string" } }
          }
        }
      },
      achievements: { type: "array", items: { type: "string" } }
    },
    required: ["name", "email", "experience", "education", "skills"]
  }
};

const TAILOR_CV_SCHEMA = {
  name: "tailor_cv",
  description: "Tailor a CV for a specific job description",
  input: {
    type: "object",
    properties: {
      name: { type: "string", description: "Full name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      location: { type: "string", description: "City, Country" },
      summary: { type: "string", description: "Professional summary tailored to the job" },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            location: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            description: { type: "string" }
          },
          required: ["title", "company", "description"]
        }
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            location: { type: "string" },
            graduationDate: { type: "string" },
            gpa: { type: "string" },
            grade: { type: "string" },
            highlights: { type: "array", items: { type: "string" } }
          },
          required: ["degree", "institution"]
        }
      },
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
      certifications: { type: "array", items: { type: "string" } },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            technologies: { type: "array", items: { type: "string" } }
          }
        }
      },
      achievements: { type: "array", items: { type: "string" } }
    },
    required: ["name", "email", "experience", "education", "skills"]
  }
};

interface AIProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
  completeWithJson<T>(systemPrompt: string, userPrompt: string, schema: any): Promise<T>;
}

class MiniMaxProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error('MiniMax API key not provided');
    this.client = new Anthropic({
      apiKey,
      baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/anthropic'
    });
  }

  async complete(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
    const response = await this.client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    for (const block of response.content) {
      if (block.type === 'text') {
        return block.text;
      }
    }
    return '';
  }

  async completeWithJson<T>(systemPrompt: string, userPrompt: string, schema: any): Promise<T> {
    const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
    
    const response = await this.client.messages.create({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: schema.name,
          description: schema.description,
          input_schema: schema.input
        }
      ],
      tool_choice: {
        type: 'tool',
        name: schema.name
      }
    });

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        return block.input as T;
      }
    }

    for (const block of response.content) {
      if (block.type === 'text') {
        try {
          return JSON.parse(block.text) as T;
        } catch {
          throw new Error(`Failed to parse JSON response: ${block.text}`);
        }
      }
    }

    throw new Error('No valid response from model');
  }
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error('Anthropic API key not provided');
    this.client = new Anthropic({ apiKey });
  }

  async complete(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  async completeWithJson<T>(systemPrompt: string, userPrompt: string, schema: any): Promise<T> {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: schema.name,
          description: schema.description,
          input_schema: schema.input
        }
      ],
      tool_choice: {
        type: 'tool',
        name: schema.name
      }
    });

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        return block.input as T;
      }
    }

    throw new Error('No tool response from model');
  }
}

class OpenAIProvider implements AIProvider {
  async complete(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    throw new Error('OpenAI provider does not support structured output');
  }

  async completeWithJson<T>(systemPrompt: string, userPrompt: string, schema: any): Promise<T> {
    throw new Error('OpenAI provider does not support structured output');
  }
}

class OpenRouterProvider implements AIProvider {
  async complete(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    throw new Error('OpenRouter provider does not support structured output');
  }

  async completeWithJson<T>(systemPrompt: string, userPrompt: string, schema: any): Promise<T> {
    throw new Error('OpenRouter provider does not support structured output');
  }
}

export type AIProviderType = 'openai' | 'anthropic' | 'minimax' | 'openrouter';

interface AIServiceConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  minimaxApiKey?: string;
  openrouterApiKey?: string;
  defaultProvider?: AIProviderType;
}

export interface ParsedCV {
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
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduationDate?: string;
    gpa?: string;
    grade?: string;
    highlights?: string[];
  }>;
  skills: string[];
  languages?: string[];
  certifications?: string[];
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
  }>;
  achievements?: string[];
}

export class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProvider: AIProviderType;

  constructor(config: AIServiceConfig) {
    if (config.openaiApiKey) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (config.anthropicApiKey) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropicApiKey));
    }
    if (config.minimaxApiKey) {
      this.providers.set('minimax', new MiniMaxProvider(config.minimaxApiKey));
    }
    if (config.openrouterApiKey) {
      this.providers.set('openrouter', new OpenRouterProvider());
    }

    this.defaultProvider = config.defaultProvider || 'anthropic';

    if (this.providers.size === 0) {
      throw new Error('No AI providers configured');
    }
  }

  private getProvider(type?: AIProviderType): AIProvider {
    const providerType = type || this.defaultProvider;
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not configured`);
    }
    return provider;
  }

  async complete(prompt: string, systemPrompt?: string, provider?: AIProviderType): Promise<string> {
    return this.getProvider(provider).complete(prompt, systemPrompt);
  }

  async completeWithJson<T>(systemPrompt: string, userPrompt: string, schema: any, provider?: AIProviderType): Promise<T> {
    return this.getProvider(provider).completeWithJson<T>(systemPrompt, userPrompt, schema);
  }

  async parseCV(cvText: string): Promise<string> {
    const systemPrompt = `You are a professional resume parser. Extract ALL information from the resume and return it using the parse_cv tool. Extract EVERYTHING - do not omit any information. If a field is not found, use null or empty arrays.`;

    const userPrompt = `Extract structured information from this CV/resume:\n\n${cvText}`;

    const result = await this.completeWithJson<ParsedCV>(systemPrompt, userPrompt, CV_SCHEMA);
    return JSON.stringify(result);
  }

  async tailorCV(cvText: string, jobDescription: string): Promise<string> {
    const systemPrompt = `You are a professional resume writer. Tailor the resume to match the job description.
- Highlight relevant experience matching job requirements
- Include keywords from the job description
- Reorder experience to prioritize most relevant roles
- Keep the EXACT SAME structure with all fields
- Use the tailor_cv tool to return the result`;

    const userPrompt = `Original Resume (JSON):
${cvText}

Job Description:
${jobDescription}`;

    const result = await this.completeWithJson<ParsedCV>(systemPrompt, userPrompt, TAILOR_CV_SCHEMA);
    return JSON.stringify(result);
  }

  async generateCoverLetter(cvText: string, jobDescription: string, companyName: string): Promise<string> {
    const systemPrompt = `You are a professional cover letter writer. Generate a tailored cover letter that:
- Is 250-400 words
- Addresses the key requirements in the job description
- Highlights specific achievements from the resume relevant to the role
- Shows enthusiasm for the company and role
- Uses a professional but personable tone`;

    const userPrompt = `Resume:\n${cvText}\n\nJob Description:\n${jobDescription}\n\nCompany: ${companyName}`;
    return this.complete(userPrompt, systemPrompt);
  }

  async calculateMatchScore(cvText: string, jobDescription: string): Promise<number> {
    const systemPrompt = `You are an ATS optimization expert. Calculate how well a resume matches a job description.
Return ONLY a number between 0-100 representing the match percentage.
Consider:
- Keyword overlap
- Skills match
- Experience alignment
- Education requirements`;

    const userPrompt = `Resume:\n${cvText}\n\nJob Description:\n${jobDescription}`;
    const result = await this.complete(userPrompt, systemPrompt);
    const match = result.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }
}

let aiServiceInstance: AIService | null = null;

export function initAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      minimaxApiKey: process.env.MINIMAX_API_KEY,
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      defaultProvider: process.env.AI_PROVIDER as AIProviderType || 'anthropic'
    });
  }
  return aiServiceInstance;
}

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    return initAIService();
  }
  return aiServiceInstance;
}
