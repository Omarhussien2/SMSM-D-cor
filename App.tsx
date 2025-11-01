/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { generateMockup } from './services/geminiService';
import { Product } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ObjectCard from './components/ObjectCard';
import Spinner from './components/Spinner';

// --- Data for new dynamic scene generation ---

const placementOptions = [
  { id: 'hanging', name: 'Hanging on Wall', nameAr: 'معلق على حائط', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="12" x="3" y="6" rx="2"></rect><path d="M12 3v3m0 12v3"></path></svg> },
  { id: 'leaning', name: 'Leaning on Surface', nameAr: 'مستند على سطح', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20.2 17.8-5.3 1.6-4-10-5.4 1.6"></path><path d="m4 22 5.3-1.6"></path><path d="M16 3 4.2 8.3"></path><path d="M22 22H2"></path></svg> },
  { id: 'hand-held', name: 'Held in Hand', nameAr: 'ممسوك باليد', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 12h2a2 2 0 1 0 0-4h-3c-1.1 0-2 .9-2 2v1a2 2 0 1 0 4 0v-1"></path><path d="M12 12v2.5a2.5 2.5 0 0 1-5 0V12"></path><path d="M14 12v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3"></path></svg> },
  { id: 'on-desk', name: 'On a Desk/Table', nameAr: 'على مكتب/طاولة', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="12" x="3" y="7" rx="2"></rect><path d="M21 19H3"></path><path d="M12 19v-4"></path></svg> },
  { id: 'custom', name: 'Custom Scene', nameAr: 'مشهد مخصص', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9.09 9.91 5.83 5.83"></path><path d="m14.91 9.91-5.83 5.83"></path></svg> }
];

const locationOptions: { [key: string]: { id: string; name: string; nameAr: string }[] } = {
  hanging: [
    { id: 'living-room', name: 'Living Room', nameAr: 'غرفة معيشة' },
    { id: 'bedroom', name: 'Bedroom', nameAr: 'غرفة نوم' },
    { id: 'office', name: 'Office', nameAr: 'مكتب' },
    { id: 'gallery', name: 'Art Gallery', nameAr: 'معرض فني' },
  ],
  leaning: [
    { id: 'mantelpiece', name: 'Mantelpiece', nameAr: 'رف مدفأة' },
    { id: 'bookshelf', name: 'Bookshelf', nameAr: 'رف كتب' },
    { id: 'floor', name: 'Against a Wall', nameAr: 'بجانب حائط' },
    { id: 'garden', name: 'Garden', nameAr: 'حديقة' },
  ],
  'hand-held': [ 
    { id: 'indoor', name: 'Modern Interior', nameAr: 'خلفية داخلية عصرية' },
    { id: 'outdoor', name: 'Nature Background', nameAr: 'خلفية طبيعية' },
    { id: 'studio', name: 'Studio', nameAr: 'خلفية استوديو بسيطة' },
  ],
  'on-desk': [
    { id: 'office-desk', name: 'Office Desk', nameAr: 'مكتب عمل' },
    { id: 'coffee-table', name: 'Coffee Table', nameAr: 'طاولة قهوة' },
    { id: 'cafe', name: 'Cafe', nameAr: 'مقهى' },
  ],
};

// --- Reusable UI Component for Selections ---

const SelectionCard: React.FC<{
  text: string;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ text, isSelected, onClick, children }) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-lg border-2 text-center transition-all duration-200 flex flex-col items-center justify-center aspect-square
      ${isSelected 
        ? 'bg-blue-100 border-blue-500 shadow-lg scale-105' 
        : 'bg-white border-zinc-200 hover:border-blue-300 hover:shadow-md'
      }`}
    aria-pressed={isSelected}
  >
    <div className="text-blue-600 mb-2">{children}</div>
    <span className="font-semibold text-zinc-800 text-sm md:text-base">{text}</span>
  </button>
);


const App: React.FC = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productWidth, setProductWidth] = useState<string>('');
  const [productHeight, setProductHeight] = useState<string>('');
  
  // New state for dynamic generation
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('[[ضع هنا وصفك الإبداعي للمشهد الذي تريده باللغة العربية]]');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleProductImageUpload = useCallback((file: File) => {
    setError(null);
    try {
      const imageUrl = URL.createObjectURL(file);
      const newProduct: Product = {
        id: Date.now(),
        name: file.name,
        imageUrl: imageUrl,
      };
      setProductImageFile(file);
      setProduct(newProduct);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Could not load the product image. Details: ${errorMessage}`);
      console.error(err);
    }
  }, []);
  
  const handlePlacementSelect = (placementId: string) => {
    setSelectedPlacement(placementId);
    setSelectedLocation(null); // Reset location when placement changes
  };

  const handleGenerate = async () => {
    if (!productImageFile) {
      setError('Please upload a product image first.');
      return;
    }
    if (!productWidth || !productHeight || +productWidth <= 0 || +productHeight <= 0) {
      setError('Please enter valid dimensions (width and height) for your product.');
      return;
    }

    let basePrompt = '';
    if (selectedPlacement === 'custom') {
      if (!customPrompt || customPrompt === '[[ضع هنا وصفك الإبداعي للمشهد الذي تريده باللغة العربية]]') {
        setError('Please enter your custom scene description.');
        return;
      }
      basePrompt = customPrompt;
    } else if (selectedPlacement && selectedLocation) {
        const placementText = placementOptions.find(p => p.id === selectedPlacement)?.nameAr;
        const locationText = locationOptions[selectedPlacement]?.find(l => l.id === selectedLocation)?.nameAr;
        basePrompt = `التابلوه ${placementText} في ${locationText}.`;
    } else {
      setError('Please select a placement style and a location for your mockup.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    const results: string[] = [];
    const totalScenes = 4;

    try {
      for (let i = 0; i < totalScenes; i++) {
        setLoadingMessage(`Generating Mockup ${i + 1} of ${totalScenes}...`);
        
        let finalPrompt = basePrompt;
        // Add randomization for non-custom prompts to ensure variety
        if(selectedPlacement !== 'custom') {
            const styles = ['عصري وأنيق', 'بسيط ومشرق', 'فاخر', 'دافئ ومريح', 'بألوان محايدة'];
            const lighting = ['إضاءة طبيعية ناعمة', 'إضاءة استوديو احترافية', 'ضوء شمس دافئ'];
            const angles = ['تصوير بزاوية أمامية', 'تصوير بزاوية جانبية قليلاً', 'لقطة مقربة', 'لقطة واسعة تظهر البيئة المحيطة'];
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            const randomLighting = lighting[Math.floor(Math.random() * lighting.length)];
            const randomAngle = angles[Math.floor(Math.random() * angles.length)];
            finalPrompt += ` المشهد يجب أن يكون ${randomStyle} مع ${randomLighting}. ${randomAngle}. يجب أن تكون الصورة واقعية واحترافية للغاية.`;
        }
        
        const imageUrl = await generateMockup(productImageFile, finalPrompt, +productWidth, +productHeight);
        results.push(imageUrl);
      }
      setGeneratedImages(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate mockups. ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleReset = useCallback(() => {
    setProduct(null);
    setProductImageFile(null);
    setProductWidth('');
    setProductHeight('');
    setGeneratedImages([]);
    setSelectedPlacement(null);
    setSelectedLocation(null);
    setCustomPrompt('[[ضع هنا وصفك الإبداعي للمشهد الذي تريده باللغة العربية]]');
    setError(null);
    setIsLoading(false);
  }, []);

  const handleChangeProduct = useCallback(() => {
    setProduct(null);
    setProductImageFile(null);
    setGeneratedImages([]);
    setProductWidth('');
    setProductHeight('');
  }, []);
  
  useEffect(() => {
    return () => {
      if (product?.imageUrl && product.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(product.imageUrl);
      }
    };
  }, [product]);

  const isGenerateButtonDisabled = !productWidth || !productHeight || !selectedPlacement || (selectedPlacement !== 'custom' && !selectedLocation) || (selectedPlacement === 'custom' && (!customPrompt || customPrompt === '[[ضع هنا وصفك الإبداعي للمشهد الذي تريده باللغة العربية]]'));
  
  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center animate-fade-in bg-red-50 border border-red-200 p-8 rounded-lg max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-4 text-red-800">An Error Occurred</h2>
          <p className="text-lg text-red-700 mb-6">{error}</p>
          <button
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Start Over
          </button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="text-center animate-fade-in flex flex-col items-center justify-center min-h-[50vh]">
          <Spinner />
          <p className="text-xl mt-4 text-zinc-600">{loadingMessage}</p>
        </div>
      );
    }

    if (generatedImages.length > 0) {
      return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in">
          <h2 className="text-3xl font-extrabold text-center mb-8 text-zinc-800">Your Mockups are Ready!</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatedImages.map((imgSrc, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden group relative">
                <img src={imgSrc} alt={`Generated Mockup ${index + 1}`} className="w-full h-full object-contain" />
                <a
                  href={imgSrc}
                  download={`mockup-${index + 1}.jpeg`}
                  className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-opacity-80 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                  aria-label="Download mockup"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={handleReset}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Create New Mockups
            </button>
          </div>
        </div>
      );
    }

    if (product) {
      return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Product Column */}
            <div className="md:col-span-1 flex flex-col items-center">
              <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">1. Your Product</h2>
              <div className="w-full max-w-xs">
                <ObjectCard product={product} isSelected={false} />
              </div>
              <div className="w-full max-w-xs mt-6">
                <h3 className="text-lg font-bold text-zinc-800 mb-3 text-center">Enter Dimensions</h3>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="productWidth" className="block text-sm font-medium text-zinc-600 mb-1" dir='rtl'>العرض (سم)</label>
                        <input
                            type="number"
                            id="productWidth"
                            value={productWidth}
                            onChange={(e) => setProductWidth(e.target.value)}
                            placeholder="e.g., 20"
                            className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            aria-label="Product width in centimeters"
                        />
                    </div>
                    <div>
                        <label htmlFor="productHeight" className="block text-sm font-medium text-zinc-600 mb-1" dir='rtl'>الارتفاع (سم)</label>
                        <input
                            type="number"
                            id="productHeight"
                            value={productHeight}
                            onChange={(e) => setProductHeight(e.target.value)}
                            placeholder="e.g., 40"
                            className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            aria-label="Product height in centimeters"
                        />
                    </div>
                </div>
              </div>
              <button
                onClick={handleChangeProduct}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold mt-4"
              >
                Change Product
              </button>
            </div>

            {/* Scenes Column */}
            <div className="md:col-span-3">
              <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">2. Configure Scene</h2>
              <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-800 mb-4" dir="rtl">أولاً: اختر أسلوب العرض</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {placementOptions.map(opt => (
                        <SelectionCard 
                          key={opt.id}
                          text={opt.nameAr}
                          isSelected={selectedPlacement === opt.id}
                          onClick={() => handlePlacementSelect(opt.id)}
                        >
                          {opt.icon}
                        </SelectionCard>
                      ))}
                    </div>
                  </div>

                  {selectedPlacement && selectedPlacement !== 'custom' && (
                     <div className="animate-fade-in">
                        <h3 className="text-xl font-bold text-zinc-800 mb-4" dir="rtl">ثانياً: اختر المكان</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {locationOptions[selectedPlacement]?.map(opt => (
                            <SelectionCard 
                              key={opt.id}
                              text={opt.nameAr}
                              isSelected={selectedLocation === opt.id}
                              onClick={() => setSelectedLocation(opt.id)}
                            >
                                <span className="text-2xl">🖼️</span>
                            </SelectionCard>
                          ))}
                        </div>
                     </div>
                  )}

                  {selectedPlacement === 'custom' && (
                    <div className="animate-fade-in">
                        <h3 className="text-xl font-bold text-zinc-800 mb-4" dir="rtl">ثانياً: اكتب وصف المشهد</h3>
                        <textarea
                            className="w-full text-md bg-zinc-50 border border-zinc-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            rows={4}
                            aria-label="Custom scene prompt"
                            dir="rtl"
                        />
                    </div>
                  )}
              </div>
            </div>
          </div>
          <div className="text-center mt-12">
            <button
              onClick={handleGenerate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-lg text-xl transition-colors shadow-lg disabled:bg-zinc-400 disabled:cursor-not-allowed"
              disabled={isGenerateButtonDisabled}
            >
              Generate 4 Mockups
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in flex flex-col items-center">
        <h2 className="text-2xl font-extrabold text-center mb-5 text-zinc-800">Upload Your Wall Art</h2>
        <ImageUploader
          id="product-uploader"
          onFileSelect={handleProductImageUpload}
          imageUrl={null}
        />
        <p className="text-zinc-500 mt-4">
          Begin by uploading a clear image of your product.
        </p>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col items-center p-4 md:p-8">
      <Header />
      <main className="w-full mt-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
