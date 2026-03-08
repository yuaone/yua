import { ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// File type detection and metadata
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: 'image' | 'pdf' | 'document' | 'spreadsheet' | 'code' | 'json' | 'other';
  mimeType: string;
  suggestions: string[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_MESSAGE_SIZE = 200 * 1024 * 1024; // 200MB per message

const EXT_MAP: Record<string, { type: FileInfo['type']; mime: string }> = {
  // Images
  '.png': { type: 'image', mime: 'image/png' },
  '.jpg': { type: 'image', mime: 'image/jpeg' },
  '.jpeg': { type: 'image', mime: 'image/jpeg' },
  '.gif': { type: 'image', mime: 'image/gif' },
  '.webp': { type: 'image', mime: 'image/webp' },
  '.svg': { type: 'image', mime: 'image/svg+xml' },
  // PDF
  '.pdf': { type: 'pdf', mime: 'application/pdf' },
  // Documents
  '.docx': {
    type: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  '.doc': { type: 'document', mime: 'application/msword' },
  '.txt': { type: 'document', mime: 'text/plain' },
  '.md': { type: 'document', mime: 'text/markdown' },
  // Spreadsheets
  '.csv': { type: 'spreadsheet', mime: 'text/csv' },
  '.xlsx': {
    type: 'spreadsheet',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  '.xls': { type: 'spreadsheet', mime: 'application/vnd.ms-excel' },
  // JSON
  '.json': { type: 'json', mime: 'application/json' },
  // Code
  '.ts': { type: 'code', mime: 'text/typescript' },
  '.tsx': { type: 'code', mime: 'text/typescript' },
  '.js': { type: 'code', mime: 'text/javascript' },
  '.jsx': { type: 'code', mime: 'text/javascript' },
  '.py': { type: 'code', mime: 'text/x-python' },
  '.java': { type: 'code', mime: 'text/x-java' },
  '.go': { type: 'code', mime: 'text/x-go' },
  '.rs': { type: 'code', mime: 'text/x-rust' },
  '.c': { type: 'code', mime: 'text/x-c' },
  '.cpp': { type: 'code', mime: 'text/x-c++' },
  '.html': { type: 'code', mime: 'text/html' },
  '.css': { type: 'code', mime: 'text/css' },
  '.sql': { type: 'code', mime: 'text/x-sql' },
  '.sh': { type: 'code', mime: 'text/x-sh' },
  '.yaml': { type: 'code', mime: 'text/yaml' },
  '.yml': { type: 'code', mime: 'text/yaml' },
  '.xml': { type: 'code', mime: 'text/xml' },
};

const SUGGESTIONS: Record<FileInfo['type'], string[]> = {
  image: ['이미지 설명', 'OCR'],
  pdf: ['문서 요약', '핵심 추출'],
  document: ['문서 요약', '핵심 추출'],
  spreadsheet: ['데이터 분석', '트렌드 파악'],
  code: ['코드 리뷰', '버그 찾기'],
  json: ['데이터 분석', '구조 설명'],
  other: [],
};

function getFileInfo(filePath: string): FileInfo | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    if (stat.size > MAX_FILE_SIZE) return null;

    const ext = path.extname(filePath).toLowerCase();
    const mapped = EXT_MAP[ext] ?? {
      type: 'other' as const,
      mime: 'application/octet-stream',
    };

    return {
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      type: mapped.type,
      mimeType: mapped.mime,
      suggestions: SUGGESTIONS[mapped.type] ?? [],
    };
  } catch {
    return null;
  }
}

export function registerFileHandlers(): void {
  // Validate and get info for dropped files
  ipcMain.handle('file:get-info', (_event, filePaths: string[]) => {
    const results: FileInfo[] = [];
    let totalSize = 0;

    for (const fp of filePaths) {
      const info = getFileInfo(fp);
      if (!info) continue;
      totalSize += info.size;
      if (totalSize > MAX_MESSAGE_SIZE) break;
      results.push(info);
    }

    return results;
  });

  // Read file contents as base64 (for upload to backend)
  ipcMain.handle('file:read-as-base64', (_event, filePath: string) => {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) return null;
      const buffer = fs.readFileSync(filePath);
      return buffer.toString('base64');
    } catch {
      return null;
    }
  });

  // Read file as buffer (for binary upload)
  ipcMain.handle('file:read-buffer', (_event, filePath: string) => {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) return null;
      return fs.readFileSync(filePath);
    } catch {
      return null;
    }
  });
}
