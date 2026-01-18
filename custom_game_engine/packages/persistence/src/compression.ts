/**
 * Compression utilities for save files.
 *
 * Uses browser CompressionStream API when available (modern browsers),
 * falls back to no compression in older environments.
 *
 * Format: GZIP compression of JSON string
 */

/**
 * Compress data using GZIP.
 * Returns base64-encoded compressed data for storage compatibility.
 */
export async function compress(data: string): Promise<string> {
  // Check if CompressionStream is available (browser)
  if (typeof CompressionStream !== 'undefined') {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const stream = new Blob([encoded as BlobPart]).stream();

    // Type assertion: ReadableStream<Uint8Array> can be piped through CompressionStream
    const compressedStream = stream.pipeThrough(
      new CompressionStream('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>
    );

    const compressedBlob = await new Response(compressedStream).blob();
    const buffer = await compressedBlob.arrayBuffer();

    // Convert to base64 for storage
    return arrayBufferToBase64(buffer);
  }

  // Node.js environment: Check for zlib
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // Dynamic import for Node.js zlib
      const zlib = await import('zlib');
      const util = await import('util');
      const gzip = util.promisify(zlib.gzip);

      const compressed = await gzip(Buffer.from(data, 'utf-8'));
      return compressed.toString('base64');
    } catch (err) {
      console.warn('[Compression] Node.js zlib not available, storing uncompressed');
      return data;  // Fallback: Store uncompressed
    }
  }

  // No compression available - store raw data
  console.warn('[Compression] No compression API available, storing uncompressed');
  return data;
}

/**
 * Decompress data from GZIP.
 * Accepts base64-encoded compressed data.
 */
export async function decompress(compressedData: string): Promise<string> {
  // Try to detect if data is compressed (starts with H4sI which is gzip header in base64)
  const isCompressed = compressedData.startsWith('H4sI');

  if (!isCompressed) {
    // Data is not compressed, return as-is
    return compressedData;
  }

  // Check if DecompressionStream is available (browser)
  if (typeof DecompressionStream !== 'undefined') {
    const buffer = base64ToArrayBuffer(compressedData);
    const stream = new Blob([buffer]).stream();

    // Type assertion: ReadableStream<Uint8Array> can be piped through DecompressionStream
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream('gzip') as unknown as TransformStream<Uint8Array, Uint8Array>
    );

    const decompressedBlob = await new Response(decompressedStream).blob();
    const text = await decompressedBlob.text();

    return text;
  }

  // Node.js environment: Check for zlib
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // Dynamic import for Node.js zlib
      const zlib = await import('zlib');
      const util = await import('util');
      const gunzip = util.promisify(zlib.gunzip);

      const buffer = Buffer.from(compressedData, 'base64');
      const decompressed = await gunzip(buffer);
      return decompressed.toString('utf-8');
    } catch (err) {
      throw new Error(`Failed to decompress data: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // No decompression available
  throw new Error('Compressed data found but no decompression API available');
}

/**
 * Convert ArrayBuffer to base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Calculate compression ratio (compressed size / original size).
 * Returns value between 0 and 1, where smaller is better.
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 1;
  return compressedSize / originalSize;
}

/**
 * Format bytes for human-readable display.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
