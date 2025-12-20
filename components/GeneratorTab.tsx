
import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_EXPRESSIONS } from '../constants';
import { ExpressionItem, GenerationResult } from '../types';
import { translateExpression, generateExpressionImage, generateThemedExpressions } from '../services/geminiService';
import { resizeImage, downloadAllImages, removeBackground } from '../utils/imageUtils';

const GeneratorTab: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('character');
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [expressions, setExpressions] = useState<ExpressionItem[]>(DEFAULT_EXPRESSIONS);
  const [customText, setCustomText] = useState('');
  const [themeText, setThemeText] = useState('');
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stopRequested, setStopRequested] = useState(false);
  
  // 功能與風格開關
  const [isCuteAnime, setIsCuteAnime] = useState(true);
  const [isSituational, setIsSituational] = useState(false);
  const [autoText, setAutoText] = useState(true);
  const [interactionText, setInteractionText] = useState('');
  const [autoRemoveBg, setAutoRemoveBg] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // LINE 規格縮放
  const [lineScaleInput, setLineScaleInput] = useState<string | null>(null);
  const [lineOptions, setLineOptions] = useState({ main: true, tab: false, sticker: true });
  const [lineResults, setLineResults] = useState<{main?: string, tab?: string, sticker?: string}>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lineInputRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    stopRef.current = stopRequested;
  }, [stopRequested]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setSourceFileName(file.name.replace(/\.[^/.]+$/, ""));
        setMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateTheme = async () => {
    if (!themeText.trim()) return;
    setIsThemeLoading(true);
    try {
      const themedItems = await generateThemedExpressions(themeText);
      const newItems: ExpressionItem[] = themedItems.map((item, idx) => ({
        id: `theme-${Date.now()}-${idx}`,
        name: item.name || '未命名',
        en: item.en || '',
        checked: true
      }));
      setExpressions(newItems);
      setThemeText('');
    } catch (error) {
      alert('生成主題失敗，請重試');
    } finally {
      setIsThemeLoading(false);
    }
  };

  const addExtraExpression = () => {
    if (customText.trim()) {
      setExpressions(prev => [...prev, { 
        id: Date.now().toString(), 
        name: customText.trim(), 
        en: customText.trim(), 
        checked: true 
      }]);
      setCustomText('');
    }
  };

  const startGeneration = async () => {
    const selected = expressions.filter(e => e.checked);
    if (!sourceImage || selected.length === 0) return;

    setIsGenerating(true);
    setStopRequested(false);
    stopRef.current = false;
    setResults([]);
    setProgress(0);

    const newResults: GenerationResult[] = selected.map(e => ({
      id: e.id,
      expressionName: e.name,
      imageUrl: '',
      status: 'pending'
    }));
    setResults(newResults);

    for (let i = 0; i < selected.length; i++) {
      if (stopRef.current) break;

      const exp = selected[i];
      setResults(prev => prev.map(r => r.id === exp.id ? { ...r, status: 'processing' } : r));

      try {
        let generatedUrl = await generateExpressionImage(
          sourceImage, 
          exp.en, 
          mimeType, 
          isCuteAnime,
          isSituational,
          interactionText,
          autoText
        );
        
        if (autoRemoveBg) {
          const img = new Image();
          img.src = generatedUrl;
          await new Promise((res) => img.onload = res);
          generatedUrl = await removeBackground(img);
        }

        const finalUrl = await resizeImage(generatedUrl, 320, 320);
        
        setResults(prev => prev.map(r => 
          r.id === exp.id ? { ...r, status: 'completed', imageUrl: finalUrl } : r
        ));
      } catch (error) {
        console.error(error);
        setResults(prev => prev.map(r => 
          r.id === exp.id ? { ...r, status: 'error', error: '生成失敗' } : r
        ));
      }
      setProgress(Math.round(((i + 1) / selected.length) * 100));
    }
    setIsGenerating(false);
  };

  const handleLineScale = async () => {
    if (!lineScaleInput) return;
    const res: {main?: string, tab?: string, sticker?: string} = {};
    if (lineOptions.main) {
      res.main = await resizeImage(lineScaleInput, 240, 240, 'contain');
    }
    if (lineOptions.tab) {
      res.tab = await resizeImage(lineScaleInput, 96, 74, 'stretch');
    }
    if (lineOptions.sticker) {
      res.sticker = await resizeImage(lineScaleInput, 320, 320, 'contain');
    }
    setLineResults(res);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. 上傳區塊 */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 text-sm">1</span>
          上傳角色圖片
        </h2>
        {!sourceImage ? (
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-300 mb-4 group-hover:text-indigo-500"></i>
            <p className="text-gray-500 font-medium">請上傳角色圖片</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => setPreviewImage(sourceImage)}>
              <img src={sourceImage} alt="Source" className="w-48 h-48 object-cover rounded-xl shadow-md border-2 border-indigo-100" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                <i className="fas fa-search-plus text-white text-2xl"></i>
              </div>
            </div>
            <button onClick={() => setSourceImage(null)} className="mt-4 text-sm text-red-500 hover:text-red-700 font-medium">刪除並重新上傳</button>
          </div>
        )}
      </section>

      {/* 2. 風格設定選項 */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 text-sm">2</span>
          風格與設定
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" checked={isCuteAnime} onChange={(e) => setIsCuteAnime(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <div>
                <span className="font-bold text-gray-700 block text-sm">可愛動漫模式 (Cute Anime)</span>
                <span className="text-xs text-gray-400">強化動漫風格與眼部細節</span>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors">
              <input type="checkbox" checked={isSituational} onChange={(e) => setIsSituational(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <div>
                <span className="font-bold text-indigo-700 block text-sm">生成情境場景 (Situational)</span>
                <span className="text-xs text-indigo-500">加入環境道具與豐富肢體動作</span>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" checked={autoRemoveBg} onChange={(e) => setAutoRemoveBg(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <div>
                <span className="font-bold text-gray-700 block text-sm">生成後自動去除背景</span>
                <span className="text-xs text-gray-400">產出後自動移除綠幕背景</span>
              </div>
            </label>
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-indigo-700">深色系文字設定 (Dark Text)</span>
              <label className="flex items-center text-xs font-bold text-indigo-600 cursor-pointer">
                <input type="checkbox" checked={autoText} onChange={(e) => setAutoText(e.target.checked)} className="mr-1.5" />
                AI 自動配字
              </label>
            </div>
            <input 
              type="text" 
              value={interactionText} 
              onChange={(e) => {
                setInteractionText(e.target.value);
                if(e.target.value) setAutoText(false);
              }}
              placeholder={autoText ? "已開啟自動配字，或在此輸入..." : "自訂深色系文字內容..."} 
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            />
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">※ 系統將依據模型判斷使用深藍、深灰或黑色文字，並配合專業、輕鬆或可愛風格。</p>
          </div>
        </div>
      </section>

      {/* 3. 表情清單 */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h2 className="text-lg font-bold flex items-center text-gray-800">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 text-sm">3</span>
            表情與 AI 主題生成
          </h2>
          <div className="flex items-center space-x-2 bg-indigo-50 p-1.5 rounded-2xl border border-indigo-100 shadow-inner">
            <input 
              type="text" 
              value={themeText} 
              onChange={(e) => setThemeText(e.target.value)} 
              placeholder="主題 (如: 旅遊中)" 
              className="bg-transparent px-4 py-1.5 text-xs outline-none w-32 md:w-48"
            />
            <button 
              onClick={handleGenerateTheme} 
              disabled={isThemeLoading || !themeText.trim()}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold disabled:bg-gray-300 transition-all shadow-md active:scale-95"
            >
              {isThemeLoading ? <i className="fas fa-spinner animate-spin"></i> : 'AI 生成主題'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {expressions.map((exp) => (
            <label key={exp.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${exp.checked ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
              <input type="checkbox" checked={exp.checked} onChange={() => setExpressions(prev => prev.map(i => i.id === exp.id ? { ...i, checked: !i.checked } : i))} className="mr-2.5 w-4 h-4 text-indigo-600 rounded" />
              <span className="text-sm font-bold text-gray-700">{exp.name}</span>
            </label>
          ))}
        </div>

        <div className="flex space-x-2">
          <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExtraExpression()} placeholder="新增單個表情描述..." className="flex-1 border border-gray-200 rounded-xl px-5 py-2.5 text-sm shadow-sm" />
          <button onClick={addExtraExpression} className="bg-gray-800 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-900 shadow-md">加入</button>
          <button onClick={() => setExpressions(DEFAULT_EXPRESSIONS)} className="text-gray-400 text-xs px-2 hover:text-indigo-600 font-bold transition-colors">重置預設</button>
        </div>
      </section>

      {/* 生成控制 */}
      <div className="flex flex-col items-center pt-4">
        {!isGenerating ? (
          <button onClick={startGeneration} disabled={!sourceImage} className="w-full md:w-72 bg-indigo-600 text-white px-10 py-5 rounded-3xl text-xl font-black shadow-xl hover:bg-indigo-700 disabled:bg-gray-300 transform transition-all active:scale-95 hover:shadow-indigo-500/20">
            開始生成表情
          </button>
        ) : (
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="w-full bg-gray-200 rounded-full h-5 mb-3 overflow-hidden shadow-inner p-1">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex items-center space-x-5">
              <span className="text-sm font-black text-indigo-600 animate-pulse">正在生成：{progress}%</span>
              <button onClick={() => setStopRequested(true)} className="text-red-500 text-sm font-bold hover:underline">停止生成</button>
            </div>
          </div>
        )}
      </div>

      {/* 生成結果區 */}
      {results.length > 0 && (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-extrabold text-gray-800">生成結果 (點圖預覽)</h2>
            <button onClick={() => downloadAllImages(results.filter(r => r.imageUrl).map(r => ({ url: r.imageUrl, filename: `${sourceFileName}_${r.expressionName}.png` })))} className="bg-green-600 text-white px-6 py-2.5 rounded-2xl text-sm font-black shadow-lg hover:bg-green-700 hover:shadow-green-500/20 transition-all">
              全部下載 (ZIP)
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map((res) => (
              <div key={res.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 group hover:shadow-2xl transition-all">
                <div className="aspect-square relative flex items-center justify-center bg-white cursor-pointer" onClick={() => res.imageUrl && setPreviewImage(res.imageUrl)}>
                  {res.status === 'processing' && (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600 mb-3"></div>
                      <span className="text-xs text-indigo-400 font-black">生成中...</span>
                    </div>
                  )}
                  {res.imageUrl && (
                    <>
                      <img src={res.imageUrl} alt={res.expressionName} className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <i className="fas fa-expand text-indigo-600 text-2xl"></i>
                      </div>
                    </>
                  )}
                  {res.status === 'error' && <i className="fas fa-exclamation-circle text-red-500 text-3xl"></i>}
                </div>
                <div className="p-3 text-center text-xs font-black bg-white border-t border-gray-50 text-gray-700">{res.expressionName}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LINE 規格轉換區 */}
      <section className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <i className="fab fa-line text-4xl text-green-400"></i>
          <div>
            <h2 className="text-2xl font-black">LINE 規格轉換區</h2>
            <p className="text-indigo-200 text-sm">一鍵轉換 LINE 官方要求的各種尺寸</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex-1 space-y-6">
            <div 
              onClick={() => lineInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-700 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-800/50 transition-all group"
            >
              {lineScaleInput ? (
                <div className="relative">
                  <img src={lineScaleInput} className="w-32 h-32 object-contain rounded-2xl shadow-2xl mb-3" />
                  <div className="absolute -top-2 -right-2 bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                    <i className="fas fa-sync-alt text-sm"></i>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <i className="fas fa-cloud-upload-alt text-5xl mb-4 opacity-30 group-hover:opacity-60 transition-opacity"></i>
                  <p className="font-bold">點此上傳要轉換的貼圖</p>
                </div>
              )}
              <input type="file" ref={lineInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if(file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setLineScaleInput(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} className="hidden" accept="image/*" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center space-x-3 p-4 rounded-2xl cursor-pointer transition-all ${lineOptions.sticker ? 'bg-indigo-700/50 border border-indigo-500' : 'bg-indigo-950/30 border border-transparent hover:bg-indigo-900/50'}`}>
                <input type="checkbox" checked={lineOptions.sticker} onChange={e => setLineOptions(prev => ({...prev, sticker: e.target.checked}))} className="w-5 h-5 rounded text-green-500" />
                <div>
                  <span className="font-black text-sm block">貼圖 (320x320)</span>
                  <span className="text-[10px] text-indigo-300">標準表情尺寸</span>
                </div>
              </label>
              <label className={`flex items-center space-x-3 p-4 rounded-2xl cursor-pointer transition-all ${lineOptions.main ? 'bg-indigo-700/50 border border-indigo-500' : 'bg-indigo-950/30 border border-transparent hover:bg-indigo-900/50'}`}>
                <input type="checkbox" checked={lineOptions.main} onChange={e => setLineOptions(prev => ({...prev, main: e.target.checked}))} className="w-5 h-5 rounded text-green-500" />
                <div>
                  <span className="font-black text-sm block">Main (240x240)</span>
                  <span className="text-[10px] text-indigo-300">商店主圖</span>
                </div>
              </label>
              <label className={`flex items-center space-x-3 p-4 rounded-2xl cursor-pointer transition-all ${lineOptions.tab ? 'bg-indigo-700/50 border border-indigo-500' : 'bg-indigo-950/30 border border-transparent hover:bg-indigo-900/50'}`}>
                <input type="checkbox" checked={lineOptions.tab} onChange={e => setLineOptions(prev => ({...prev, tab: e.target.checked}))} className="w-5 h-5 rounded text-green-500" />
                <div>
                  <span className="font-black text-sm block">Tab (96x74)</span>
                  <span className="text-[10px] text-indigo-300">對話框分頁圖示</span>
                </div>
              </label>
            </div>

            <button onClick={handleLineScale} disabled={!lineScaleInput} className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-[1.25rem] text-lg font-black shadow-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-green-500/30">
              立即縮放規格
            </button>
          </div>

          <div className="flex-1 bg-black/30 rounded-[2rem] p-6 flex flex-col items-center justify-center min-h-[300px] border border-white/5">
            {Object.keys(lineResults).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
                {lineResults.sticker && (
                  <div className="text-center group">
                    <div className="relative mx-auto w-24 h-24 bg-white rounded-2xl p-2 mb-3 shadow-2xl overflow-hidden">
                      <img src={lineResults.sticker} className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] font-bold mb-1.5 opacity-60">貼圖 (320)</p>
                    <a href={lineResults.sticker} download="sticker_320.png" className="text-xs text-green-400 font-black underline decoration-2 hover:text-white transition-colors">下載</a>
                  </div>
                )}
                {lineResults.main && (
                  <div className="text-center">
                    <div className="relative mx-auto w-20 h-20 bg-white rounded-2xl p-2 mb-3 shadow-2xl">
                      <img src={lineResults.main} className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] font-bold mb-1.5 opacity-60">Main (240)</p>
                    <a href={lineResults.main} download="sticker_main.png" className="text-xs text-green-400 font-black underline decoration-2 hover:text-white transition-colors">下載</a>
                  </div>
                )}
                {lineResults.tab && (
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-12 bg-white rounded-xl p-1 mb-3 shadow-2xl overflow-hidden">
                      <img src={lineResults.tab} className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] font-bold mb-1.5 opacity-60">Tab (96x74)</p>
                    <a href={lineResults.tab} download="sticker_tab.png" className="text-xs text-green-400 font-black underline decoration-2 hover:text-white transition-colors">下載</a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3 opacity-30">
                <i className="fas fa-layer-group text-4xl"></i>
                <p className="text-sm font-bold italic">規格預覽區</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 動態預覽 Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-[2.5rem] p-3 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-auto rounded-[2rem]" />
            <div className="absolute top-6 right-6 flex space-x-3">
              <a href={previewImage} download="ai_sticker_preview.png" className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95">
                <i className="fas fa-download"></i>
              </a>
              <button onClick={() => setPreviewImage(null)} className="w-12 h-12 bg-white/90 text-gray-800 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">High Definition Preview | 320 x 320 px</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorTab;
