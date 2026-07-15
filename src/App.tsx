import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Trash2, 
  Loader2, 
  ClipboardPaste,
  Image as ImageIcon,
  Video,
  History,
  LayoutDashboard,
  Zap,
  Layers,
  CheckCircle2,
  ListVideo,
  Instagram
} from 'lucide-react';
import { MediaItem, ExtractionResponse } from './types';

const MediaCard: React.FC<{ item: MediaItem, isDownloading: boolean, onDownload: (item: MediaItem) => void, onRemove: (id: string) => void }> = ({ item, isDownloading, onDownload, onRemove }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
    >
      <div className="relative aspect-square bg-gray-100">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {item.type === 'video' ? <Video className="w-12 h-12" /> : <ImageIcon className="w-12 h-12" />}
          </div>
        )}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {item.quality === 'HD' && (
              <div className="bg-blue-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[10px] font-bold tracking-wider">
                HD
              </div>
            )}
            {item.type === 'video' && (
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white text-xs font-semibold tracking-wide">
                <Video className="w-3.5 h-3.5" />
                VIDEO
              </div>
            )}
          </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-gray-900 font-medium line-clamp-2 text-[15px] leading-snug">
            {item.title || 'Instagram Media'}
          </p>
          <p className="text-gray-400 text-xs truncate">
            {new URL(item.originalUrl).pathname}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onDownload(item)}
            disabled={isDownloading}
            className="flex-1 bg-black hover:bg-gray-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Download {item.quality === 'HD' ? 'HD' : ''}
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'instant' | 'batch' | 'saved'>('instant');
  const [history, setHistory] = useState<MediaItem[]>([]);
  
  // Instant Tab State
  const [instantItem, setInstantItem] = useState<MediaItem | null>(null);
  
  // Batch Tab State
  const [batchUrls, setBatchUrls] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, current: 0 });

  // Global Downloading State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number} | null>(null);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('instaglide_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('instaglide_history', JSON.stringify(history));
  }, [history]);

  const removeHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handlePasteInstant = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes('instagram.com')) {
        processUrl(text, true);
      } else {
        alert('No valid Instagram link found in clipboard.');
      }
    } catch (err) {
      const text = prompt('Please paste the Instagram link here:');
      if (text && text.includes('instagram.com')) {
        processUrl(text, true);
      }
    }
  };

  const processUrl = async (url: string, isInstant: boolean): Promise<MediaItem[]> => {
    const trimmed = url.trim();
    if (!trimmed.includes('instagram.com')) return [];

    const tempId = Math.random().toString(36).substring(7);
    const newItem: MediaItem = {
      id: tempId,
      originalUrl: trimmed,
      status: 'fetching',
      timestamp: Date.now()
    };
    
    if (isInstant) {
      setInstantItem(newItem);
    }

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      });
      
      const data: ExtractionResponse = await res.json();
      
      if (res.ok && data.media && data.media.length > 0) {
        const fetchedItems: MediaItem[] = data.media.map((m, idx) => ({
          id: Math.random().toString(36).substring(7),
          originalUrl: trimmed,
          downloadUrl: m.url,
          thumbnail: m.thumbnail,
          title: data.title + (data.media.length > 1 ? ` (${idx + 1})` : ''),
          type: m.type,
          quality: m.quality,
          status: 'ready',
          timestamp: Date.now()
        }));

        if (isInstant) {
          setInstantItem(null); 
        }
        
        // Add to history (at the beginning)
        setHistory(prev => {
           const filtered = prev.filter(p => !fetchedItems.some(f => f.downloadUrl === p.downloadUrl));
           return [...fetchedItems, ...filtered].slice(0, 100); 
        });

        return fetchedItems;

      } else {
        if (isInstant) {
          setInstantItem({ 
            ...newItem, 
            status: 'error', 
            errorMessage: data.error || 'Failed to extract media' 
          });
        }
        return [];
      }
    } catch (err) {
      if (isInstant) {
        setInstantItem({ 
          ...newItem, 
          status: 'error', 
          errorMessage: 'Network error. Please try again.' 
        });
      }
      return [];
    }
  };

  const handleBatchProcess = async () => {
    const urls = batchUrls.split('\n').map(u => u.trim()).filter(u => u.includes('instagram.com'));
    if (urls.length === 0) {
      alert('Please enter valid Instagram URLs.');
      return;
    }

    setIsBatchProcessing(true);
    setBatchProgress({ total: urls.length, current: 0 });

    for (let i = 0; i < urls.length; i++) {
      await processUrl(urls[i], false);
      setBatchProgress(p => ({ ...p, current: i + 1 }));
    }

    setIsBatchProcessing(false);
    setBatchUrls('');
    setActiveTab('saved'); // Navigate to saved after batch process
  };

  const downloadMedia = async (item: MediaItem): Promise<boolean> => {
    if (!item.downloadUrl) return false;
    try {
      const filename = `${item.title?.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'insta'}_${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
      
      let targetUrl = item.downloadUrl;
      let isDirect = false;
      
      if (targetUrl.includes('rapidcdn.app') || targetUrl.includes('snapcdn')) {
        isDirect = true;
      } else {
        targetUrl = `/api/proxy?url=${encodeURIComponent(item.downloadUrl)}&filename=${encodeURIComponent(filename)}&download=true`;
      }
      
      const response = await fetch(targetUrl);
      if (!response.ok) {
        if (isDirect) {
          const proxyResponse = await fetch(`/api/proxy?url=${encodeURIComponent(item.downloadUrl)}&filename=${encodeURIComponent(filename)}&download=true`);
          if (!proxyResponse.ok) throw new Error('Download failed via proxy');
          const blob = await proxyResponse.blob();
          downloadBlob(blob, filename);
          return true;
        }
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      downloadBlob(blob, filename);
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  };

  const handleSingleDownload = async (item: MediaItem) => {
    setIsDownloading(true);
    const success = await downloadMedia(item);
    if (!success) {
      alert('Failed to download. The link might have expired.');
    } else {
      showToast('Saved to device successfully!');
    }
    setIsDownloading(false);
  };

  const handleDownloadAll = async () => {
    const readyItems = history.filter(item => item.status === 'ready' && item.downloadUrl);
    if (readyItems.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: readyItems.length });

    let successCount = 0;
    for (let i = 0; i < readyItems.length; i++) {
      const success = await downloadMedia(readyItems[i]);
      if (success) successCount++;
      setDownloadProgress(p => p ? { ...p, current: i + 1 } : null);
      // Small delay between downloads to prevent browser freezing/blocking
      await new Promise(r => setTimeout(r, 800));
    }

    setIsDownloading(false);
    setDownloadProgress(null);
    if (successCount < readyItems.length) {
      alert(`Downloaded ${successCount} out of ${readyItems.length} items. Some failed.`);
    } else if (successCount > 0) {
      showToast('All items saved successfully!');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-28 selection:bg-blue-200">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 bg-white/70 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ffb13f] via-[#fd5949] to-[#d6249f] flex items-center justify-center shadow-sm">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">InstaGlide</h1>
        </div>
        {activeTab === 'saved' && history.length > 1 && (
           <button 
             onClick={handleDownloadAll}
             disabled={isDownloading}
             className="text-sm font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
           >
             {isDownloading && downloadProgress ? (
               <><Loader2 className="w-4 h-4 animate-spin"/> {downloadProgress.current}/{downloadProgress.total}</>
             ) : (
               <><Download className="w-4 h-4"/> Download All</>
             )}
           </button>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-8">
        
        {/* INSTANT TAB */}
        {activeTab === 'instant' && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <section className="space-y-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const url = formData.get('url') as string;
                  if (url) processUrl(url, true);
                  e.currentTarget.reset();
                }}
                className="relative flex items-center"
              >
                <input 
                  name="url"
                  type="url" 
                  placeholder="Paste Instagram URL here..." 
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-5 pr-14 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black shadow-sm transition-shadow"
                  required
                />
                <button 
                  type="button"
                  onClick={handlePasteInstant}
                  className="absolute right-3 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste className="w-5 h-5" />
                </button>
              </form>
              
              <button 
                onClick={() => {
                  const input = document.querySelector('input[name="url"]') as HTMLInputElement;
                  if (input && input.value) {
                    processUrl(input.value, true);
                    input.value = '';
                  } else {
                    handlePasteInstant();
                  }
                }}
                className="w-full bg-black hover:bg-gray-800 text-white rounded-2xl py-4 px-6 flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-transform active:scale-95"
              >
                <Download className="w-5 h-5" />
                <span className="text-base font-semibold">Extract Media</span>
              </button>
              <p className="text-center text-gray-500 text-sm mt-4 font-medium">
                Fast download for a single Post, Reel, or Carousel
              </p>
            </section>

            <AnimatePresence>
              {instantItem && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4"
                >
                  {instantItem.status === 'fetching' ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      <p className="text-gray-600 font-medium">Extracting media...</p>
                    </>
                  ) : instantItem.status === 'error' ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <p className="text-gray-900 font-medium text-center">{instantItem.errorMessage}</p>
                      <button 
                        onClick={() => setInstantItem(null)}
                        className="mt-4 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors active:scale-95"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Show recent single fetch right here if available in history, maybe top 1 */}
            {history.length > 0 && (
              <div className="pt-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Most Recent</h3>
                <MediaCard 
                  item={history[0]} 
                  isDownloading={isDownloading} 
                  onDownload={handleSingleDownload} 
                  onRemove={removeHistory} 
                />
              </div>
            )}
          </motion.div>
        )}

        {/* BATCH TAB */}
        {activeTab === 'batch' && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 text-gray-800">
                <Layers className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-lg">Batch Processing</h2>
              </div>
              <p className="text-sm text-gray-500">
                Paste multiple Instagram links below (one per line). We will extract all media and save them to your Dashboard.
              </p>
              
              <textarea
                value={batchUrls}
                onChange={e => setBatchUrls(e.target.value)}
                placeholder={"https://www.instagram.com/reel/xxx\nhttps://www.instagram.com/p/yyy"}
                className="w-full h-48 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black resize-none"
              />

              {isBatchProcessing ? (
                <div className="w-full bg-gray-100 rounded-2xl py-4 px-6 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  <span className="font-medium text-gray-600">Processing {batchProgress.current} of {batchProgress.total}</span>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-1">
                    <div 
                      className="bg-black h-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleBatchProcess}
                  disabled={!batchUrls.trim()}
                  className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-2xl py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <ListVideo className="w-5 h-5" />
                  Extract All Links
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* SAVED DASHBOARD TAB */}
        {activeTab === 'saved' && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             {history.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-gray-800" />
                      Dashboard
                    </h2>
                    <button 
                      onClick={() => {
                        if (confirm('Clear all history?')) setHistory([]);
                      }}
                      className="text-sm font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
      
                  <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                      {history.map((item) => (
                        <MediaCard 
                          key={item.id} 
                          item={item}
                          isDownloading={isDownloading}
                          onDownload={handleSingleDownload}
                          onRemove={removeHistory}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <LayoutDashboard className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Media</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Extracted media will appear here. Try pasting a link in the Instant or Batch tab.
                  </p>
                </div>
             )}
          </motion.div>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/60 pb-safe z-50">
        <div className="max-w-md mx-auto flex items-center justify-around p-2">
          
          <button 
            onClick={() => setActiveTab('instant')}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all ${
              activeTab === 'instant' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${activeTab === 'instant' ? 'bg-gray-100' : ''}`}>
              <Zap className={`w-6 h-6 ${activeTab === 'instant' ? 'fill-black' : ''}`} strokeWidth={activeTab === 'instant' ? 2 : 1.5} />
            </div>
            <span className="text-[10px] font-semibold tracking-wide">Instant</span>
          </button>

          <button 
            onClick={() => setActiveTab('batch')}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all ${
              activeTab === 'batch' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${activeTab === 'batch' ? 'bg-gray-100' : ''}`}>
              <Layers className={`w-6 h-6 ${activeTab === 'batch' ? 'fill-black' : ''}`} strokeWidth={activeTab === 'batch' ? 2 : 1.5} />
            </div>
            <span className="text-[10px] font-semibold tracking-wide">Batch</span>
          </button>

          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all ${
              activeTab === 'saved' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${activeTab === 'saved' ? 'bg-gray-100' : ''}`}>
              <LayoutDashboard className={`w-6 h-6 ${activeTab === 'saved' ? 'fill-black' : ''}`} strokeWidth={activeTab === 'saved' ? 2 : 1.5} />
            </div>
            <span className="text-[10px] font-semibold tracking-wide">Dashboard</span>
          </button>

        </div>
      </div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 font-medium text-sm whitespace-nowrap"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

