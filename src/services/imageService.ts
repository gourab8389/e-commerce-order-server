import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

class ImageService {
  private uploadPath = process.env.UPLOAD_PATH || './uploads';

  async processImage(
    inputPath: string,
    filename: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<string> {
    try {
      const {
        width = 800,
        height = 600,
        quality = 80,
        format = 'webp'
      } = options;

      const outputFilename = `processed-${filename.split('.')[0]}.${format}`;
      const outputPath = path.join(this.uploadPath, outputFilename);

      await sharp(inputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(format, { quality })
        .toFile(outputPath);

      fs.unlinkSync(inputPath);

      return outputFilename;
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  async processMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedImages: string[] = [];

    for (const file of files) {
      try {
        const processedImage = await this.processImage(file.path, file.filename);
        processedImages.push(processedImage);
      } catch (error) {
        console.error(`Failed to process image ${file.filename}:`, error);
        processedImages.push(file.filename);
      }
    }

    return processedImages;
  }

  deleteImage(filename: string): void {
    try {
      const filePath = path.join(this.uploadPath, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Delete image error:', error);
    }
  }
}

export const imageService = new ImageService();