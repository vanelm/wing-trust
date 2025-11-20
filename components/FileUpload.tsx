import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, FileCheck, Clipboard, X, ArrowRight } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (content: string, filename: string) => void;
  icon?: React.ElementType;
  fileContent?: string | null;
  onClear?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, accept, onFileSelect, icon: Icon = Upload, fileContent, onClear }) => {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset internal state if fileContent is cleared externally
  useEffect(() => {
    if (!fileContent) {
      setPasteContent('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // We don't forcibly set mode back to upload here to allow user to stay in paste mode if they clear the text
    }
  }, [fileContent]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if(file) processFile(file);
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileSelect(content, file.name);
    };
    reader.readAsText(file);
  };
  
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPasteContent(e.target.value);
  };

  const handleLoadText = () => {
      if (!pasteContent.trim()) return;
      onFileSelect(pasteContent, 'manual-entry.pem');
  };

  if (fileContent) {
     return (
        <div className="relative group border-2 border-dashed border-emerald-500/50 bg-emerald-900/10 rounded-xl p-6 transition-all duration-300">
            <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400">
                   <FileCheck className="w-6 h-6" />
                </div>
                <div>
                    <p className="font-medium text-sm text-zinc-200">{label}</p>
                    <p className="text-xs text-emerald-500 mt-1">Content loaded successfully</p>
                </div>
            </div>
            {onClear && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full transition-colors"
                    title="Clear file"
                >
                    <X size={14} />
                </button>
            )}
        </div>
     );
  }

  return (
    <div className="space-y-2">
        <div className="flex gap-2 text-xs">
            <button 
                onClick={() => setMode('upload')} 
                className={`px-3 py-1 rounded-full transition-colors font-medium ${mode === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Upload File
            </button>
             <button 
                onClick={() => setMode('paste')} 
                className={`px-3 py-1 rounded-full transition-colors font-medium ${mode === 'paste' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Paste Text
            </button>
        </div>

        {mode === 'upload' ? (
            <div 
              className="relative group border-2 border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-zinc-800/50 rounded-xl p-6 transition-all duration-300"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept={accept} 
                onChange={handleChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className="p-3 rounded-full bg-zinc-800 text-zinc-400 group-hover:text-indigo-400 transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-sm text-zinc-200">{label}</p>
                  <p className="text-xs text-zinc-500 mt-1">Drag & drop or click to browse</p>
                </div>
              </div>
            </div>
        ) : (
            <div className="relative border-2 border-dashed border-zinc-700 focus-within:border-indigo-500 focus-within:bg-zinc-800/30 rounded-xl transition-all duration-300 bg-zinc-900/30 p-2">
                 <textarea
                    value={pasteContent}
                    onChange={handlePasteChange}
                    placeholder={`-----BEGIN... Paste ${label} content here...`}
                    className="w-full h-[100px] bg-transparent p-2 text-[10px] leading-relaxed font-mono text-zinc-300 resize-none focus:outline-none placeholder:text-zinc-600 mb-8"
                 />
                 <div className="absolute bottom-2 right-2 flex gap-2">
                    <button 
                        onClick={handleLoadText}
                        disabled={!pasteContent.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white text-xs rounded-lg transition-colors font-medium"
                    >
                        Load Text <ArrowRight size={12} />
                    </button>
                 </div>
            </div>
        )}
    </div>
  );
};