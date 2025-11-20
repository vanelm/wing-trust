
import React from 'react';
import { CheckCircle, XCircle, AlertCircle, FileKey, Shield, Layers, Calendar } from 'lucide-react';
import { CertificateInfo } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ValidationResult {
    hasCert: boolean;
    hasKey: boolean;
    hasCa: boolean;
    keyPairMatch: boolean | null;
    chainComplete: boolean | null;
    validityStatus: 'valid' | 'expired' | 'not_yet_valid' | 'unknown';
    certInfo?: CertificateInfo;
    details: string[];
}

interface PackageVerifierProps {
    fileName: string;
    result: ValidationResult;
}

export const PackageVerifier: React.FC<PackageVerifierProps> = ({ fileName, result }) => {
  const { t } = useLanguage();
  
  const StatusRow = ({ 
    label, 
    status, 
    icon: Icon,
    subtext 
  }: { 
    label: string, 
    status: 'success' | 'error' | 'warning' | 'neutral', 
    icon: React.ElementType,
    subtext?: string 
  }) => {
    const colorClass = {
        success: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30',
        error: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-500/30',
        warning: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-500/30',
        neutral: 'text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
    }[status];

    const IconStatus = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertCircle,
        neutral: AlertCircle
    }[status];

    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${colorClass} transition-all`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-black/5 dark:bg-black/20`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-medium text-sm">{label}</h4>
                    {subtext && <p className="text-xs opacity-70">{subtext}</p>}
                </div>
            </div>
            <IconStatus className="w-5 h-5" />
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t('packageDiagnostics')}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-mono bg-zinc-100 dark:bg-zinc-900/50 inline-block px-3 py-1 rounded border border-zinc-200 dark:border-transparent">
                {fileName}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('fileIntegrity')}</h3>
                
                <StatusRow 
                    label={t('certKeyPresent')}
                    status={result.hasCert && result.hasKey ? 'success' : 'error'}
                    icon={FileKey}
                    subtext={result.hasCert && result.hasKey ? t('bothFilesPresent') : t('missingFiles')}
                />

                <StatusRow 
                    label={t('keyPairMatch')} 
                    status={result.keyPairMatch === true ? 'success' : result.keyPairMatch === false ? 'error' : 'neutral'}
                    icon={Shield}
                    subtext={result.keyPairMatch === true ? t('modulusMatches') : result.keyPairMatch === false ? t('keysDoNotMatch') : t('cannotVerify')}
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('chainValidity')}</h3>

                <StatusRow 
                    label={t('chainCompleteness')} 
                    status={result.chainComplete === true ? 'success' : result.chainComplete === false ? 'warning' : 'neutral'}
                    icon={Layers}
                    subtext={result.chainComplete === true ? t('bundleLinksRoot') : result.chainComplete === false ? t('brokenChain') : t('noBundle')}
                />

                <StatusRow 
                    label={t('expirationStatus')}
                    status={result.validityStatus === 'valid' ? 'success' : 'error'}
                    icon={Calendar}
                    subtext={
                        result.validityStatus === 'valid' ? `${t('validUntil')} ${result.certInfo?.validTo.toLocaleDateString()}` : 
                        result.validityStatus === 'expired' ? t('certExpired') : t('checkValidity')
                    }
                />
            </div>
        </div>

        {result.details.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mt-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{t('detailedLogs')}</h3>
                <div className="space-y-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {result.details.map((log, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-indigo-600 dark:text-indigo-500">{`>`}</span>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};