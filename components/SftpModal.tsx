import React from 'react';
import { SftpCredentials } from '../types';
import { Copy, Check, Server, Terminal } from 'lucide-react';

interface SftpModalProps {
  isOpen: boolean;
  credentials: SftpCredentials | null;
  onClose: () => void;
}

export const SftpModal: React.FC<SftpModalProps> = ({ isOpen, credentials, onClose }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!isOpen || !credentials) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-6 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
                <Server className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Upload Successful</h2>
                <p className="text-indigo-100 text-sm">File is ready for secure distribution.</p>
            </div>
        </div>

        <div className="p-6 space-y-4">
            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-sm space-y-3">
                <div className="flex justify-between items-center group">
                    <span className="text-zinc-500">Host:</span>
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-400">{credentials.host}</span>
                        <button onClick={() => copyToClipboard(credentials.host, 'host')} className="text-zinc-600 hover:text-white">
                            {copied === 'host' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center group">
                    <span className="text-zinc-500">Username:</span>
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-400">{credentials.username}</span>
                        <button onClick={() => copyToClipboard(credentials.username, 'user')} className="text-zinc-600 hover:text-white">
                            {copied === 'user' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center group">
                    <span className="text-zinc-500">Password:</span>
                    <div className="flex items-center gap-2">
                        <span className="text-pink-400">{credentials.password}</span>
                        <button onClick={() => copyToClipboard(credentials.password, 'pass')} className="text-zinc-600 hover:text-white">
                            {copied === 'pass' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-800/50 p-3 rounded text-xs text-zinc-400 flex items-start gap-2">
                <Terminal className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                   Run this command to download: <br/>
                   <code className="text-zinc-300 select-all">sftp {credentials.username}@{credentials.host}:{credentials.path}</code>
                </p>
            </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-lg transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};
