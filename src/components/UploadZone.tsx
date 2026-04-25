import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { apiRequest } from '../services/api';

interface UploadZoneProps {
  setGraphData: (data: any) => void;
  setUploads: (updater: any) => void;
  user: any;
}

export function UploadZone({ setGraphData, setUploads, user }: UploadZoneProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    console.log('Upload triggered, file:', file.name);
    
    // UI Progress Bar Injection
    const newUpload = {
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const,
      subtext: 'Uploading and parsing document'
    };
    setUploads((prev: any) => [...prev, newUpload]);

    const formData = new FormData();
    formData.append('pdf', file);
    if (user?.email) {
      formData.append('userEmail', user.email);
    }

    try {
      setLoading(true);
      setError(null);

      // Simulate progressing chunk fetch
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 20;
        if (currentProgress > 85) currentProgress = 85; // stall at 85 until result received
        setUploads((prev: any) => prev.map((u: any) => u.fileName === file.name ? { 
          ...u, 
          progress: currentProgress, 
          status: 'analyzing', 
          subtext: 'Analyzing context with Groq...' 
        } : u));
      }, 800);

      const response = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();
      console.log('Backend response received:', data);

      if (data.success && data.graph) {
        console.log('Graph data:', data.graph);
        setUploads((prev: any) => prev.map((u: any) => u.fileName === file.name ? { ...u, progress: 100, status: 'completed', subtext: 'Knowledge Network Rendered' } : u));
        
        // Minor delay to let user see 100% completion before screen shift
        setTimeout(() => setGraphData(data), 800);
      } else {
        console.error('Upload failed:', data.error);
        setUploads((prev: any) => prev.map((u: any) => u.fileName === file.name ? { ...u, status: 'completed', subtext: 'AI Error Occurred' } : u));
        setError(data.error || 'Something went wrong. Please try again.');
      }
      
      // Cleanup visual bar after finished
      setTimeout(() => {
        setUploads((prev: any) => prev.filter((u: any) => u.fileName !== file.name));
      }, 4000);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setUploads((prev: any) => prev.map((u: any) => u.fileName === file.name ? { ...u, status: 'completed', subtext: 'Network Error' } : u));
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (files: File[]) => {
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] } as any,
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  return (
    <div {...getRootProps()} className="relative group cursor-pointer w-full">
      <motion.div 
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-br from-primary to-secondary rounded-xl blur transition duration-500",
          isDragActive ? "opacity-40" : "opacity-10 group-hover:opacity-25"
        )}
      />
      <div className="relative glass-panel border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
        <input {...getInputProps()} />
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-headline mb-2 text-primary">Processing Document...</h3>
            <p className="text-on-surface-variant text-sm">Please wait while our AI engine analyzes the contents.</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                upload_file
              </span>
            </div>
            <h3 className="text-xl font-headline mb-2">Manifest Ingestion</h3>
            {error ? (
              <p className="text-red-500 text-sm font-medium mb-2 px-4 py-2 bg-red-50 rounded-lg border border-red-100 animate-pulse">
                {error}
              </p>
            ) : (
              <p className="text-on-surface-variant max-w-[240px]">
                {isDragActive ? "Drop the file here..." : (
                  <>Drag your PDF syllabus here or <span className="text-primary hover:underline">browse files</span></>
                )}
              </p>
            )}
            <div className="mt-8 flex gap-2">
              <span className="px-3 py-1 rounded-full bg-surface-container-highest text-[10px] text-primary border border-primary/20 uppercase tracking-widest font-bold">PDF Only</span>
              <span className="px-3 py-1 rounded-full bg-surface-container-highest text-[10px] text-secondary border border-secondary/20 uppercase tracking-widest font-bold">Max 50MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
