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
  X
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
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      
      {file ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 shadow-md">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 flex-shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">{file.name}</span>
              <span className="text-[10px] text-slate-500 font-bold">{formatSize(file.size)}</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => onFileSelect(null)}
            disabled={disabled}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-md transition-all cursor-pointer flex-shrink-0"
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
          className={`flex flex-col items-center justify-center p-5 rounded-xl border border-dashed transition-all cursor-pointer text-center gap-2 ${
            disabled 
              ? 'bg-slate-900/10 border-slate-900/30 text-slate-600 cursor-not-allowed'
              : isDragActive
                ? 'border-indigo-500 bg-indigo-500/5 text-indigo-300 shadow-lg shadow-indigo-500/5'
                : 'border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40 text-slate-400'
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
          <UploadCloud className={`h-6 w-6 transition-transform ${isDragActive ? 'scale-110 text-indigo-400' : 'text-slate-500'}`} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-300">
              Drag & drop CSV or <span className="text-indigo-400 underline decoration-indigo-400/30">browse</span>
            </span>
            <span className="text-[9px] text-slate-500">Max size 20MB</span>
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
    <div className="w-full divide-y divide-brand-border/40 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="py-4 px-6 grid grid-cols-5 gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-4 bg-slate-800/80 rounded w-3/4"></div>
            <div className="h-2.5 bg-slate-900/50 rounded w-1/2"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 bg-slate-800/80 rounded w-2/3"></div>
            <div className="h-2.5 bg-slate-900/50 rounded w-1/3"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 bg-slate-800/80 rounded w-5/6"></div>
            <div className="h-2.5 bg-slate-900/50 rounded w-1/2"></div>
          </div>
          <div className="flex justify-center items-center">
            <div className="h-5 bg-slate-800/80 rounded-full w-16"></div>
          </div>
          <div className="h-4 bg-slate-800/80 rounded w-11/12"></div>
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
      setErrorMsg('Please upload both User and Exchange CSV files, or check "Use default system files".');
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
          ...(exchangeCsvContent ? { exchangeCsvContent } : {})
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
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col">
      
      <header className="border-b border-brand-border py-4 px-6 md:px-12 flex items-center justify-between bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              KoinX Reconciler
            </h1>
            <p className="text-xs text-slate-400 font-medium">Transaction Reconciliation Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {runId && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 mr-2 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5" /> New Reconciliation
            </button>
          )}
          {isServerUp === true && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="h-3.5 w-3.5" /> Engine Connected
            </span>
          )}
          {isServerUp === false && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
              <XCircle className="h-3.5 w-3.5" /> Connection Offline
            </span>
          )}
          {isServerUp === null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Pinging...
            </span>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="mx-6 md:mx-12 mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-3 shadow-lg shadow-rose-500/5">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Execution Disruption</h4>
            <p className="text-xs mt-1 text-rose-300/90">{errorMsg}</p>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center">
        {runId ? (
          <div className="w-full flex flex-col gap-6 animate-fadeIn">
            
            {summary ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-indigo-500 shadow-xl">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Match Success Rate</span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1.5">{matchRate}%</h2>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">Excludes exchange unmatched</span>
                  </div>
                  <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500 shadow-xl">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Perfect Matches</span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-emerald-400 mt-1.5">{summary.matched}</h2>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">100% matched pairs</span>
                  </div>
                  <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500 shadow-xl">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Discrepancy Conflicts</span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-amber-500 mt-1.5">{summary.conflicting}</h2>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">Fee/Price discrepancies</span>
                  </div>
                  <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-rose-500 shadow-xl">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unmatched Items</span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-rose-500 mt-1.5">
                      {summary.unmatchedUser + summary.unmatchedExchange}
                    </h2>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      User: {summary.unmatchedUser} | Exch: {summary.unmatchedExchange}
                    </span>
                  </div>
                  <div className="h-12 w-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
                    <XCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
                <span className="ml-3 text-sm text-slate-300">Retrieving metrics summary...</span>
              </div>
            )}

            <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <Database className="h-4.5 w-4.5 text-slate-400" />
                    <h3 className="font-bold text-base text-slate-200">Reconciliation Report</h3>
                  </div>
                  <span className="text-xs text-slate-400">Run ID: <span className="font-mono text-indigo-400 font-semibold">{runId}</span></span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  
                  <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 w-full md:w-64">
                    <Search className="h-4 w-4 text-slate-500 mr-2 flex-shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Search assets or IDs..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs w-full text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  <button
                    onClick={handleDownloadCSV}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="flex overflow-x-auto border-b border-brand-border bg-slate-950/20 px-6 py-2.5 gap-2 scrollbar-none">
                {[
                  { label: 'All Records', value: '' },
                  { label: 'Perfect Matches', value: 'matched' },
                  { label: 'Conflicts', value: 'conflicting' },
                  { label: 'Unmatched Only', value: 'unmatched' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setActiveCategoryFilter(tab.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategoryFilter === tab.value
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto relative flex-1 min-h-[350px]">
                {isLoadingReport ? (
                  <TableSkeleton />
                ) : filteredRows.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                    <AlertCircle className="h-10 w-10 text-slate-600" />
                    <div className="max-w-xs">
                      <h4 className="font-bold text-sm text-slate-300">No report records found</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        No transactions found matching the selected category or search filters.
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/50 border-b border-brand-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4 w-[20%]">User Transaction</th>
                        <th className="py-3.5 px-4 w-[20%]">Exchange Transaction</th>
                        <th className="py-3.5 px-4 w-[30%]">Comparison & Audits</th>
                        <th className="py-3.5 px-4 w-[12%] text-center">Status</th>
                        <th className="py-3.5 px-4 w-[18%]">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {filteredRows.map((row, idx) => (
                        <tr key={row._id || `${idx}-${row.userTransaction?.transactionId || ''}-${row.exchangeTransaction?.transactionId || ''}`} className="hover:bg-slate-900/30 transition-all">
                          
                          <td className="py-4 px-4 align-top">
                            {row.userTransaction ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-mono text-slate-300 font-semibold">{row.userTransaction.transactionId}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(row.userTransaction.timestamp).toLocaleTimeString()}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-bold">
                                    {row.userTransaction.asset}
                                  </span>
                                  <span className="text-slate-400 font-medium">{row.userTransaction.type}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">No record</span>
                            )}
                          </td>

                          <td className="py-4 px-4 align-top">
                            {row.exchangeTransaction ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-mono text-slate-300 font-semibold">{row.exchangeTransaction.transactionId}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(row.exchangeTransaction.timestamp).toLocaleTimeString()}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-bold">
                                    {row.exchangeTransaction.asset}
                                  </span>
                                  <span className="text-slate-400 font-medium">{row.exchangeTransaction.type}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">No record</span>
                            )}
                          </td>

                          <td className="py-4 px-4 align-top">
                            <div className="flex flex-col gap-2">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                                
                                <div>
                                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Quantity Compare</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-slate-300 font-medium">U: {row.userTransaction?.quantity ?? '-'}</span>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-slate-300 font-medium">E: {row.exchangeTransaction?.quantity ?? '-'}</span>
                                  </div>
                                </div>

                                <div className={row.matchDetails?.fieldsCompared.priceUsd.match === false ? 'p-1 rounded bg-amber-500/5 border border-amber-500/10' : ''}>
                                  <span className={`text-[10px] block uppercase font-bold ${row.matchDetails?.fieldsCompared.priceUsd.match === false ? 'text-amber-400' : 'text-slate-500'}`}>
                                    Price Compare {row.matchDetails?.fieldsCompared.priceUsd.match === false && '(!)'}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-slate-300 font-medium">{formatCurrency(row.userTransaction?.priceUsd)}</span>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-slate-300 font-medium">{formatCurrency(row.exchangeTransaction?.priceUsd)}</span>
                                  </div>
                                </div>

                                <div className={row.matchDetails?.fieldsCompared.fee.match === false ? 'p-1 rounded bg-amber-500/5 border border-amber-500/10' : ''}>
                                  <span className={`text-[10px] block uppercase font-bold ${row.matchDetails?.fieldsCompared.fee.match === false ? 'text-amber-400' : 'text-slate-500'}`}>
                                    Fee Compare {row.matchDetails?.fieldsCompared.fee.match === false && '(!)'}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-slate-300 font-medium">{formatFee(row.userTransaction?.fee, row.userTransaction?.asset)}</span>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-slate-300 font-medium">{formatFee(row.exchangeTransaction?.fee, row.exchangeTransaction?.asset)}</span>
                                  </div>
                                </div>

                                {row.matchDetails && (
                                  <div>
                                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Deltas</span>
                                    <span className="text-slate-300 font-medium mt-0.5 block">
                                      Time: {row.matchDetails.timestampDiffSec}s | Qty: {row.matchDetails.quantityDiffPct.toFixed(3)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top text-center">
                            {row.category === 'matched' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                MATCHED
                              </span>
                            )}
                            {row.category === 'conflicting' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                CONFLICT
                              </span>
                            )}
                            {row.category === 'unmatched_user' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                UNMATCHED (USR)
                              </span>
                            )}
                            {row.category === 'unmatched_exchange' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                UNMATCHED (EXC)
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 align-top">
                            <p className="text-slate-400 text-xs leading-normal font-medium">{row.reason}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-brand-border bg-slate-950/40 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold">
                    Page <span className="text-slate-300 font-semibold">{page}</span> of <span className="text-slate-300 font-semibold">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`p-2 rounded-lg border text-slate-400 border-slate-800 transition-all ${
                        page === 1 
                          ? 'opacity-40 cursor-not-allowed' 
                          : 'hover:bg-slate-800 hover:text-white cursor-pointer'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={`p-2 rounded-lg border text-slate-400 border-slate-800 transition-all ${
                        page === totalPages 
                          ? 'opacity-40 cursor-not-allowed' 
                          : 'hover:bg-slate-800 hover:text-white cursor-pointer'
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
          /* Blank Slate Welcome view */
          <div className="glass-panel p-16 rounded-2xl flex flex-col items-center justify-center text-center gap-5 shadow-xl max-w-2xl w-full mx-auto my-12 animate-fadeIn">
            <div className="p-5 bg-indigo-500/10 text-indigo-400 rounded-full animate-bounce">
              <Database className="h-10 w-10" />
            </div>
            <div className="max-w-md flex flex-col gap-2">
              <h2 className="text-xl font-bold text-slate-200">Reconciliation Dashboard</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                No active reconciliation run detected. Upload your User and Exchange transaction CSV logs to perform automated transaction matching and generate audit reports.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all flex items-center gap-2 mx-auto cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" /> Ingest & Reconcile Ledgers
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Initial Upload / New Run Modal Popup */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 md:p-8 rounded-2xl flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg shadow-indigo-500/20 animate-pulse">
                  <UploadCloud className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-200">Reconciliation Data Source</h3>
                  <p className="text-xs text-slate-500">Upload transaction CSV logs to begin</p>
                </div>
              </div>
              {runId && (
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Error Message inside modal */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-2.5 shadow-lg shadow-rose-500/5 animate-shake">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Error:</span> {errorMsg}
                </div>
              </div>
            )}

            {/* Modal Body - Single Column */}
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/30 border border-slate-800/80 hover:border-slate-700/80 transition-all animate-fadeIn">
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
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/20 h-5.5 w-5.5 cursor-pointer mt-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="modal-use-defaults" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                    Use default system files
                  </label>
                  <span className="text-[10px] text-slate-500 leading-normal">
                    Toggle this on to run the reconciler using preloaded dummy user/exchange transaction datasets on the backend without uploading files.
                  </span>
                </div>
              </div>

              {!useDefaultFiles ? (
                <div className="flex flex-col gap-4 animate-fadeIn">
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
              ) : (
                <div className="flex items-center justify-center p-6 rounded-xl bg-slate-950/20 border border-slate-800/80 text-[11px] text-slate-400 leading-normal text-center min-h-[140px] animate-fadeIn">
                  <div>
                    <Database className="h-8 w-8 text-indigo-400/50 mx-auto mb-2 animate-pulse" />
                    Running in <b>demo mode</b>.<br />Reconciler will read sample ledger datasets pre-loaded on the server.
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleTriggerReconcile}
                  disabled={isReconciling || isServerUp === false}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                    isReconciling || isServerUp === false
                      ? 'bg-slate-850 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white hover:from-indigo-500 hover:to-blue-400 hover:scale-[1.01] hover:shadow-indigo-500/10 cursor-pointer'
                  }`}
                >
                  {isReconciling ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Executing Matching...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      Start Reconciliation
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-500 font-medium leading-normal">
                  * Check <b>"Use default system files"</b> above to run with demo data.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
