/**
 * PixelLabAPI - Direct API client for PixelLab image and animation generation
 *
 * API Documentation: https://api.pixellab.ai/v1/docs
 */

const PIXELLAB_BASE_URL = 'https://api.pixellab.ai/v1';

/** Image size configuration */
export interface ImageSize {
  width: number;
  height: number;
}

/** View angle options */
export type ViewAngle = 'side' | 'high top-down' | 'low top-down';

/** Direction options */
export type Direction =
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east';

/** Detail level options */
export type DetailLevel = 'low detail' | 'medium detail' | 'high detail' | 'highly detailed';

/** Shading options */
export type ShadingLevel =
  | 'flat shading'
  | 'basic shading'
  | 'medium shading'
  | 'detailed shading'
  | 'highly detailed shading';

/** Outline options */
export type OutlineStyle = 'single color outline' | 'single color black outline' | 'selective outline' | 'lineless';

/** Generate image with Pixflux request */
export interface GenerateImagePixfluxRequest {
  description: string;
  image_size: ImageSize;
  text_guidance_scale?: number; // 1-20, default 8
  init_image?: string; // Base64 PNG
  init_image_strength?: number; // 1-999, default 300
  color_image?: string; // Base64 PNG for color palette
  seed?: number;
  no_background?: boolean;
}

/** Generate image with Bitforge request */
export interface GenerateImageBitforgeRequest {
  description: string;
  image_size: ImageSize;
  text_guidance_scale?: number;
  style_image?: string; // Base64 PNG
  style_strength?: number; // 0-100
  outline?: OutlineStyle;
  shading?: ShadingLevel;
  detail?: DetailLevel;
  view?: ViewAngle;
  direction?: Direction;
  inpainting_image?: string;
  mask_image?: string;
  seed?: number;
  no_background?: boolean;
}

/** Animate with text request */
export interface AnimateWithTextRequest {
  description: string;
  action: string;
  image_size: ImageSize;
  reference_image: string; // Base64 PNG - required
  n_frames?: number; // 2-20, default 4
  text_guidance_scale?: number; // 1-20, default 8
  image_guidance_scale?: number; // 1-20, default 1.4
  view?: ViewAngle;
  direction?: Direction;
  inpainting_images?: string[]; // Array of Base64 PNGs
  mask_images?: string[]; // Array of Base64 PNGs
  seed?: number;
}

/** API response with generated image */
export interface GenerateImageResponse {
  image: string; // Base64 PNG
  credits_used?: number;
}

/** API response with animation frames */
export interface AnimateResponse {
  images: string[]; // Array of Base64 PNGs
  credits_used?: number;
}

/** API error response */
export interface APIError {
  detail: string;
  status_code: number;
}

/**
 * PixelLab API Client
 */
export class PixelLabAPI {
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken: string, baseUrl: string = PIXELLAB_BASE_URL) {
    if (!apiToken) {
      throw new Error('PixelLab API token is required');
    }
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate image using Pixflux model
   * Best for: General pixel art generation, larger images (up to 400x400)
   */
  async generateImagePixflux(request: GenerateImagePixfluxRequest): Promise<GenerateImageResponse> {
    return this.post<GenerateImageResponse>('/generate-image-pixflux', request);
  }

  /**
   * Generate image using Bitforge model
   * Best for: Character sprites, styled pixel art (up to 200x200)
   */
  async generateImageBitforge(request: GenerateImageBitforgeRequest): Promise<GenerateImageResponse> {
    return this.post<GenerateImageResponse>('/generate-image-bitforge', request);
  }

  /**
   * Animate a character from reference image
   * Fixed at 64x64 resolution
   */
  async animateWithText(request: AnimateWithTextRequest): Promise<AnimateResponse> {
    return this.post<AnimateResponse>('/animate-with-text', request);
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number }> {
    return this.get<{ balance: number }>('/balance');
  }

  /**
   * Make GET request
   */
  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(`PixelLab API error: ${error.detail} (${error.status_code})`);
    }

    return response.json();
  }

  /**
   * Make POST request
   */
  private async post<T>(endpoint: string, body: object): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await this.parseError(response);
      throw new Error(`PixelLab API error: ${error.detail} (${error.status_code})`);
    }

    return response.json();
  }

  /**
   * Parse error response
   */
  private async parseError(response: Response): Promise<APIError> {
    try {
      const data = await response.json();
      return {
        detail: data.detail || 'Unknown error',
        status_code: response.status,
      };
    } catch {
      return {
        detail: response.statusText || 'Unknown error',
        status_code: response.status,
      };
    }
  }
}

/**
 * Create PixelLab API client from environment variable
 */
export function createPixelLabClient(): PixelLabAPI {
  const token = process.env.PIXELLAB_API_TOKEN;
  if (!token) {
    throw new Error('PIXELLAB_API_TOKEN environment variable is required');
  }
  return new PixelLabAPI(token);
}
