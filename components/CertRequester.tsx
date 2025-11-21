
import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Loader2, Activity, Wifi, WifiOff, Globe, Building } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const CertRequester: React.FC = () => {
  const { t } = useLanguage();
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [logs, setLogs] = useState<{ts: string, msg: string, type: 'info'|'error'|'success'|'warning'}[]>([]);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'processing' | 'completed' | 'failed'>('idle');
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
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

    const ws = new WebSocket('ws://localhost:5000/ws/status');
    
    ws.onopen = () => {
      setWsConnected(true);
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
      setWsConnected(false);
      addLog('WebSocket connection closed', 'warning');
    };

    ws.onerror = () => {
      addLog('WebSocket error occurred', 'error');
      setWsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonName) return;
    
    setStatus('requesting');
    setLogs([]); // Clear previous logs
    addLog(`Initializing request sequence for ${commonName}...`, 'info');
    
    // Ensure connection
    connectWs();

    try {
      const response = await fetch('http://localhost:5000/issue_cert', {
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
                      <div className="relative">
                          <Globe className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                          <input 
                              type="text" 
                              value={commonName}
                              onChange={(e) => setCommonName(e.target.value)}
                              placeholder={t('commonNamePlaceholder')}
                              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white placeholder:text-zinc-400"
                              required
                          />
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
                              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white placeholder:text-zinc-400"
                          />
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      disabled={status === 'requesting' || status === 'processing'}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                      {status === 'requesting' || status === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {t('sendRequest')}
                  </button>
              </form>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {wsConnected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-zinc-400" />}
                  {t('connection')}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${wsConnected ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700'}`}>
                  {wsConnected ? t('connected') : t('disconnected')}
              </span>
          </div>
       </div>

       {/* Right: Console / Status */}
       <div className="lg:col-span-2 flex flex-col h-[500px] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
          <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-mono font-bold text-zinc-300">{t('logs')}</span>
              </div>
              <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
              </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-2">
                      <Activity className="w-8 h-8 opacity-20" />
                      <p>{t('ready')}</p>
                  </div>
              )}
              {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                      <span className="text-zinc-600 shrink-0 select-none">[{log.ts}]</span>
                      <span className={`break-all ${
                          log.type === 'error' ? 'text-red-400' : 
                          log.type === 'success' ? 'text-emerald-400' : 
                          log.type === 'warning' ? 'text-yellow-400' : 
                          'text-zinc-300'
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
              <div className="p-2 bg-indigo-500/10 border-t border-indigo-500/20 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-indigo-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('processing')}...
                  </div>
              </div>
          )}
       </div>
    </div>
  );
};
