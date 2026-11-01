import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import type { ExtractionResult, ExtractedLineItem } from './ocrService.ts';

export interface GeminiEnhanceOptions {
  userConsent: boolean;
  modelName?: string;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
        this.isConfigured = true;
      } catch (err) {
        console.warn('[GeminiService] Failed to initialize GoogleGenAI client:', err);
      }
    }
  }

  public isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Process document using Gemini Flash model with strict structured output
   */
  public async extractWithGemini(
    filePath: string,
    mimeType: string,
    options: GeminiEnhanceOptions
  ): Promise<ExtractionResult> {
    if (!options.userConsent) {
      throw new Error(
        'User consent is strictly required before sending receipt documents to external cloud AI.'
      );
    }

    if (!this.isAvailable() || !this.client) {
      throw new Error(
        'Gemini API key is not configured on the server. Falling back to local OCR engine.'
      );
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const model = options.modelName || 'gemini-2.5-flash';

    const systemInstruction = `
You are an expert Indian wedding invoice & receipt auditor for ShaadiSaathi.
Extract structured expense data from the provided document image or PDF.
Rules:
1. Never invent missing amounts, dates, or vendors.
2. If an amount is ambiguous, report it as null or omit.
3. Categorize into one of: 'venue', 'catering', 'decoration', 'clothing', 'jewellery', 'photography', 'invitations', 'makeup', 'transport', 'gifts', 'other'.
4. Detect grand total from the document.
5. Extract individual line items with description and amount in Indian Rupees (INR).
`;

    const prompt = `
Analyze this receipt/invoice. Return a JSON object with:
{
  "vendor": string or null,
  "date": "YYYY-MM-DD" or null,
  "grandTotal": number or null,
  "paymentMethod": "cash" | "upi" | "card" | "bank_transfer" | "other",
  "paymentStatus": "paid" | "pending",
  "lineItems": [
    {
      "description": string,
      "amount": number,
      "category": string,
      "confidence": number
    }
  ]
}
Return only JSON.
`;

    try {
      const response = await this.client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);

      const detectedVendor = parsed.vendor || null;
      const detectedDate = parsed.date || null;
      const detectedGrandTotal = typeof parsed.grandTotal === 'number' ? parsed.grandTotal : null;
      const itemsList: any[] = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];

      const lineItems: ExtractedLineItem[] = itemsList.map((item, idx) => {
        const amt = Number(item.amount) || 0;
        return {
          id: `gemini-item-${idx + 1}`,
          description: item.description || `Item #${idx + 1}`,
          amount: amt,
          amountPaise: Math.round(amt * 100),
          category: item.category || 'other',
          categoryInferred: true,
          date: detectedDate || new Date().toISOString().split('T')[0],
          dateInferred: !detectedDate,
          vendor: detectedVendor || '',
          vendorInferred: !detectedVendor,
          paymentMethod: parsed.paymentMethod || 'upi',
          paymentStatus: parsed.paymentStatus || 'paid',
          confidence: Number(item.confidence) || 90,
        };
      });

      const sumOfExtractedRows = lineItems.reduce((acc, it) => acc + it.amount, 0);
      let hasTotalDiscrepancy = false;
      let discrepancyAmount = 0;
      const warnings: string[] = [];

      if (detectedGrandTotal !== null && detectedGrandTotal > 0) {
        discrepancyAmount = Math.abs(detectedGrandTotal - sumOfExtractedRows);
        if (discrepancyAmount > 0.05) {
          hasTotalDiscrepancy = true;
          warnings.push(
            `Document total (₹${detectedGrandTotal.toLocaleString('en-IN')}) does not match sum of extracted rows (₹${sumOfExtractedRows.toLocaleString('en-IN')}). Discrepancy: ₹${discrepancyAmount.toLocaleString('en-IN')}.`
          );
        }
      }

      return {
        ocrEngine: 'gemini_flash',
        rawText: responseText,
        confidenceScore: 92,
        detectedVendor,
        detectedDate,
        detectedGrandTotal,
        sumOfExtractedRows,
        hasTotalDiscrepancy,
        discrepancyAmount,
        lineItems,
        warnings,
      };
    } catch (err: any) {
      console.warn('[GeminiService] AI extraction failed or rate limited:', err.message);
      throw err;
    }
  }
}

export const geminiService = new GeminiService();
