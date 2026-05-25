'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Download, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Layers, 
  Database, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  Check, 
  AlertTriangle,
  XCircle,
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

interface DropzoneProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const FileDropzone: React.FC<DropzoneProps> = ({ label, file, onFileSelect, disabled }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        onFileSelect(selectedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-2 w-full text-left">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      
      {file ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/20 shadow-lg shadow-indigo-950/20 hover:border-indigo-500/35 transition-all">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 flex-shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">{file.name}</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-wide mt-0.5">{formatSize(file.size)}</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => onFileSelect(null)}
            disabled={disabled}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg transition-all cursor-pointer flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border border-dashed transition-all cursor-pointer text-center gap-3 ${
            disabled 
              ? 'bg-slate-900/10 border-slate-900/20 text-slate-650 cursor-not-allowed'
              : isDragActive
                ? 'border-indigo-500 bg-indigo-500/[0.04] text-indigo-300 shadow-xl shadow-indigo-500/[0.03]'
                : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50 text-slate-400'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />
          <div className={`p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 text-slate-400 transition-transform duration-300 ${isDragActive ? 'scale-110 text-indigo-400' : ''}`}>
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-slate-350">
              Drag & drop CSV or <span className="text-indigo-450 underline decoration-indigo-500/20">browse</span>
            </span>
            <span className="text-[9px] text-slate-500 font-medium">Standard crypto ledger layout (Max size 20MB)</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface SummaryData {
  matched: number;
  conflicting: number;
  unmatchedUser: number;
  unmatchedExchange: number;
  totalProcessed: number;
  flaggedRows: {
    user: number;
    exchange: number;
  };
}

interface RunConfig {
  timestampToleranceSec: number;
  quantityTolerancePct: number;
}

interface ReconciliationResultRow {
  _id: string;
  category: 'matched' | 'conflicting' | 'unmatched_user' | 'unmatched_exchange';
  reason: string;
  userTransaction?: {
    transactionId: string;
    timestamp: string;
    type: string;
    asset: string;
    quantity: number;
    priceUsd: number;
    fee: number;
    note?: string;
  };
  exchangeTransaction?: {
    transactionId: string;
    timestamp: string;
    type: string;
    asset: string;
    quantity: number;
    priceUsd: number;
    fee: number;
    note?: string;
  };
  matchDetails?: {
    timestampDiffSec: number;
    quantityDiffPct: number;
    matchScore: number;
    fieldsCompared: {
      priceUsd: { match: boolean };
      fee: { match: boolean };
    };
  };
}

const TableSkeleton = () => {
  return (
    <div className="w-full divide-y divide-slate-900/60 animate-shimmer">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="py-5 px-6 grid grid-cols-5 gap-6">
          <div className="flex flex-col gap-2.5">
            <div className="h-3.5 bg-slate-800/60 rounded-md w-3/4"></div>
            <div className="h-2 bg-slate-900/70 rounded-md w-1/2"></div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="h-3.5 bg-slate-800/60 rounded-md w-2/3"></div>
            <div className="h-2 bg-slate-900/70 rounded-md w-1/3"></div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-3 bg-slate-850 rounded-md w-5/6"></div>
            <div className="h-3 bg-slate-850 rounded-md w-2/3"></div>
          </div>
          <div className="flex justify-center items-center">
            <div className="h-5.5 bg-slate-850 rounded-full w-20"></div>
          </div>
          <div className="h-3 bg-slate-800/50 rounded-md w-full"></div>
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  const [runId, setRunId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [config, setConfig] = useState<RunConfig>({ timestampToleranceSec: 300, quantityTolerancePct: 0.01 });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  
  const [reportRows, setReportRows] = useState<ReconciliationResultRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('');
  
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit] = useState<number>(10); 
  
  const [isServerUp, setIsServerUp] = useState<boolean | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formTimestampTolerance, setFormTimestampTolerance] = useState<number>(300);
  const [formQuantityTolerance, setFormQuantityTolerance] = useState<number>(0.01);

  const [userFile, setUserFile] = useState<File | null>(null);
  const [exchangeFile, setExchangeFile] = useState<File | null>(null);
  const [useDefaultFiles, setUseDefaultFiles] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(true);
  const [modalTab, setModalTab] = useState<'new' | 'load'>('load');
  const [inputRunId, setInputRunId] = useState<string>('');
  const [isLoadingExistingRun, setIsLoadingExistingRun] = useState<boolean>(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (res.ok) {
          setIsServerUp(true);
        } else {
          setIsServerUp(false);
        }
      } catch (err) {
        setIsServerUp(false);
      }
    }
    checkHealth();
  }, []);

  useEffect(() => {
    if (!runId) return;

    async function fetchReport() {
      setIsLoadingReport(true);
      setErrorMsg(null);
      try {
        if (activeCategoryFilter === 'unmatched') {
          const res = await fetch(`${BACKEND_URL}/api/report/${runId}/unmatched`);
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Failed to fetch unmatched records.');
          }
          const data = await res.json();
          setReportRows(data.unmatched || []);
          setTotalPages(1);
        } else {
          const queryParams = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            ...(activeCategoryFilter ? { category: activeCategoryFilter } : {})
          });

          const res = await fetch(`${BACKEND_URL}/api/report/${runId}?${queryParams.toString()}`);
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Failed to fetch report.');
          }

          const data = await res.json();
          setReportRows(data.results || []);
          if (data.pagination) {
            setTotalPages(data.pagination.pages || 1);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setIsLoadingReport(false);
      }
    }

    fetchReport();
  }, [runId, page, activeCategoryFilter, limit]);

  const readAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsText(file);
    });
  };

  const handleTriggerReconcile = async () => {
    setIsReconciling(true);
    setErrorMsg(null);
    setSummary(null);
    setReportRows([]);
    setPage(1);

    if (!useDefaultFiles && (!userFile || !exchangeFile)) {
      setErrorMsg('Please upload both User and Exchange CSV files, or select "Use default system files".');
      setIsReconciling(false);
      return;
    }

    try {
      let userCsvContent = '';
      let exchangeCsvContent = '';

      if (!useDefaultFiles && userFile && exchangeFile) {
        try {
          userCsvContent = await readAsText(userFile);
          exchangeCsvContent = await readAsText(exchangeFile);
        } catch (readErr: any) {
          throw new Error(readErr.message || 'Error parsing selected files.');
        }
      }

      const res = await fetch(`${BACKEND_URL}/api/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(userCsvContent ? { userCsvContent } : {}),
          ...(exchangeCsvContent ? { exchangeCsvContent } : {}),
          timestampToleranceSec: formTimestampTolerance,
          quantityTolerancePct: formQuantityTolerance
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ingestion or matching failed.');
      }

      const runInfo = await res.json();
      setRunId(runInfo.runId);
      setStatus(runInfo.status);
      setIsUploadModalOpen(false);

      const summaryRes = await fetch(`${BACKEND_URL}/api/report/${runInfo.runId}/summary`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData.summary);
        setConfig(summaryData.config);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleLoadExistingRun = async () => {
    if (!inputRunId.trim()) return;
    setIsLoadingExistingRun(true);
    setErrorMsg(null);
    try {
      const summaryRes = await fetch(`${BACKEND_URL}/api/report/${inputRunId.trim()}/summary`);
      if (!summaryRes.ok) {
        const errData = await summaryRes.json();
        throw new Error(errData.detail || 'Reconciliation run ID not found or server error.');
      }
      
      const summaryData = await summaryRes.json();
      setRunId(inputRunId.trim());
      setStatus(summaryData.status || 'completed');
      setSummary(summaryData.summary);
      setConfig(summaryData.config);
      
      setIsUploadModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoadingExistingRun(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!runId) return;
    window.open(`${BACKEND_URL}/api/report/${runId}?format=csv`, '_blank');
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatFee = (val: number | undefined, asset: string | undefined) => {
    if (val === undefined || val === null) return '-';
    const formattedVal = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(val);
    return asset ? `${formattedVal} ${asset}` : formattedVal;
  };

  const filteredRows = reportRows.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    const userTxId = row.userTransaction?.transactionId?.toLowerCase() || '';
    const exchangeTxId = row.exchangeTransaction?.transactionId?.toLowerCase() || '';
    const userAsset = row.userTransaction?.asset?.toLowerCase() || '';
    const exchangeAsset = row.exchangeTransaction?.asset?.toLowerCase() || '';
    const reason = row.reason.toLowerCase();

    return userTxId.includes(q) || exchangeTxId.includes(q) || userAsset.includes(q) || exchangeAsset.includes(q) || reason.includes(q);
  });

  const matchRate = summary && summary.totalProcessed > 0
    ? Math.round(((summary.matched + summary.conflicting) / (summary.totalProcessed - summary.unmatchedExchange)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30">
      
      {/* Dynamic Navigation Header */}
      <header className="border-b border-brand-border py-4 px-6 md:px-12 flex items-center justify-between bg-[#040813]/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 rounded-xl shadow-lg glow-indigo border border-indigo-400/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              KoinX Reconciler
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Automated Cryptographic Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {runId && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-[11px] font-bold shadow-md shadow-indigo-950/50 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" /> Re-Reconcile
            </button>
          )}

          {isServerUp === true && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/[0.04] text-emerald-450 border border-emerald-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-550"></span>
              </span>
              Engine Active
            </span>
          )}
          {isServerUp === false && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-500/[0.04] text-rose-450 border border-rose-500/10 animate-pulse-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              Engine Disconnected
            </span>
          )}
          {isServerUp === null && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold bg-slate-500/[0.04] text-slate-450 border border-slate-500/10">
              <RefreshCw className="h-3 w-3 animate-spin text-slate-500" />
              Pinging Core...
            </span>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="mx-6 md:mx-12 mt-6 p-4 bg-rose-500/[0.02] border border-rose-500/10 text-rose-400 rounded-xl flex items-start gap-3.5 shadow-lg shadow-rose-950/10 animate-fadeIn">
          <AlertCircle className="h-5 w-5 mt-0.5 text-rose-500 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-xs text-slate-200">Reconciliation Error</h4>
            <p className="text-[11px] mt-1 text-slate-400 leading-normal">{errorMsg}</p>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center max-w-7xl w-full mx-auto">
        {runId ? (
          <div className="w-full flex flex-col gap-6 animate-fadeIn">
            
            {/* Redesigned Metrics Grid */}
            {summary ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                
                {/* Metric 1 */}
                <div className="premium-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-l-indigo-500 shadow-xl bg-brand-slate">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Success Yield Rate</span>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white mt-1.5">{matchRate}%</h2>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">Matched user pairings</span>
                  </div>
                  <div className="h-10 w-10 bg-indigo-500/[0.06] text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/10 shadow-inner glow-indigo">
                    <TrendingUp className="h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="premium-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-l-emerald-500 shadow-xl bg-brand-slate">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Perfect Pairings</span>
                    <h2 className="text-2xl font-extrabold tracking-tight text-emerald-450 mt-1.5">{summary.matched}</h2>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">Zero delta variances</span>
                  </div>
                  <div className="h-10 w-10 bg-emerald-500/[0.06] text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/10 shadow-inner glow-emerald">
                    <CheckCircle className="h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="premium-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-l-amber-500 shadow-xl bg-brand-slate">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Fee / Price Drifts</span>
                    <h2 className="text-2xl font-extrabold tracking-tight text-amber-500 mt-1.5">{summary.conflicting}</h2>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">Flagged conflicts</span>
                  </div>
                  <div className="h-10 w-10 bg-amber-500/[0.06] text-amber-550 rounded-xl flex items-center justify-center border border-amber-500/10 shadow-inner glow-amber">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="premium-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-l-rose-500 shadow-xl bg-brand-slate">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Orphan Exclusions</span>
                    <h2 className="text-2xl font-extrabold tracking-tight text-rose-500 mt-1.5">
                      {summary.unmatchedUser + summary.unmatchedExchange}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">
                      User: {summary.unmatchedUser} | Exch: {summary.unmatchedExchange}
                    </span>
                  </div>
                  <div className="h-10 w-10 bg-rose-500/[0.06] text-rose-450 rounded-xl flex items-center justify-center border border-rose-500/10 shadow-inner glow-rose">
                    <XCircle className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="premium-card p-8 rounded-2xl flex items-center justify-center bg-brand-slate border border-white/[0.03]">
                <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin mr-3" />
                <span className="text-xs text-slate-400 font-semibold tracking-wide">Compiling cryptographic metrics...</span>
              </div>
            )}

            {/* Dashboard Workspace */}
            <div className="premium-card rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-brand-slate">
              
              {/* Filter & Actions Bar */}
              <div className="p-5 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/30">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-500" />
                    <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Reconciliation Ledger</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold tracking-wide">
                    RUN ID: <span className="font-mono text-indigo-400 font-extrabold">{runId}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3.5">
                  <div className="flex items-center bg-slate-950/70 border border-slate-900 rounded-xl px-3.5 py-2 w-full md:w-60 focus-within:border-indigo-500/30 transition-all">
                    <Search className="h-4 w-4 text-slate-650 mr-2 flex-shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Search transactions, assets..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs w-full text-slate-250 placeholder-slate-600 font-medium"
                    />
                  </div>

                  <button
                    onClick={handleDownloadCSV}
                    className="px-4 py-2 bg-slate-900/60 hover:bg-slate-800/80 text-slate-350 hover:text-slate-100 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 border border-slate-800 hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Export Audit CSV
                  </button>
                </div>
              </div>

              {/* Advanced Category Tabs */}
              <div className="flex overflow-x-auto border-b border-slate-900 bg-slate-950/[0.15] px-5 py-2.5 gap-2 scrollbar-none">
                {[
                  { label: 'All Results', value: '' },
                  { label: 'Perfect Matches', value: 'matched' },
                  { label: 'Conflicts', value: 'conflicting' },
                  { label: 'Orphans / Unmatched', value: 'unmatched' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setActiveCategoryFilter(tab.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer ${
                      activeCategoryFilter === tab.value
                        ? 'bg-indigo-500/[0.08] text-indigo-400 border border-indigo-500/25 shadow-inner'
                        : 'bg-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Side-by-Side Comparison Table */}
              <div className="overflow-x-auto relative flex-1 min-h-[350px]">
                {isLoadingReport ? (
                  <TableSkeleton />
                ) : filteredRows.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center gap-3 animate-fadeIn">
                    <div className="p-4 bg-slate-900/40 rounded-full border border-slate-800/50 text-slate-600">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="max-w-xs flex flex-col gap-1">
                      <h4 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider">No results matched</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        No transactions found in this category or matching your search filter terms.
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#050914]/80 border-b border-slate-900 text-slate-500 font-extrabold uppercase tracking-wider text-[9px] sticky top-0 z-10">
                      <tr>
                        <th className="py-4 px-5 w-[22%]">User Ledger Record</th>
                        <th className="py-4 px-5 w-[22%]">Exchange Receipt</th>
                        <th className="py-4 px-5 w-[30%]">Comparison Matrix</th>
                        <th className="py-4 px-4 w-[12%] text-center">Audit Status</th>
                        <th className="py-4 px-5 w-[14%]">Diagnostic Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {filteredRows.map((row, idx) => (
                        <tr key={row._id || `${idx}-${row.userTransaction?.transactionId || ''}-${row.exchangeTransaction?.transactionId || ''}`} className="hover:bg-slate-900/10 transition-all duration-150">
                          
                          {/* User Ledger */}
                          <td className="py-4 px-5 align-top border-r border-slate-900/30">
                            {row.userTransaction ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="font-mono text-slate-300 font-extrabold text-[11px] tracking-tight">{row.userTransaction.transactionId}</span>
                                <span className="text-[9px] text-slate-500 font-semibold tracking-wide flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 flex-shrink-0 text-slate-600" />
                                  {new Date(row.userTransaction.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-400 text-[9px] font-extrabold uppercase tracking-wider">
                                    {row.userTransaction.asset}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{row.userTransaction.type}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-650 italic text-[10px] font-semibold tracking-wide flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 text-slate-700" />
                                Absent from User
                              </span>
                            )}
                          </td>

                          {/* Exchange Ledger */}
                          <td className="py-4 px-5 align-top border-r border-slate-900/30">
                            {row.exchangeTransaction ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="font-mono text-slate-300 font-extrabold text-[11px] tracking-tight">{row.exchangeTransaction.transactionId}</span>
                                <span className="text-[9px] text-slate-500 font-semibold tracking-wide flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 flex-shrink-0 text-slate-600" />
                                  {new Date(row.exchangeTransaction.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-400 text-[9px] font-extrabold uppercase tracking-wider">
                                    {row.exchangeTransaction.asset}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{row.exchangeTransaction.type}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-650 italic text-[10px] font-semibold tracking-wide flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 text-slate-700" />
                                Absent from Exchange
                              </span>
                            )}
                          </td>

                          {/* Comparison Matrix */}
                          <td className="py-4 px-5 align-top">
                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[10px]">
                                
                                {/* Quantity */}
                                <div>
                                  <span className="text-[8.5px] text-slate-550 block uppercase font-bold tracking-wider">Qty Compare</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-slate-300 font-bold">U: {row.userTransaction?.quantity ?? '-'}</span>
                                    <ArrowRight className="h-3 w-3 text-slate-650" />
                                    <span className="text-slate-300 font-bold">E: {row.exchangeTransaction?.quantity ?? '-'}</span>
                                  </div>
                                </div>

                                {/* Price USD */}
                                <div className={row.matchDetails?.fieldsCompared.priceUsd.match === false ? 'p-1 rounded bg-amber-500/[0.02] border border-amber-500/10' : ''}>
                                  <span className={`text-[8.5px] block uppercase font-bold tracking-wider ${row.matchDetails?.fieldsCompared.priceUsd.match === false ? 'text-amber-450' : 'text-slate-550'}`}>
                                    Price USD {row.matchDetails?.fieldsCompared.priceUsd.match === false && '(!)'}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-slate-300 font-semibold">{formatCurrency(row.userTransaction?.priceUsd)}</span>
                                    <ArrowRight className="h-3 w-3 text-slate-650" />
                                    <span className="text-slate-300 font-semibold">{formatCurrency(row.exchangeTransaction?.priceUsd)}</span>
                                  </div>
                                </div>

                                {/* Fee */}
                                <div className={row.matchDetails?.fieldsCompared.fee.match === false ? 'p-1 rounded bg-amber-500/[0.02] border border-amber-500/10' : ''}>
                                  <span className={`text-[8.5px] block uppercase font-bold tracking-wider ${row.matchDetails?.fieldsCompared.fee.match === false ? 'text-amber-450' : 'text-slate-550'}`}>
                                    Fee Compare {row.matchDetails?.fieldsCompared.fee.match === false && '(!)'}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-slate-300 font-semibold">{formatFee(row.userTransaction?.fee, row.userTransaction?.asset)}</span>
                                    <ArrowRight className="h-3 w-3 text-slate-650" />
                                    <span className="text-slate-300 font-semibold">{formatFee(row.exchangeTransaction?.fee, row.exchangeTransaction?.asset)}</span>
                                  </div>
                                </div>

                                {/* Deltas */}
                                {row.matchDetails && (
                                  <div>
                                    <span className="text-[8.5px] text-slate-550 block uppercase font-bold tracking-wider">Deviations</span>
                                    <span className="text-slate-300 font-bold mt-0.5 block tracking-wide">
                                      Time: {row.matchDetails.timestampDiffSec}s | Qty: {row.matchDetails.quantityDiffPct.toFixed(3)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-4 align-top text-center">
                            <div className="flex items-center justify-center min-h-[30px]">
                              {row.category === 'matched' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider bg-emerald-500/[0.06] text-emerald-450 border border-emerald-500/15 glow-emerald">
                                  MATCHED
                                </span>
                              )}
                              {row.category === 'conflicting' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider bg-amber-500/[0.06] text-amber-500 border border-amber-500/15 animate-pulse-soft glow-amber">
                                  CONFLICT
                                </span>
                              )}
                              {row.category === 'unmatched_user' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider bg-rose-500/[0.06] text-rose-450 border border-rose-500/15 glow-rose">
                                  ORPHAN (USR)
                                </span>
                              )}
                              {row.category === 'unmatched_exchange' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider bg-rose-500/[0.06] text-rose-450 border border-rose-500/15 glow-rose">
                                  ORPHAN (EXC)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Diagnostic Reason */}
                          <td className="py-4 px-5 align-top">
                            <p className="text-slate-400 text-[10.5px] leading-relaxed font-semibold">{row.reason}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginated Footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-900 bg-slate-950/20 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Page <span className="text-slate-300 font-bold">{page}</span> of <span className="text-slate-300 font-bold">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`p-2 rounded-lg border text-slate-400 border-slate-800 transition-all ${
                        page === 1 
                          ? 'opacity-30 cursor-not-allowed' 
                          : 'hover:bg-slate-850 hover:text-white cursor-pointer hover:border-slate-700 active:scale-[0.95]'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={`p-2 rounded-lg border text-slate-400 border-slate-800 transition-all ${
                        page === totalPages 
                          ? 'opacity-30 cursor-not-allowed' 
                          : 'hover:bg-slate-850 hover:text-white cursor-pointer hover:border-slate-700 active:scale-[0.95]'
                      }`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Premium Onboarding Slate */
          <div className="w-full max-w-4xl flex flex-col gap-8 py-6 animate-fadeIn">
            
            {/* Header Feature focal point */}
            <div className="text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
              <div className="p-3 bg-indigo-500/[0.04] text-indigo-400 rounded-2xl border border-indigo-500/10 shadow-2xl animate-pulse-soft">
                <Database className="h-8 w-8" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">Cryptocurrency Ledger Reconciliation</h2>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Ingest decentralized self-reported transaction CSV ledgers and pair them against official exchange transaction receipts using score-based temporal algorithms.
                </p>
              </div>
            </div>

            {/* Quick Process Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="premium-card p-5 rounded-2xl flex flex-col gap-3.5 bg-brand-slate text-left">
                <div className="h-8 w-8 bg-indigo-500/[0.06] rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/10 font-extrabold text-xs">
                  01
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Load Datasets</h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                    Upload both User records and official Exchange ledgers or check demo mode to load preloaded transactions instantly.
                  </p>
                </div>
              </div>
              
              <div className="premium-card p-5 rounded-2xl flex flex-col gap-3.5 bg-brand-slate text-left">
                <div className="h-8 w-8 bg-indigo-500/[0.06] rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/10 font-extrabold text-xs">
                  02
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Greedy Pairing</h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                    The engine indexes asset types in O(1) partitions, evaluating spatial and temporal drift against configured tolerances.
                  </p>
                </div>
              </div>

              <div className="premium-card p-5 rounded-2xl flex flex-col gap-3.5 bg-brand-slate text-left">
                <div className="h-8 w-8 bg-indigo-500/[0.06] rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/10 font-extrabold text-xs">
                  03
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Isolate Conflicts</h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                    Instantly export fully detailed audit logs containing pricing mismatches, fee drift anomalies, and diagnostic traces.
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Button Trigger */}
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-xl shadow-indigo-950/60 hover:shadow-indigo-500/[0.05] hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/10"
              >
                <UploadCloud className="h-4.5 w-4.5" /> Initialize Reconciliation Run
              </button>
            </div>

          </div>
        )}
      </main>

      {/* Modern Redesigned Dialog Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02050c]/90 backdrop-blur-xl animate-fadeIn">
          <div className="premium-card w-full max-w-md p-6 md:p-7 rounded-2xl flex flex-col gap-5 shadow-2xl bg-brand-slate border border-white/[0.06] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-950 border border-indigo-400/20 text-white">
                  <Sliders className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">Reconciliation Scope</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">Configure run settings & ledgers</p>
                </div>
              </div>
              {runId && (
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 hover:bg-slate-800/40 rounded-lg text-slate-550 hover:text-slate-200 transition-all cursor-pointer border border-transparent hover:border-slate-800"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              )}
            </div>

            {/* Error alerts inside modal */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/[0.03] border border-rose-500/10 text-rose-450 rounded-xl flex items-start gap-2.5 shadow-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-rose-500" />
                <div className="text-[10.5px] leading-normal font-semibold text-slate-350">
                  <span className="font-bold text-rose-400">Alert:</span> {errorMsg}
                </div>
              </div>
            )}

            {/* Tab switch mechanism */}
            <div className="flex border-b border-slate-900 -mt-1 p-0.5 bg-slate-950/40 rounded-xl">
              <button
                type="button"
                onClick={() => { setModalTab('new'); setErrorMsg(null); }}
                className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all text-center rounded-lg cursor-pointer ${
                  modalTab === 'new'
                    ? 'bg-[#0f1424] text-indigo-400 border border-white/[0.03] shadow-lg shadow-black/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                New Run
              </button>
              <button
                type="button"
                onClick={() => { setModalTab('load'); setErrorMsg(null); }}
                className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all text-center rounded-lg cursor-pointer ${
                  modalTab === 'load'
                    ? 'bg-[#0f1424] text-indigo-400 border border-white/[0.03] shadow-lg shadow-black/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Load Existing Run
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-4">
              {modalTab === 'load' ? (
                <div className="flex flex-col gap-4 animate-fadeIn">
                  <div className="flex flex-col gap-1.5 w-full text-left">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Reconciliation Run ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. b1e7f9a2"
                      value={inputRunId}
                      onChange={(e) => setInputRunId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-900 rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-650 outline-none focus:border-indigo-500/40 transition-all"
                      disabled={isLoadingExistingRun}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadExistingRun}
                    disabled={isLoadingExistingRun || !inputRunId.trim()}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all ${
                      isLoadingExistingRun || !inputRunId.trim()
                        ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent'
                        : 'bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-950/50 hover:scale-[1.01] hover:-translate-y-0.5 cursor-pointer border border-indigo-500/10'
                    }`}
                  >
                    {isLoadingExistingRun ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Fetching run records...
                      </>
                    ) : (
                      <>
                        <Layers className="h-3.5 w-3.5" />
                        Load Run Dashboard
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Modern Checkbox Demo option */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-950/30 border border-slate-900 hover:border-slate-800/80 transition-all animate-fadeIn">
                    <input
                      type="checkbox"
                      id="modal-use-defaults"
                      checked={useDefaultFiles}
                      onChange={(e) => {
                        setUseDefaultFiles(e.target.checked);
                        if (e.target.checked) {
                          setErrorMsg(null);
                        }
                      }}
                      className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 h-4.5 w-4.5 cursor-pointer mt-0.5"
                    />
                    <div className="flex flex-col gap-0.5 text-left">
                      <label htmlFor="modal-use-defaults" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                        Run with default system data
                      </label>
                      <span className="text-[10px] text-slate-500 leading-normal font-semibold">
                        Toggle this on to run the reconciler using preloaded database ledgers without uploading manual CSVs.
                      </span>
                    </div>
                  </div>

                  {/* Dropzone uploads or Info panel */}
                  {!useDefaultFiles ? (
                    <div className="flex flex-col gap-4 animate-fadeIn">
                      <div className="grid grid-cols-1 gap-4">
                        <FileDropzone
                          label="User Ledger CSV"
                          file={userFile}
                          onFileSelect={setUserFile}
                          disabled={isReconciling}
                        />
                        <FileDropzone
                          label="Exchange Ledger CSV"
                          file={exchangeFile}
                          onFileSelect={setExchangeFile}
                          disabled={isReconciling}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-5 rounded-xl bg-slate-950/20 border border-slate-900 text-[10.5px] text-slate-400 font-semibold leading-normal text-center min-h-[140px] animate-fadeIn">
                      <div>
                        <Database className="h-6 w-6 text-indigo-500/50 mx-auto mb-2.5 animate-pulse-soft" />
                        Running in <b className="text-indigo-400">demo dry-run mode</b>.<br />Reconciler will ingest sample datasets preloaded on the server.
                      </div>
                    </div>
                  )}

                  {/* Polished custom tolerances section */}
                  <div className="border-t border-slate-900 pt-4 flex flex-col gap-3 text-left">
                    <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="h-3 w-3" /> Custom Engine Tolerances
                    </span>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Timestamp Tolerance input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-555 uppercase tracking-wide">Time Drift (sec)</label>
                        <input
                          type="number"
                          value={formTimestampTolerance}
                          onChange={(e) => setFormTimestampTolerance(Number(e.target.value))}
                          placeholder="300"
                          className="px-3.5 py-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-xs font-bold text-slate-200 outline-none focus:border-indigo-500/30 w-full"
                          min="1"
                        />
                      </div>

                      {/* Quantity Tolerance input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-555 uppercase tracking-wide">Qty Drift (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={formQuantityTolerance}
                          onChange={(e) => setFormQuantityTolerance(Number(e.target.value))}
                          placeholder="0.01"
                          className="px-3.5 py-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-xs font-bold text-slate-200 outline-none focus:border-indigo-500/30 w-full"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trigger buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleTriggerReconcile}
                      disabled={isReconciling || isServerUp === false}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all ${
                        isReconciling || isServerUp === false
                          ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent'
                          : 'bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-950/50 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer border border-indigo-500/10'
                      }`}
                    >
                      {isReconciling ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Executing Match algorithms...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Start Reconciliation
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
