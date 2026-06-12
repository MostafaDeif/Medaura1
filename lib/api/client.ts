// API Client utility for Backend for Frontend pattern
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:3001";

export interface FetchOptions extends RequestInit {
  token?: string;
  timeout?: number;
}

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;

  private constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  public static getInstance(baseUrl?: string): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(baseUrl);
    }
    return ApiClient.instance;
  }

  private async fetchWithTimeout(
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> {
    const { timeout = 30000, token, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers);
    
    // Forward the real client IP and GPS/location headers from the browser's request
    if (typeof window === "undefined") {
      try {
        const { headers: nextHeadersFn } = require("next/headers");
        const nextHeaders = await nextHeadersFn();

        // Forward the real client IP so the backend logs the user's IP, not Vercel's server IP.
        // Vercel sets x-forwarded-for on every incoming request with the actual client IP.
        const forwardedFor = nextHeaders.get("x-forwarded-for");
        const realIp = nextHeaders.get("x-real-ip");

        if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
        if (realIp) headers.set("x-real-ip", realIp);

        // Also set x-client-ip to the real client IP, as reverse proxies (like Nginx on AWS)
        // might overwrite x-forwarded-for and x-real-ip with the BFF server IP.
        if (realIp) {
          headers.set("x-client-ip", realIp);
        } else if (forwardedFor) {
          const clientIp = forwardedFor.split(",")[0]?.trim();
          if (clientIp) headers.set("x-client-ip", clientIp);
        }

        // Forward GPS/location headers if provided by the browser
        const lat = nextHeaders.get("x-client-latitude");
        const lon = nextHeaders.get("x-client-longitude");
        const city = nextHeaders.get("x-client-city");
        const region = nextHeaders.get("x-client-region");
        const country = nextHeaders.get("x-client-country");

        if (lat) headers.set("x-client-latitude", lat);
        if (lon) headers.set("x-client-longitude", lon);
        if (city) headers.set("x-client-city", city);
        if (region) headers.set("x-client-region", region);
        if (country) headers.set("x-client-country", country);
      } catch (err) {
        // Silently catch if require("next/headers") or nextHeadersFn() is called outside request context
      }
    }

    const body = fetchOptions.body;
    const isFormData = body && (
      body instanceof FormData ||
      body.constructor?.name === "FormData" ||
      typeof (body as any).append === "function"
    );

    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
        credentials: 'include',
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async get<T = any>(
    endpoint: string,
    options?: FetchOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      method: "GET",
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  private serializeBody(body: any) {
    if (body && (
      body instanceof FormData ||
      body.constructor?.name === "FormData" ||
      typeof body.append === "function" ||
      body instanceof Blob ||
      body.constructor?.name === "Blob" ||
      typeof body.arrayBuffer === "function"
    )) {
      return body;
    }

    if (body === undefined) {
      return undefined;
    }

    return JSON.stringify(body);
  }

  public async post<T = any>(
    endpoint: string,
    body?: any,
    options?: FetchOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      body: this.serializeBody(body),
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  public async put<T = any>(
    endpoint: string,
    body?: any,
    options?: FetchOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      method: "PUT",
      body: this.serializeBody(body),
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  public async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: FetchOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      method: "PATCH",
      body: this.serializeBody(body),
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  public async delete<T = any>(
    endpoint: string,
    options?: FetchOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      method: "DELETE",
      ...options,
    });
    return this.handleResponse<T>(response);
  }

  // Method to get raw response with headers (for capturing Set-Cookie, etc.)
  public async getRawResponse(
    endpoint: string,
    method: string,
    body?: any,
    options?: FetchOptions
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      method,
      body: this.serializeBody(body),
      ...options,
    });
    return response;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    let data: any;

    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      throw new Error(`Failed to parse response: ${error}`);
    }

    if (!response.ok) {
      const error = new Error(
        data?.message || data?.error || response.statusText
      );
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data as T;
  }

  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const apiClient = ApiClient.getInstance();
