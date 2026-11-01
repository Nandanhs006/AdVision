import fs from "fs/promises";
import path from "path";
import { ImageStore } from "./types";

export class LocalDiskImageStore implements ImageStore {
  private outputDir: string;
  private publicPrefix: string;

  constructor(outputDir?: string, publicPrefix = "/rendered-ads") {
    this.outputDir =
      outputDir || path.join(process.cwd(), "public", "rendered-ads");
    this.publicPrefix = publicPrefix;
  }

  async saveImage(
    buffer: Buffer,
    filename: string,
    _mimeType = "image/png"
  ): Promise<string> {
    void _mimeType;
    await fs.mkdir(this.outputDir, { recursive: true });
    const fullPath = path.join(this.outputDir, filename);
    await fs.writeFile(fullPath, buffer);
    return `${this.publicPrefix}/${filename}`;
  }
}

// Global default image store singleton
export const defaultImageStore = new LocalDiskImageStore();
