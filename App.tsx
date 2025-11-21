
import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { CertViewer } from './components/CertViewer';
import { SftpModal } from './components/SftpModal';
import { ChainBuilder } from './components/ChainBuilder';
import { PackageVerifier } from './components/PackageVerifier';
import { CertRequester } from './components/CertRequester';
import { parseCertificate, checkKeyPair, fetchCertificate, createTarball, verifyParent, isSelfSigned, untar, splitCaBundle } from './services/cryptoService';
import { analyzeCertificate } from './services/geminiService';
import { CertificateInfo, AppStep, SftpCredentials, ChainItem } from './types';
import { ArrowRight, Package, UploadCloud, FileKey, Loader2, ShieldCheck, Download, Layers, ChevronRight, RotateCcw, PenLine, Hammer, FileSearch, Sun, Moon, Monitor, Globe } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';
import { useTheme } from './contexts/ThemeContext';

type AppMode = 'builder' | 'validator' | 'requester';

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<AppMode>('builder');

  // --- Builder State ---
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
  
  const [uploading, setUploading] = useState(false);
  const [sftpCreds, setSftpCreds] = useState<SftpCredentials | null>(null);
  const [showSftp, setShowSftp] = useState(false);

  // --- Validator State ---
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validatorFileName, setValidatorFileName] = useState<string>('');

  const handleReset = () => {
    if (window.confirm(t('resetConfirm'))) {
        resetBuilder();
        resetValidator();
    }
  };

  const resetBuilder = () => {
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
    setSftpCreds(null);
    setShowSftp(false);
  };

  const resetValidator = () => {
    setValidationResult(null);
    setValidatorFileName('');
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ru' : 'en');
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

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

  // Re-trigger analysis if language changes
  useEffect(() => {
    if (certInfo) {
        setIsAnalyzing(true);
    }
  }, [language]);

  // Run Gemini Analysis
  useEffect(() => {
    if (certInfo && isAnalyzing) {
      analyzeCertificate(certInfo, chainItems.length + 1, language).then(result => {
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
  }, [certInfo, chainItems.length, isAnalyzing, language]); // Re-run if chain changes to update context

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

  const handleAddCa = (pemContent: string) => {
    let pems = splitCaBundle(pemContent);
    // Fallback for single cert without strict headers or loose text
    if (pems.length === 0) {
         pems = [pemContent];
    }

    const newItems: ChainItem[] = [];
    let tempChain = [...chainItems];
    let currentTailPem = tempChain.length > 0 ? tempChain[tempChain.length - 1].pem : certPem;

    if (!currentTailPem) return;

    // 1. Parse all candidates
    const candidates: { pem: string, info: CertificateInfo }[] = [];
    
    for (const p of pems) {
        try {
            const { info } = parseCertificate(p);
            // Duplicate check
            const existsInChain = tempChain.some(c => c.info.fingerprint === info.fingerprint);
            const existsInNew = newItems.some(c => c.info.fingerprint === info.fingerprint);
            const isLeaf = info.fingerprint === certInfo?.fingerprint;
            
            if (!existsInChain && !existsInNew && !isLeaf) {
                candidates.push({ pem: info.raw, info });
            }
        } catch(e) {
            // ignore invalid blocks in bundle
        }
    }

    if (candidates.length === 0) {
        // If it was a single invalid file (pems.length == 1 which was default), show parse error
        // otherwise (empty pems list after split or duplicates) show no new certs
        if (pems.length === 1) {
             try {
                // Check if it was valid but filtered
                parseCertificate(pems[0]);
                alert(t('noNewCerts'));
             } catch {
                 alert(t('parseError'));
             }
        } else {
            alert(t('noNewCerts'));
        }
        return;
    }

    // 2. Build chain extension greedily
    let found = true;
    let addedCount = 0;

    while (candidates.length > 0 && found) {
        found = false;
        // Find a cert that signs the current tail
        const idx = candidates.findIndex(c => verifyParent(currentTailPem!, c.pem));
        
        if (idx !== -1) {
            const match = candidates[idx];
            candidates.splice(idx, 1); // remove from pool
            
            const newItem: ChainItem = {
                id: `manual-${Date.now()}-${addedCount++}`,
                status: 'uploaded',
                info: match.info,
                source: 'uploaded',
                pem: match.pem,
                isRoot: isSelfSigned(match.pem),
                signsChild: true
            };
            
            newItems.push(newItem);
            currentTailPem = match.pem;
            found = true;
        }
    }

    // 3. Append remaining candidates (broken links or unordered leftovers)
    for (const c of candidates) {
         const signsChild = verifyParent(currentTailPem!, c.pem);
         const newItem: ChainItem = {
            id: `manual-${Date.now()}-${addedCount++}`,
            status: 'uploaded',
            info: c.info,
            source: 'uploaded',
            pem: c.pem,
            isRoot: isSelfSigned(c.pem),
            signsChild: signsChild
        };
        newItems.push(newItem);
        currentTailPem = c.pem;
    }

    setChainItems(prev => [...prev, ...newItems]);
  };

  const handleRemoveCa = (index: number) => {
    setChainItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateTar = () => {
    if (!certInfo || !certPem || !keyPem || !analysis) return;
    // We just advance the step now, actual generation happens on download/push
    // to respect dynamic filename changes
    setStep(AppStep.PACKAGING);
  };

  const preparePackage = () => {
    if (!certInfo || !certPem || !keyPem || !analysis) return null;

    const baseName = customFilename || analysis.suggestedFilename || "cert";
    // CA file contains all chain certs
    const caBundle = chainItems.map(i => i.pem).join('\n');
    
    const files = [
      { name: `${baseName}.crt`, content: certPem },
      { name: `${baseName}.prv`, content: keyPem },
      { name: `${baseName}.ca`, content: caBundle }
    ];

    const tarBytes = createTarball(files);
    return { tarBytes, fileName: `${baseName}.tar`, baseName };
  };

  const downloadTar = () => {
    const pkg = preparePackage();
    if (!pkg) return;

    const blob = new Blob([pkg.tarBytes], { type: 'application/x-tar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pkg.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadToSftp = async () => {
    const pkg = preparePackage();
    if (!pkg) return;

    setUploading(true);
    await new Promise(r => setTimeout(r, 2000));
    
    setSftpCreds({
      host: 'sftp.overlords.radio',
      username: `${pkg.baseName}_user`,
      password: Math.random().toString(36).slice(-12),
      path: `/incoming/${pkg.fileName}`,
      expiresIn: '24h'
    });
    setUploading(false);
    setShowSftp(true);
    setStep(AppStep.DISTRIBUTION);
  };

  // --- Validator Logic ---

  const handleTarUpload = (content: string, filename: string) => {
     // Note: content comes as string from FileUpload, but for binary TAR we need to handle the input differently
  };

  const handleFileChangeForValidator = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     setValidatorFileName(file.name);
     const reader = new FileReader();
     reader.onload = (evt) => {
         if (evt.target?.result) {
             processTarForValidation(evt.target.result as ArrayBuffer);
         }
     };
     reader.readAsArrayBuffer(file);
  };

  const processTarForValidation = (buffer: ArrayBuffer) => {
     const files = untar(buffer);
     const details: string[] = [];
     
     const certFile = files.find(f => f.name.endsWith('.crt') || f.name.endsWith('.cer') || f.name.endsWith('.pem'));
     const keyFile = files.find(f => f.name.endsWith('.key') || f.name.endsWith('.prv'));
     const caFile = files.find(f => f.name.endsWith('.ca') || f.name.endsWith('.bundle'));

     let keyPairMatch: boolean | null = null;
     let chainComplete: boolean | null = null;
     let validityStatus: 'valid' | 'expired' | 'not_yet_valid' | 'unknown' = 'unknown';
     let certInfoVal: CertificateInfo | undefined;

     if (certFile) details.push(`Found Certificate: ${certFile.name}`);
     else details.push("Error: No .crt/.cer found");

     if (keyFile) details.push(`Found Private Key: ${keyFile.name}`);
     else details.push("Error: No private key found");

     if (certFile) {
         try {
             const { info } = parseCertificate(certFile.content);
             certInfoVal = info;
             const now = new Date();
             if (now > info.validTo) validityStatus = 'expired';
             else if (now < info.validFrom) validityStatus = 'not_yet_valid';
             else validityStatus = 'valid';
             
             details.push(`Parsed Cert: ${info.commonName} (Valid until ${info.validTo.toLocaleDateString()})`);
         } catch (e) {
             details.push("Failed to parse certificate content");
         }
     }

     if (certFile && keyFile) {
         keyPairMatch = checkKeyPair(certFile.content, keyFile.content);
         details.push(keyPairMatch ? "Key pair matched successfully" : "CRITICAL: Private key does not match certificate");
     }

     if (caFile) {
         details.push(`Found CA Bundle: ${caFile.name}`);
         const chainPems = splitCaBundle(caFile.content);
         details.push(`Bundle contains ${chainPems.length} certificates`);
         
         if (chainPems.length > 0 && certFile) {
             // Verify link from Leaf -> First CA
             let linked = verifyParent(certFile.content, chainPems[0]);
             if (!linked) {
                 details.push("Leaf certificate not signed by first CA in bundle");
             } else {
                 // Verify chain internal links
                 let brokenIndex = -1;
                 for(let i=0; i < chainPems.length - 1; i++) {
                     if (!verifyParent(chainPems[i], chainPems[i+1])) {
                         brokenIndex = i;
                         break;
                     }
                 }
                 if (brokenIndex > -1) {
                     details.push(`Chain broken between CA #${brokenIndex+1} and CA #${brokenIndex+2}`);
                     chainComplete = false;
                 } else {
                     details.push("Chain continuity verified");
                     chainComplete = true;
                 }
             }
             if (chainComplete === null) chainComplete = linked; // If only 1 CA and it signed leaf
         }
     } else {
         details.push("No CA Bundle found. Cannot verify full chain.");
         chainComplete = null;
     }

     setValidationResult({
         hasCert: !!certFile,
         hasKey: !!keyFile,
         hasCa: !!caFile,
         keyPairMatch,
         chainComplete,
         validityStatus,
         certInfo: certInfoVal,
         details
     });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 selection:bg-indigo-500/30 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-500" />
                <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                WiNG <span className="text-indigo-600 dark:text-indigo-500">Trustpoint Forge</span>
                </span>
            </div>

            {/* Mode Switcher - Compact Tabs */}
            <div className="hidden md:flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 border border-zinc-200 dark:border-zinc-800">
                <button 
                    onClick={() => setMode('builder')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${mode === 'builder' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    <Hammer size={12} /> {t('modeBuilder')}
                </button>
                <button 
                    onClick={() => setMode('validator')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${mode === 'validator' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    <FileSearch size={12} /> {t('modeValidator')}
                </button>
                <button 
                    onClick={() => setMode('requester')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${mode === 'requester' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    <Globe size={12} /> {t('modeRequester')}
                </button>
            </div>
          </div>
          
          {/* Right Side: Compact Actions */}
          <div className="flex items-center gap-3">
            {mode === 'builder' && (
                <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-600 mr-4">
                    <span className={`flex items-center gap-1 ${step >= 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>1. {t('stepUpload')}</span>
                    <ChevronRight size={10} />
                    <span className={step >= AppStep.CHAIN_BUILD ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>2. {t('stepChain')}</span>
                    <ChevronRight size={10} />
                    <span className={step >= AppStep.ANALYSIS ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>3. {t('stepReview')}</span>
                </div>
            )}

            {/* Language Toggle */}
            <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                title="Switch Language"
            >
                <Globe size={16} />
                <span className="text-xs font-mono font-bold uppercase tracking-wide">{language}</span>
            </button>

            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                title={t('theme')}
            >
                <ThemeIcon size={16} />
            </button>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

            <button 
                onClick={handleReset}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                title="Reset"
            >
                <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {mode === 'builder' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Inputs - Always Visible but dimmable */}
            <div className={`lg:col-span-1 space-y-6 transition-opacity duration-300 ${step === AppStep.CHAIN_BUILD ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
                <div className="space-y-4">
                <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('sourceFiles')}</h2>
                <FileUpload 
                    label={`X.509 Certificate (.crt)`} 
                    accept=".crt,.pem,.cer"
                    onFileSelect={(c) => setCertPem(c)}
                    fileContent={certPem}
                    onClear={() => { setCertPem(null); setCertInfo(null); }}
                />
                <FileUpload 
                    label={`Private Key (.key)`} 
                    accept=".key,.pem,.prv"
                    icon={FileKey}
                    onFileSelect={(c) => setKeyPem(c)}
                    fileContent={keyPem}
                    onClear={() => setKeyPem(null)}
                />
                </div>
                
                {certInfo && step !== AppStep.UPLOAD && (
                    <div className="p-4 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-fade-in shadow-sm">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-2">{t('subject')}</div>
                        <div className="font-mono text-sm text-zinc-800 dark:text-white truncate" title={certInfo.commonName}>{certInfo.commonName}</div>
                        <div className="mt-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${keyMatched ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">{keyMatched ? t('keyMatched') : t('keyMismatch')}</span>
                        </div>
                    </div>
                )}

                {certInfo && keyMatched && (
                <button 
                    onClick={handleGenerateTar}
                    disabled={isAnalyzing || loadingChain || !chainItems.length}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-900/20"
                >
                    {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Package className="w-4 h-4" />}
                    {chainItems.length === 0 ? t('buildChainFirst') : t('generatePackage')}
                </button>
                )}
            </div>

            {/* Center/Right: Dynamic View */}
            <div className="lg:col-span-2">
                {step === AppStep.UPLOAD && !certInfo && (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 dark:text-zinc-600 p-12 min-h-[400px] bg-white/50 dark:bg-zinc-900/20">
                        <UploadCloud className="w-16 h-16 mb-6 opacity-30" />
                        <h3 className="text-xl font-medium text-zinc-600 dark:text-zinc-500 mb-2">{t('startWorkspace')}</h3>
                        <p className="text-sm">{t('startWorkspaceDesc')}</p>
                    </div>
                )}

                {step === AppStep.CHAIN_BUILD && certInfo && (
                    <div className="animate-fade-in">
                        <div className="mb-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                <Layers className="text-indigo-600 dark:text-indigo-400" /> {t('chainBuilderTitle')}
                            </h2>
                            {chainItems.length > 0 && (
                                <button onClick={() => setStep(AppStep.ANALYSIS)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1">
                                    {t('nextReview')} <ArrowRight size={14}/>
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
                    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                        {t('securityAssessment')}
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">{analysis.assessment}</p>
                        
                        <div className="p-3 bg-zinc-50 dark:bg-black/40 rounded border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3">
                        <span className="shrink-0">{t('suggestedFilename')}:</span>
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={customFilename}
                                onChange={(e) => setCustomFilename(e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none text-emerald-600 dark:text-emerald-400 text-sm font-bold border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:border-emerald-500"
                            />
                            <PenLine className="w-3 h-3 text-zinc-400 dark:text-zinc-600 absolute right-0 top-1 pointer-events-none" />
                        </div>
                        </div>
                    </div>
                    ) : (
                        <div className="flex items-center gap-2 text-zinc-500 p-4">
                            <Loader2 className="animate-spin" /> {t('analyzing')}
                        </div>
                    )}
                    
                    {(step >= AppStep.PACKAGING) && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-xl space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{t('artifactsCreated')}</h3>
                            <p className="text-sm text-emerald-600/60 dark:text-emerald-400/60 font-mono mt-1">{customFilename || analysis?.suggestedFilename}.tar</p>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-full">
                            <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                        </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono border-t border-emerald-500/20 pt-4">
                            <div>{customFilename || analysis?.suggestedFilename}.crt</div>
                            <div>{customFilename || analysis?.suggestedFilename}.prv</div>
                            <div>{customFilename || analysis?.suggestedFilename}.ca ({chainItems.length} certs)</div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button 
                            onClick={downloadTar}
                            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Download className="w-4 h-4" /> {t('downloadLocal')}
                        </button>
                        <button 
                            onClick={uploadToSftp}
                            disabled={uploading}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                        >
                            {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                            {uploading ? t('uploading') : t('pushSftp')}
                        </button>
                        </div>
                    </div>
                    )}
                </div>
                )}
            </div>
            </div>
        ) : mode === 'validator' ? (
            // --- VALIDATOR VIEW ---
            <div className="max-w-3xl mx-auto">
                {!validationResult ? (
                     <div className="relative group border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-zinc-800/50 rounded-2xl p-12 transition-all duration-300 text-center bg-white/50 dark:bg-zinc-900/20">
                        <input 
                            type="file" 
                            accept=".tar" 
                            onChange={handleFileChangeForValidator}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        />
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                <Package className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-white">{t('validateTitle')}</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
                                    {t('validateDesc')}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <PackageVerifier fileName={validatorFileName} result={validationResult} />
                )}
            </div>
        ) : (
            // --- REQUESTER VIEW ---
            <CertRequester />
        )}
      </main>

      <SftpModal 
        isOpen={showSftp} 
        credentials={sftpCreds} 
        onClose={() => setShowSftp(false)} 
      />
    </div>
  );
}
