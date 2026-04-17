import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config();

interface AIProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error('OpenAI API key not provided');
    this.client = new OpenAI({ apiKey });
  }

  async complete(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    return response.choices[0]?.message?.content || '';
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
}

class MiniMaxProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error('MiniMax API key not provided');
    this.client = new Anthropic({
      apiKey,
      baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/anthropic'
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
    const textBlock = response.content.find((block: any) => block.type === 'text');
    return textBlock?.text || '';
  }
}

class OpenRouterProvider implements AIProvider {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey: string;

  constructor(apiKey?: string) {
    if (!apiKey) throw new Error('OpenRouter API key not provided');
    this.apiKey = apiKey;
  }

  async complete(prompt: string, systemPrompt = 'You are a helpful assistant.'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
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

export class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProvider: AIProviderType;

  constructor(config: AIServiceConfig) {
    if (config.openaiApiKey) {
      this.providers.set('openai', new OpenAIProvider(config.openaiApiKey));
    }
    if (config.anthropicApiKey) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropicApiKey));
    }
    if (config.minimaxApiKey) {
      this.providers.set('minimax', new MiniMaxProvider(config.minimaxApiKey));
    }
    if (config.openrouterApiKey) {
      this.providers.set('openrouter', new OpenRouterProvider(config.openrouterApiKey));
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

  async parseCV(cvText: string): Promise<string> {
    const systemPrompt = `You are a professional resume parser. Extract structured information from the resume and return ONLY valid JSON with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "summary": "Professional summary",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "startDate": "YYYY-MM-DD or Month YYYY",
      "endDate": "YYYY-MM-DD or Present",
      "description": "Job responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "location": "Location",
      "graduationDate": "YYYY-MM-DD or Month YYYY"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "languages": ["language1", "language2"]
}
If a field is not found, use null. Do not add any explanatory text, just the JSON.`;

    return this.complete(cvText, systemPrompt);
  }

  async tailorCV(cvText: string, jobDescription: string): Promise<string> {
    const systemPrompt = `You are a professional resume writer. Tailor the resume to match the job description.
- Highlight relevant experience matching job requirements
- Include keywords from the job description
- Reorder experience to prioritize most relevant roles
- Keep the same JSON structure as the input resume
- Return ONLY the tailored resume JSON`;

    const prompt = `Original Resume:\n${cvText}\n\nJob Description:\n${jobDescription}`;
    return this.complete(prompt, systemPrompt);
  }

  async generateCoverLetter(cvText: string, jobDescription: string, companyName: string): Promise<string> {
    const systemPrompt = `You are a professional cover letter writer. Generate a tailored cover letter that:
- Is 250-400 words
- Addresses the key requirements in the job description
- Highlights specific achievements from the resume relevant to the role
- Shows enthusiasm for the company and role
- Uses a professional but personable tone
- Return ONLY the cover letter text, no explanations`;

    const prompt = `Resume:\n${cvText}\n\nJob Description:\n${jobDescription}\n\nCompany: ${companyName}`;
    return this.complete(prompt, systemPrompt);
  }

  async calculateMatchScore(cvText: string, jobDescription: string): Promise<number> {
    const systemPrompt = `You are an ATS optimization expert. Calculate how well a resume matches a job description.
Return ONLY a number between 0-100 representing the match percentage.
Consider:
- Keyword overlap
- Skills match
- Experience alignment
- Education requirements`;

    const prompt = `Resume:\n${cvText}\n\nJob Description:\n${jobDescription}`;
    const result = await this.complete(prompt, systemPrompt);
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