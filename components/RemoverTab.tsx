
import React, { useState, useRef } from 'react';
import { RemovalItem } from '../types';
import { removeBackground, downloadAllImages } from '../utils/imageUtils';

const RemoverTab: React.FC = () => {
  const [items, setItems] = useState<RemovalItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (items.length + newFiles.length > 30) {
      alert('一次最多只能上傳 30 張圖片');
      return;
    }

    const newItems: RemovalItem[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      originalUrl: URL.createObjectURL(file),
      status: 'pending',
      size: file.size
    }));

    setItems(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveBackground = async () => {
    const pending = items.filter(i => i.status === 'pending');
    if (pending.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const current = pending[i];
      setItems(prev => prev.map(item => item.id === current.id ? { ...item, status: 'processing' } : item));

      try {
        const img = new Image();
        img.src = current.originalUrl;
        await new Promise((resolve) => img.onload = resolve);
        
        const processedUrl = await removeBackground(img);
        
        setItems(prev => prev.map(item => 
          item.id === current.id 
            ? { ...item, status: 'completed', processedUrl, width: img.naturalWidth, height: img.naturalHeight } 
            : item
        ));
      } catch (error) {
        console.error(error);
        setItems(prev => prev.map(item => item.id === current.id ? { ...item, status: 'error' } : item));
      }
      setProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setIsProcessing(false);
  };

  const downloadSingle = (item: RemovalItem) => {
    if (!item.processedUrl) return;
    const link = document.createElement('a');
    link.href = item.processedUrl;
    link.download = `${item.file.name.replace(/\.[^/.]+$/, "")}_noBG.png`;
    link.click();
  };

  const downloadAll = async () => {
    const ready = items.filter(i => i.status === 'completed' && i.processedUrl);
    if (ready.length === 0) return;
    
    const list = ready.map(i => ({
      url: i.processedUrl!,
      filename: `${i.file.name.replace(/\.[^/.]+$/, "")}_noBG.png`
    }));
    await downloadAllImages(list);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-900 rounded-3xl p-6 md:p-10 text-white min-h-[600px] shadow-2xl animate-fadeIn">
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-2">綠幕一鍵去背</h2>
          <p className="text-gray-400">專為本站生成的綠幕貼圖設計的高效去背工具</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>選擇檔案
          </button>
          <button 
            onClick={handleRemoveBackground}
            disabled={isProcessing || items.filter(i => i.status === 'pending').length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all disabled:bg-gray-700 disabled:text-gray-500 shadow-lg shadow-indigo-500/20"
          >
            {isProcessing ? '處理中...' : '一鍵去背'}
          </button>
          <input 
            type="file" 
            multiple 
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden" 
            accept="image/*"
          />
        </div>
      </div>

      {isProcessing && (
        <div className="mb-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-indigo-400">處理進度</span>
            <span className="text-sm font-bold text-white">{progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-3xl text-gray-500">
          <i className="fas fa-images text-6xl mb-6 opacity-20"></i>
          <p className="text-xl font-medium">尚未選擇任何圖片</p>
          <p className="text-sm mt-2">最多可批次處理 30 張圖片</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-300">
              待處理清單 <span className="text-sm font-normal text-gray-500 ml-2">已選擇 {items.length} 張</span>
            </h3>
            {items.some(i => i.status === 'completed') && (
              <button onClick={downloadAll} className="text-green-400 hover:text-green-300 text-sm font-bold flex items-center">
                <i className="fas fa-download mr-2"></i>全部下載
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-gray-800/50 border border-gray-800 rounded-2xl p-4 flex flex-col group hover:border-indigo-500/50 transition-all">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-20 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0 border border-gray-700 relative">
                    {item.processedUrl ? (
                      <img src={item.processedUrl} alt="processed" className="w-full h-full object-contain" />
                    ) : (
                      <img src={item.originalUrl} alt="original" className="w-full h-full object-contain opacity-50" />
                    )}
                    {item.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-indigo-500 border-gray-500"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.width ? `${item.width}x${item.height}` : '讀取中...'}
                    </p>
                    <p className="text-xs text-gray-500">{formatSize(item.size || 0)}</p>
                    <div className="mt-2">
                      {item.status === 'completed' && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">完成</span>}
                      {item.status === 'processing' && <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full font-bold animate-pulse">處理中...</span>}
                      {item.status === 'pending' && <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-bold">等待中</span>}
                      {item.status === 'error' && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">錯誤</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                {item.status === 'completed' && (
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={() => downloadSingle(item)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-lg font-bold transition-all"
                    >
                      下載 PNG
                    </button>
                    <button 
                      onClick={() => window.open(item.processedUrl || item.originalUrl, '_blank')}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded-lg font-bold transition-all"
                    >
                      檢視原圖
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoverTab;
