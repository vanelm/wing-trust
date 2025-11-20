import React from 'react';
import { CertificateInfo } from '../types';
import { Shield, ShieldAlert, ShieldCheck, Globe, Calendar, Hash, ExternalLink } from 'lucide-react';

interface CertViewerProps {
  info: CertificateInfo;
  isValid: boolean;
  chainLength: number;
  keyMatched: boolean;
  onDownloadChain: () => void;
  loadingChain: boolean;
}

export const CertViewer: React.FC<CertViewerProps> = ({ info, isValid, chainLength, keyMatched, onDownloadChain, loadingChain }) => {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isValid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
             {isValid ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-zinc-100">{info.commonName}</h3>
            <p className="text-xs text-zinc-500">Serial: {info.serialNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-mono border ${keyMatched ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                {keyMatched ? 'KEY MATCHED' : 'KEY MISMATCH'}
            </span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-zinc-500 mt-1" />
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Organization</label>
              <p className="text-sm text-zinc-300">{info.organization}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-zinc-500 mt-1" />
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Issuer</label>
              <p className="text-sm text-zinc-300">{info.issuer}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-zinc-500 mt-1" />
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Validity</label>
              <p className="text-sm text-zinc-300">
                {new Date(info.validFrom).toLocaleDateString()} &mdash; {new Date(info.validTo).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ExternalLink className="w-4 h-4 text-zinc-500 mt-1" />
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">AIA URL</label>
              <p className="text-xs font-mono text-zinc-400 break-all">{info.aiaUrl || 'Not present'}</p>
            </div>
          </div>
        </div>
      </div>

      {info.aiaUrl && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
                Chain Length: <strong className="text-white">{chainLength}</strong>
            </span>
            <button 
                onClick={onDownloadChain}
                disabled={loadingChain}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
                {loadingChain ? 'Resolving Chain...' : 'Re-fetch Chain'}
            </button>
        </div>
      )}
    </div>
  );
};
