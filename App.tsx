
import React, { useState } from 'react';
import GeneratorTab from './components/GeneratorTab';
import RemoverTab from './components/RemoverTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generator' | 'remover'>('generator');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <i className="fas fa-robot"></i>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              AI表情貼圖神器
            </h1>
          </div>
          
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-magic mr-2"></i>貼圖生成器
            </button>
            <button
              onClick={() => setActiveTab('remover')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'remover'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="fas fa-eraser mr-2"></i>去背工具
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {activeTab === 'generator' ? <GeneratorTab /> : <RemoverTab />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-400 text-sm font-medium">
          &copy; 2024 AI表情貼圖神器 - Powered by Gemini 2.5 Flash Image
        </div>
      </footer>
    </div>
  );
};

export default App;
