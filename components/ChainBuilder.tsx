import React from 'react';
import { CertificateInfo, ChainItem } from '../types';
import { FileUpload } from './FileUpload';
import { ArrowDown, CheckCircle2, AlertCircle, Link, Trash2, ShieldCheck, Globe } from 'lucide-react';

interface ChainBuilderProps {
  leafCert: CertificateInfo;
  chain: ChainItem[];
  onAddCa: (pem: string) => void;
  onRemoveCa: (index: number) => void;
}

export const ChainBuilder: React.FC<ChainBuilderProps> = ({ leafCert, chain, onAddCa, onRemoveCa }) => {
  // Determine what the next expected issuer is
  const lastCert = chain.length > 0 ? chain[chain.length - 1].info : leafCert;
  const isRootReached = chain.length > 0 && chain[chain.length - 1].isRoot;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex flex-col items-center space-y-2">
        <h2 className="text-xl font-bold text-white">Certificate Chain Assembly</h2>
        <p className="text-zinc-400 text-center max-w-lg text-sm">
          The AIA URL is missing or incomplete. Please manually upload the issuer certificates to build the full chain of trust up to the Root CA.
        </p>
      </div>

      <div className="space-y-0">
        {/* Leaf Node */}
        <div className="relative z-10 bg-zinc-900 border-2 border-indigo-500/50 p-4 rounded-xl shadow-lg shadow-indigo-500/10">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded rotate-[-90deg] origin-center">
            LEAF
          </div>
          <div className="ml-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span className="font-mono text-sm font-bold text-white">{leafCert.commonName}</span>
            </div>
            <div className="text-xs text-zinc-500 flex gap-4">
               <span>Issued by: <span className="text-zinc-300">{leafCert.issuer}</span></span>
               <span>Serial: {leafCert.serialNumber}</span>
            </div>
          </div>
        </div>

        {/* Chain Links */}
        {chain.map((item, index) => (
          <div key={item.id} className="flex flex-col items-center animate-fade-in">
             <div className="h-8 w-0.5 bg-zinc-700 my-1 relative">
                {!item.signsChild && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 w-max flex items-center gap-1 text-red-400 text-xs bg-zinc-950 border border-red-500/30 px-2 py-1 rounded">
                        <AlertCircle size={12} /> Broken Link
                    </div>
                )}
             </div>
             <div className={`w-full relative z-10 bg-zinc-900 border p-4 rounded-xl flex justify-between items-center group
                ${item.isRoot ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-zinc-700'}`}>
                
                <div className="ml-2">
                    <div className="flex items-center gap-2 mb-1">
                        {item.isRoot ? <ShieldCheck className="w-4 h-4 text-yellow-500" /> : <Link className="w-4 h-4 text-zinc-500" />}
                        <span className={`font-mono text-sm font-bold ${item.isRoot ? 'text-yellow-100' : 'text-zinc-200'}`}>
                            {item.info.commonName}
                        </span>
                        {item.isRoot && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded uppercase tracking-wider font-bold">Root CA</span>}
                    </div>
                    <div className="text-xs text-zinc-500">
                        Issued by: <span className="text-zinc-300">{item.info.issuer}</span>
                    </div>
                </div>

                <button 
                    onClick={() => onRemoveCa(index)}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                >
                    <Trash2 size={16} />
                </button>
             </div>
          </div>
        ))}

        {/* Drop Zone for Next Cert */}
        {!isRootReached && (
            <div className="flex flex-col items-center animate-fade-in">
                <div className="h-8 w-0.5 bg-zinc-800 my-1 border-l border-dashed border-zinc-600"></div>
                <div className="w-full bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-colors text-center">
                    <ArrowDown className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                    <h3 className="text-sm font-medium text-zinc-300 mb-1">Upload Issuer</h3>
                    <p className="text-xs text-zinc-500 mb-4">
                        Please upload the certificate for: <br/>
                        <span className="font-mono text-indigo-300">{lastCert.issuer}</span>
                    </p>
                    
                    <div className="max-w-xs mx-auto">
                        {/* Key ensures input clears on successful addition */}
                        <FileUpload 
                            key={chain.length}
                            label="Select .crt / .pem file"
                            accept=".crt,.pem,.cer"
                            onFileSelect={(content) => onAddCa(content)}
                            icon={Link}
                        />
                    </div>
                </div>
            </div>
        )}

        {isRootReached && (
             <div className="flex flex-col items-center mt-4 animate-bounce">
                <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/30 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium text-sm">Chain Complete</span>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};