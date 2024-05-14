export async function isValidImage(imageUrl: string): Promise<boolean> {
  // Specify return type
  try {
    // Check 1: Fetch Image (HEAD method to get headers only)
    const response: Response = await fetch(imageUrl, { method: "HEAD" });

    if (!response.ok) {
      return false;
    }

    // Check 2: Content-Type Header
    const contentType: string | null = response.headers.get("content-type"); // Specify content-type
    if (!contentType || !contentType.startsWith("image/")) {
      return false;
    }

    // Check 3: Download a Small Chunk for Validation
    const response2: Response = await fetch(imageUrl);
    const arrayBuffer: ArrayBuffer = await response2.arrayBuffer();
    const buffer: Buffer = Buffer.from(arrayBuffer);

    // Simple check
    if (!isJpegOrPng(buffer)) {
      return false;
    }

    return true;
  } catch (error) {
    // Assuming 'error' is of the 'any' type for simplicity
    console.error("Image validation error:", error);
    return false;
  }
}

// Helper for basic JPEG/PNG check
function isJpegOrPng(buffer: Buffer): boolean {
  // Specify Buffer type
  const jpegCheck = buffer.toString("hex", 0, 4) === "ffd8ffe0";
  const pngCheck = buffer.toString("hex", 0, 8) === "89504e470d0a1a0a";
  return jpegCheck || pngCheck;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
