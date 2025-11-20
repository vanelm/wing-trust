import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { CertViewer } from './components/CertViewer';
import { SftpModal } from './components/SftpModal';
import { ChainBuilder } from './components/ChainBuilder';
import { parseCertificate, checkKeyPair, fetchCertificate, createTarball, verifyParent, isSelfSigned } from './services/cryptoService';
import { analyzeCertificate } from './services/geminiService';
import { CertificateInfo, AppStep, SftpCredentials, ChainItem } from './types';
import { ArrowRight, Package, UploadCloud, FileKey, Loader2, ShieldCheck, Download, Layers, ChevronRight, RotateCcw, PenLine } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [certPem, setCertPem] = useState<string | null>(null);
  const [keyPem, setKeyPem] = useState<string | null>(null);
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  
  // Chain State
  const [chainItems, setChainItems] = useState<ChainItem[]>([]);
  
  const [keyMatched, setKeyMatched] = useState<boolean>(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ assessment: string; suggestedFilename: string; readmeContent: string } | null>(null);
  const [customFilename, setCustomFilename] = useState<string>('');
  
  const [loadingChain, setLoadingChain] = useState(false);
  const [generatedTar, setGeneratedTar] = useState<Uint8Array | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState<string>('');
  
  const [uploading, setUploading] = useState(false);
  const [sftpCreds, setSftpCreds] = useState<SftpCredentials | null>(null);
  const [showSftp, setShowSftp] = useState(false);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear all data and start over?")) {
        setStep(AppStep.UPLOAD);
        setCertPem(null);
        setKeyPem(null);
        setCertInfo(null);
        setChainItems([]);
        setKeyMatched(false);
        setIsAnalyzing(false);
        setAnalysis(null);
        setCustomFilename('');
        setLoadingChain(false);
        setGeneratedTar(null);
        setGeneratedFileName('');
        setSftpCreds(null);
        setShowSftp(false);
    }
  };

  // Process Certificate when uploaded
  useEffect(() => {
    if (certPem) {
      try {
        const { info } = parseCertificate(certPem);
        
        // Prevent re-running if the cert hasn't effectively changed (by serial)
        if (info.serialNumber !== certInfo?.serialNumber) {
            setCertInfo(info);
            // Start analysis
            setIsAnalyzing(true);
            
            // Try auto-resolve
            if (info.aiaUrl) {
                resolveChain(info, certPem);
            } else {
                // No AIA, go to manual chain build
                setStep(AppStep.CHAIN_BUILD);
            }
        }
      } catch (e) {
        // Silent fail for partial text input, but logged
        console.warn("Parsing failed", e);
      }
    } else {
        setCertInfo(null);
    }
    
    if (certPem && keyPem) {
      setKeyMatched(checkKeyPair(certPem, keyPem));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certPem, keyPem]);

  // Run Gemini Analysis
  useEffect(() => {
    if (certInfo && isAnalyzing) {
      analyzeCertificate(certInfo, chainItems.length + 1).then(result => {
        setAnalysis(result);
        setCustomFilename(result.suggestedFilename);
        setIsAnalyzing(false);
        // If we were just uploading, move to next relevant step
        if (step === AppStep.UPLOAD) {
            setStep(certInfo.aiaUrl ? AppStep.ANALYSIS : AppStep.CHAIN_BUILD);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certInfo, chainItems.length]); // Re-run if chain changes to update context

  const resolveChain = async (info: CertificateInfo, rootPem: string) => {
    setLoadingChain(true);
    const newChain: ChainItem[] = [];
    
    let currentAia = info.aiaUrl;
    let currentChildPem = rootPem;
    let depth = 0;
    const maxDepth = 5;

    try {
        while (currentAia && depth < maxDepth) {
            const parentPem = await fetchCertificate(currentAia);
            if (parentPem === currentChildPem) break; // Cycle
            
            const { info: parentInfo } = parseCertificate(parentPem);
            
            newChain.push({
                id: `auto-${depth}`,
                status: 'success',
                info: parentInfo,
                source: 'fetched',
                pem: parentPem,
                isRoot: isSelfSigned(parentPem),
                signsChild: verifyParent(currentChildPem, parentPem)
            });
            
            if (newChain[newChain.length-1].isRoot) break;

            currentChildPem = parentPem;
            currentAia = parentInfo.aiaUrl;
            depth++;
        }
        setChainItems(newChain);
        setStep(AppStep.ANALYSIS);
    } catch (e) {
        console.warn("Chain resolution partial/failed:", e);
        setStep(AppStep.CHAIN_BUILD); // Fallback to manual
    } finally {
        setLoadingChain(false);
    }
  };

  const handleAddCa = (pem: string) => {
    try {
        const { info } = parseCertificate(pem);
        
        // Check dupes
        if (chainItems.some(i => i.info.fingerprint === info.fingerprint) || certInfo?.fingerprint === info.fingerprint) {
            alert("Certificate already in chain");
            return;
        }

        const parentPem = pem;
        // Determine child to verify against: either last chain item or leaf
        const childPem = chainItems.length > 0 ? chainItems[chainItems.length - 1].pem : certPem!;

        const signsChild = verifyParent(childPem, parentPem);
        
        const newItem: ChainItem = {
            id: `manual-${Date.now()}`,
            status: 'uploaded',
            info,
            source: 'uploaded',
            pem,
            isRoot: isSelfSigned(pem),
            signsChild
        };

        setChainItems(prev => [...prev, newItem]);
    } catch (e) {
        alert("Failed to parse certificate. Please check the format.");
        console.warn("Invalid CA cert", e);
    }
  };

  const handleRemoveCa = (index: number) => {
    setChainItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateTar = () => {
    if (!certInfo || !certPem || !keyPem || !analysis) return;

    const baseName = customFilename || analysis.suggestedFilename;
    // CA file contains all chain certs
    const caBundle = chainItems.map(i => i.pem).join('\n');
    const readme = analysis.readmeContent;

    const files = [
      { name: `${baseName}.crt`, content: certPem },
      { name: `${baseName}.prv`, content: keyPem },
      { name: `${baseName}.ca`, content: caBundle },
      { name: 'README.txt', content: readme }
    ];

    const tarBytes = createTarball(files);
    setGeneratedTar(tarBytes);
    setGeneratedFileName(`${baseName}.tar`);
    setStep(AppStep.PACKAGING);
  };

  const downloadTar = () => {
    if (!generatedTar) return;
    const blob = new Blob([generatedTar], { type: 'application/x-tar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadToSftp = async () => {
    setUploading(true);
    await new Promise(r => setTimeout(r, 2000));
    
    const baseName = customFilename || analysis?.suggestedFilename || "cert";

    setSftpCreds({
      host: 'sftp.overlords.radio',
      username: `${baseName}_user`,
      password: Math.random().toString(36).slice(-12),
      path: `/incoming/${generatedFileName}`,
      expiresIn: '24h'
    });
    setUploading(false);
    setShowSftp(true);
    setStep(AppStep.DISTRIBUTION);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            <span className="font-bold text-lg tracking-tight text-white">CertOps <span className="text-indigo-400">Forge</span></span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span className={`flex items-center gap-1 ${step >= 0 ? 'text-indigo-400' : ''}`}>
                    1. UPLOAD
                </span>
                <ChevronRight size={12} />
                <button 
                    onClick={() => setStep(AppStep.CHAIN_BUILD)}
                    disabled={!certInfo}
                    className={`flex items-center gap-1 hover:text-indigo-300 transition-colors ${step === AppStep.CHAIN_BUILD ? 'text-indigo-400 font-bold' : ''}`}
                >
                    2. CHAIN
                </button>
                <ChevronRight size={12} />
                <button
                    onClick={() => setStep(AppStep.ANALYSIS)}
                    disabled={step < AppStep.CHAIN_BUILD}
                    className={`flex items-center gap-1 hover:text-indigo-300 transition-colors ${step === AppStep.ANALYSIS ? 'text-indigo-400 font-bold' : ''}`}
                >
                    3. REVIEW
                </button>
                <ChevronRight size={12} />
                <span className={step >= AppStep.PACKAGING ? 'text-indigo-400' : ''}>4. DISTRIBUTE</span>
            </div>

            <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors text-xs font-medium"
            >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Start Over</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Inputs - Always Visible but dimmable */}
          <div className={`lg:col-span-1 space-y-6 transition-opacity duration-300 ${step === AppStep.CHAIN_BUILD ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Source Files</h2>
              <FileUpload 
                label="X.509 Certificate (.crt)" 
                accept=".crt,.pem,.cer"
                onFileSelect={(c) => setCertPem(c)}
                fileContent={certPem}
                onClear={() => { setCertPem(null); setCertInfo(null); }}
              />
              <FileUpload 
                label="Private Key (.key)" 
                accept=".key,.pem,.prv"
                icon={FileKey}
                onFileSelect={(c) => setKeyPem(c)}
                fileContent={keyPem}
                onClear={() => setKeyPem(null)}
              />
            </div>
            
            {/* Info Card Small */}
            {certInfo && step !== AppStep.UPLOAD && (
                <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 animate-fade-in">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-2">Subject</div>
                    <div className="font-mono text-sm text-white truncate" title={certInfo.commonName}>{certInfo.commonName}</div>
                    <div className="mt-2 flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${keyMatched ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                       <span className="text-xs text-zinc-400">{keyMatched ? 'Key Pair Matched' : 'Key Mismatch'}</span>
                    </div>
                </div>
            )}

            {certInfo && keyMatched && (
               <button 
                 onClick={handleGenerateTar}
                 disabled={isAnalyzing || loadingChain || !chainItems.length}
                 className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
               >
                 {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Package className="w-4 h-4" />}
                 {chainItems.length === 0 ? 'Build Chain First' : 'Generate Package'}
               </button>
            )}
          </div>

          {/* Center/Right: Dynamic View */}
          <div className="lg:col-span-2">
            {step === AppStep.UPLOAD && !certInfo && (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600 p-12 min-h-[400px]">
                    <UploadCloud className="w-16 h-16 mb-6 opacity-30" />
                    <h3 className="text-xl font-medium text-zinc-500 mb-2">Start Your Workspace</h3>
                    <p className="text-sm">Upload a certificate and matching private key to begin.</p>
                </div>
            )}

            {step === AppStep.CHAIN_BUILD && certInfo && (
                <div className="animate-fade-in">
                     <div className="mb-4 flex justify-between items-center">
                         <h2 className="text-lg font-bold text-white flex items-center gap-2">
                             <Layers className="text-indigo-400" /> Chain Builder
                         </h2>
                         {chainItems.length > 0 && (
                             <button onClick={() => setStep(AppStep.ANALYSIS)} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                 Next: Review Analysis <ArrowRight size={14}/>
                             </button>
                         )}
                     </div>
                     <ChainBuilder 
                        leafCert={certInfo}
                        chain={chainItems}
                        onAddCa={handleAddCa}
                        onRemoveCa={handleRemoveCa}
                     />
                </div>
            )}

            {(step === AppStep.ANALYSIS || step >= AppStep.PACKAGING) && certInfo && (
              <div className="space-y-6 animate-fade-in">
                <CertViewer 
                  info={certInfo} 
                  isValid={true} 
                  chainLength={chainItems.length}
                  keyMatched={keyMatched}
                  onDownloadChain={() => setStep(AppStep.CHAIN_BUILD)}
                  loadingChain={loadingChain}
                />

                {analysis ? (
                  <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-sm text-indigo-400 font-bold">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                      Security Assessment
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{analysis.assessment}</p>
                    
                    <div className="p-3 bg-black/40 rounded border border-zinc-800 font-mono text-xs text-zinc-400 flex items-center gap-3">
                      <span className="shrink-0">Suggested Filename:</span>
                      <div className="flex-1 relative">
                          <input 
                             type="text" 
                             value={customFilename}
                             onChange={(e) => setCustomFilename(e.target.value)}
                             className="w-full bg-transparent border-none focus:outline-none text-emerald-400 text-sm font-bold border-b border-dashed border-zinc-700 focus:border-emerald-500"
                          />
                          <PenLine className="w-3 h-3 text-zinc-600 absolute right-0 top-1 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-500 p-4">
                        <Loader2 className="animate-spin" /> Analyzing certificate context...
                    </div>
                )}
                
                {(generatedTar || step >= AppStep.PACKAGING) && (
                  <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-emerald-400">Package Artifacts Created</h3>
                        <p className="text-sm text-emerald-400/60 font-mono mt-1">{generatedFileName}</p>
                      </div>
                      <div className="p-3 bg-emerald-500/20 rounded-full">
                        <Package className="w-8 h-8 text-emerald-500" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400 font-mono border-t border-emerald-500/20 pt-4">
                        <div>{customFilename || analysis?.suggestedFilename}.crt</div>
                        <div>{customFilename || analysis?.suggestedFilename}.prv</div>
                        <div>{customFilename || analysis?.suggestedFilename}.ca ({chainItems.length} certs)</div>
                        <div>README.txt</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button 
                        onClick={downloadTar}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download Local
                      </button>
                      <button 
                        onClick={uploadToSftp}
                        disabled={uploading}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                      >
                        {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                        {uploading ? 'Uploading...' : 'Push to SFTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <SftpModal 
        isOpen={showSftp} 
        credentials={sftpCreds} 
        onClose={() => setShowSftp(false)} 
      />
    </div>
  );
}