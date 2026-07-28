import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  /** 通用文件上传 */
  async uploadFile(file: Express.Multer.File, folder: string = 'files') {
    if (!file) throw new BadRequestException('请选择文件');

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '';
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    writeFileSync(filePath, file.buffer);

    return {
      filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: `/uploads/${folder}/${filename}`,
    };
  }
}
