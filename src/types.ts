export interface MediaItem {
  id: string;
  originalUrl: string;
  downloadUrl?: string;
  type?: 'video' | 'image';
  thumbnail?: string;
  title?: string;
  status: 'pending' | 'fetching' | 'ready' | 'error';
  errorMessage?: string;
  timestamp?: number;
  quality?: string;
}

export interface ExtractedMedia {
  url: string;
  type: 'video' | 'image';
  thumbnail: string;
  quality?: string;
}

export interface ExtractionResponse {
  media: ExtractedMedia[];
  title: string;
  error?: string;
}
