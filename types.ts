
export interface ExpressionItem {
  id: string;
  name: string;
  en: string;
  checked: boolean;
  isCustom?: boolean;
}

export interface GenerationResult {
  id: string;
  expressionName: string;
  imageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface RemovalItem {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  width?: number;
  height?: number;
  size?: number;
}
