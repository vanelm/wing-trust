
import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2, Activity, Globe, Building, Server, ServerOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const BASE_DOMAIN = process.env.BASE_DOMAIN || '.internal.local';
const API_HOST = process.env.CERT_API_HOST || 'localhost';
const API_PORT = process.env.CERT_API_PORT || '5000';

export const CertRequester: React.FC = () => {
  const { t } = useLanguage();
  const [subdomain, setSubdomain] = useState('');
  const [organization, setOrganization] = useState('');
  const [logs, setLogs] = useState<{ts: string, msg: string, type: 'info'|'error'|'success'|'warning'}[]>([]);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'processing' | 'completed' | 'failed'>('idle');
  const [isApiHealthy, setIsApiHealthy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Health Check Polling
  useEffect(() => {
    const checkHealth = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`http://${API_HOST}:${API_PORT}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            setIsApiHealthy(response.ok);
        } catch (e) {
            setIsApiHealthy(false);
        }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    
    return () => {
        clearInterval(interval);
        if (wsRef.current) {
            wsRef.current.close();
        }
    };
  }, []);

  const addLog = (msg: string, type: 'info'|'error'|'success'|'warning' = 'info') => {
    setLogs(prev => [...prev, { ts: new Date().toLocaleTimeString(), msg, type }]);
  };

  const connectWs = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://${API_HOST}:${API_PORT}/ws/status`);
    
    ws.onopen = () => {
      addLog('WebSocket connection established', 'success');
    };

    ws.onmessage = (event) => {
      let message = event.data;
      let type: 'info'|'error'|'success'|'warning' = 'info';

      try {
          const data = JSON.parse(event.data);
          message = data.message || JSON.stringify(data);
          if (data.level === 'error') type = 'error';
          if (data.level === 'success') type = 'success';
          if (data.level === 'warning') type = 'warning';
          
          if (data.status === 'complete') setStatus('completed');
          if (data.status === 'failed') setStatus('failed');
      } catch (e) {
          // raw string, treat as info
      }
      addLog(message, type);
    };

    ws.onclose = () => {
      // Optional: Log closure if it was unexpected
    };

    ws.onerror = () => {
      addLog('WebSocket error occurred', 'error');
    };

    wsRef.current = ws;
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow only lowercase a-z and max length 12
      if (/^[a-z]*$/.test(val) && val.length <= 12) {
          setSubdomain(val);
      }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isApiHealthy) {
        addLog('Cannot initiate request: API is unreachable', 'error');
        return;
    }

    if (subdomain.length < 3) {
        addLog('Validation Error: Common Name must be at least 3 characters.', 'error');
        return;
    }

    const commonName = `${subdomain}${BASE_DOMAIN}`;
    
    setStatus('requesting');
    setLogs([]); // Clear previous logs
    addLog(`Initializing request sequence for ${commonName}...`, 'info');
    
    // Ensure connection
    connectWs();

    try {
      const response = await fetch(`http://${API_HOST}:${API_PORT}/issue_cert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commonName, organization })
      });

      if (!response.ok) {
         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog(`Request Accepted. ID: ${data.id || 'unknown'}`, 'success');
      setStatus('processing');
      
    } catch (error) {
      addLog(`API Request Failed: ${String(error)}`, 'error');
      setStatus('failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
       {/* Left: Control Panel */}
       <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <Activity className="w-5 h-5" />
                  </div>
                  <div>
                      <h2 className="font-bold text-zinc-900 dark:text-white">{t('requestTitle')}</h2>
                      <p className="text-xs text-zinc-500">{t('requestDesc')}</p>
                  </div>
              </div>

              <form onSubmit={handleRequest} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{t('commonName')}</label>
                      <div className="flex items-center w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                          <div className="pl-3 text-zinc-400">
                              <Globe className="w-4 h-4" />
                          </div>
                          <input 
                              type="text" 
                              value={subdomain}
                              onChange={handleSubdomainChange}
                              placeholder="service"
                              className="flex-1 min-w-0 py-2 pl-2 bg-transparent border-none focus:outline-none text-sm text-right text-zinc-900 dark:text-white placeholder:text-zinc-400"
                              required
                          />
                          <div className="pr-3 pl-0.5 py-2 text-sm text-zinc-500 font-mono select-none whitespace-nowrap">
                              {BASE_DOMAIN}
                          </div>
                      </div>
                      <div className="flex justify-end mt-1">
                        <span className="text-[10px] text-zinc-400">
                            {subdomain.length}/12 (min 3, a-z)
                        </span>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{t('organization')}</label>
                      <div className="relative">
                          <Building className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                          <input 
                              type="text" 
                              value={organization}
                              onChange={(e) => setOrganization(e.target.value)}
                              placeholder="Optional"
                              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-zinc-900 dark:text-white placeholder:text-zinc-400"
                          />
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      disabled={status === 'requesting' || status === 'processing' || !isApiHealthy}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-4"
                      title={!isApiHealthy ? "API Unavailable" : ""}
                  >
                      {status === 'requesting' || status === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {t('sendRequest')}
                  </button>
              </form>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {isApiHealthy ? <Server className="w-4 h-4 text-emerald-500" /> : <ServerOff className="w-4 h-4 text-zinc-400 dark:text-red-500" />}
                  {t('connection')}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${isApiHealthy ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'}`}>
                  {isApiHealthy ? t('connected') : t('disconnected')}
              </span>
          </div>
       </div>

       {/* Right: Console / Status */}
       <div className="lg:col-span-2 flex flex-col h-[500px] bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">{t('logs')}</span>
              </div>
              <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
              </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
              {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 space-y-2">
                      <Activity className="w-8 h-8 opacity-20" />
                      <p>{t('ready')}</p>
                  </div>
              )}
              {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                      <span className="text-zinc-400 dark:text-zinc-600 shrink-0 select-none">[{log.ts}]</span>
                      <span className={`break-all ${
                          log.type === 'error' ? 'text-red-600 dark:text-red-400' : 
                          log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 
                          log.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 
                          'text-zinc-700 dark:text-zinc-300'
                      }`}>
                          {log.type === 'success' && '✔ '}
                          {log.type === 'error' && '✖ '}
                          {log.msg}
                      </span>
                  </div>
              ))}
              <div ref={logsEndRef} />
          </div>

          {status === 'processing' && (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border-t border-indigo-100 dark:border-indigo-500/20 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('processing')}...
                  </div>
              </div>
          )}
       </div>
    </div>
  );
};
