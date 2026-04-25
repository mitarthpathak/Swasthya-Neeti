export interface Concept {
  id: string;
  title: string;
  description: string;
  category: 'Theoretical Framework' | 'Historical Context' | 'Interdisciplinary Link';
  tags: string[];
  isNew?: boolean;
  correlationNote?: string;
}

export interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'uploading' | 'analyzing' | 'completed';
  subtext?: string;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  password?: string;
  age: string;
  gender?: string;
}
