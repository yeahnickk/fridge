import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  FiCamera, 
  FiX, 
  FiChevronRight,
  FiClock,
  FiList,
  FiHome 
} from 'react-icons/fi';
import CameraCapture from './CameraCapture';
import OpenAI from 'openai';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
}

interface ScanResult {
  foundIngredients: string[];
  recipes: Recipe[];
}

interface HistoryItem {
  id: string;
  timestamp: number;
  foundIngredients: string[];
  recipes: Recipe[];
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const FridgeAnalyzer: React.FC = () => {
  useEffect(() => {
    console.log('Component mounted');
    console.log('OpenAI Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY);
  }, []);

  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ScanResult | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'scan' | 'history'>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const savedHistory = localStorage.getItem('scanHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  const analyzeImage = async (base64Image: string) => {
    setShowCamera(false);
    setLoading(true);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for ingredients that could be used in recipes. Usually the photo will be of a fridge and you are an expert image analyzer who will look at the entire image and detail all of the ingredients found. From those ingredients, suggest up to 5 possible recipes using only those ingredientsand respond in EXACTLY this format:\n\n" +
                     "FOUND_INGREDIENTS:\n" +
                     "- ingredient1\n" +
                     "- ingredient2\n\n" +
                     "RECIPES_START\n" +
                     "RECIPE_1\n" +
                     "NAME: Recipe Name\n" +
                     "TIME: X minutes\n" +
                     "INGREDIENTS:\n" +
                     "- ingredient1\n" +
                     "- ingredient2\n" +
                     "INSTRUCTIONS:\n" +
                     "- First step\n" +
                     "- Second step\n" +
                     "- Continue with all necessary steps in logical order\n" +
                     "- Include preparation, cooking temperatures, and timing\n" +
                     "- Add as many steps as needed to complete the recipe properly\n" +
                     "RECIPE_END\n\n" +
                     "RECIPE_2\n" +
                     "... (same format)\n" +
                     "RECIPE_3\n" +
                     "... (same format)\n" +
                     "RECIPE_4\n" +
                     "... (same format)\n" +
                     "RECIPE_5\n" +
                     "... (same format)\n" +
                     "RECIPES_END"
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('Raw GPT response:', content);

      const result: ScanResult = {
        foundIngredients: [],
        recipes: []
      };

      // Parse found ingredients
      const foundIngredients = content
        .split('FOUND_INGREDIENTS:')[1]
        ?.split('RECIPES_START')[0]
        ?.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace('-', '').trim()) || [];

      result.foundIngredients = foundIngredients;

      // Parse recipes
      const recipesSection = content.split('RECIPES_START')[1]?.split('RECIPES_END')[0];
      const recipeBlocks = recipesSection?.split(/RECIPE_\d+\n/).filter(Boolean) || [];

      result.recipes = recipeBlocks.map(block => {
        const name = block.match(/NAME:\s*(.*)\n/)?.[1]?.trim();
        const time = block.match(/TIME:\s*(.*)\n/)?.[1]?.trim();
        
        const ingredients = block
          .split('INGREDIENTS:')[1]
          ?.split('INSTRUCTIONS:')[0]
          ?.split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace('-', '').trim()) || [];

        const instructions = block
          .split('INSTRUCTIONS:')[1]
          ?.split('RECIPE_END')[0]
          ?.split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace('-', '').trim())
          .filter(Boolean) || [];

        return {
          title: name || '',
          cookTime: time || '',
          ingredients,
          instructions
        };
      }).filter(recipe => recipe.title);

      console.log('Parsed result:', result);
      setAnalysis(result);
      saveToHistory(result);

    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis(null);
    } finally {
      setLoading(false);
      setShowCamera(false);
    }
  };

  const handleNavigate = (view: 'home' | 'scan' | 'history') => {
    setCurrentView(view);
    if (view === 'scan') {
      setShowCamera(true);
    }
  };

  const saveToHistory = (scanResult: ScanResult) => {
    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      foundIngredients: scanResult.foundIngredients,
      recipes: scanResult.recipes.map(recipe => ({
        title: recipe.title,
        cookTime: recipe.cookTime,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions
      }))
    };
    
    const updatedHistory = [newHistoryItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('scanHistory', JSON.stringify(updatedHistory));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FridgeAI
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-24 px-4">
        {currentView === 'home' && !showCamera && !loading && !analysis && (
          <div className="space-y-10">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-6">
              <h2 className="text-4xl font-bold">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FridgeAI
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-md mx-auto">
                Transform your ingredients into amazing recipes with the power of AI
              </p>
            </div>

            {/* Main Scan Button - Made More Prominent */}
            <button
              onClick={() => handleNavigate('scan')}
              className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500 text-white 
                         rounded-3xl p-8 flex items-center justify-center space-x-4 shadow-xl 
                         shadow-blue-500/20 hover:shadow-blue-500/30 transform hover:-translate-y-1 
                         active:scale-95 transition-all duration-200"
            >
              <div className="bg-white/20 rounded-xl p-3">
                <FiCamera className="text-3xl" />
              </div>
              <span className="text-xl font-medium">Scan Your Fridge</span>
            </button>

            {/* AI Notice - More Modern Design */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 space-y-4 border border-blue-100/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-500/10 p-3 rounded-2xl">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Learning in Progress
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Our AI is continuously learning to better identify ingredients. For optimal results:
              </p>
              <ul className="space-y-3">
                {[
                  'Ensure ingredients are clearly visible',
                  'Remove items from packaging when possible',
                  'Use good lighting for better detection',
                  'Arrange items with space between them'
                ].map((tip, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium">{index + 1}</span>
                    </div>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Features Grid - More Visual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: '🔍',
                  title: 'Smart Detection',
                  desc: 'Advanced AI identifies ingredients accurately'
                },
                {
                  icon: '👩‍🍳',
                  title: 'Recipe Generation',
                  desc: 'Get multiple recipe suggestions instantly'
                },
                {
                  icon: '📝',
                  title: 'Detailed Instructions',
                  desc: 'Step-by-step cooking guidance'
                },
                {
                  icon: '📱',
                  title: 'Easy to Use',
                  desc: 'Simple interface for quick results'
                }
              ].map((feature, index) => (
                <div key={index} 
                     className="bg-white/60 backdrop-blur-lg rounded-3xl p-6 
                                border border-gray-100 shadow-sm hover:shadow-md 
                                transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 
                                  p-3 rounded-2xl border border-blue-100/50">
                      <span className="text-2xl">{feature.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* How It Works - More Visual */}
            <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-2 rounded-xl">
                  <span className="text-xl">📸</span>
                </div>
                How It Works
              </h3>
              <div className="space-y-6">
                {[
                  'Open your fridge and arrange ingredients visibly',
                  'Take a clear photo in good lighting',
                  'Get personalized recipe suggestions instantly'
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 
                                  flex items-center justify-center text-white font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCamera && (
          <CameraCapture 
            onCapture={analyzeImage} 
            setShowCamera={(show: boolean) => {
              setShowCamera(show);
              if (!show) {
                setCurrentView('home');
              }
            }}
          />
        )}

        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-600 font-medium">Analyzing your fridge...</p>
            </div>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="bg-white/80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50">
              <div className="px-4 py-6">
                <h1 className="text-2xl font-semibold text-gray-900">Scan Results</h1>
              </div>
            </div>

            <div className="pt-20 space-y-6">
              {/* Found Ingredients Module */}
              {analysis.foundIngredients && analysis.foundIngredients.length > 0 && (
                <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Found Ingredients
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {analysis.foundIngredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipe Cards */}
              {analysis.recipes && analysis.recipes.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 px-1">
                    Possible Recipes ({analysis.recipes.length})
                  </h2>
                  {analysis.recipes.map((recipe, index) => (
                    <div key={index}>
                      <button
                        onClick={() => {
                          console.log('Setting selected recipe:', recipe);
                          setSelectedRecipe(recipe);
                        }}
                        className="w-full bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-sm 
                                 hover:shadow-md transition-shadow text-left"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {recipe.title}
                          </h3>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {recipe.cookTime}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Required Ingredients
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {recipe.ingredients.map((ingredient, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-sm"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recipe Instructions Modal */}
            {selectedRecipe && console.log('Modal should render with:', selectedRecipe)}
            {selectedRecipe && (
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
                onClick={() => setSelectedRecipe(null)}
              >
                <div 
                  className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6 space-y-6">
                    {console.log('Rendering modal content')}
                    {/* Modal Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {selectedRecipe.title}
                        </h2>
                        <span className="text-sm text-gray-500">
                          {selectedRecipe.cookTime}
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelectedRecipe(null)}
                        className="p-2 hover:bg-gray-100 rounded-full"
                      >
                        <FiX className="text-xl text-gray-600" />
                      </button>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-gray-800">Required Ingredients</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedRecipe.ingredients?.map((ingredient, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Instructions Section - Updated */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-gray-800">Cooking Instructions</h3>
                      <ol className="space-y-4">
                        {console.log('Rendering instructions:', selectedRecipe.instructions)}
                        {selectedRecipe.instructions && selectedRecipe.instructions.map((instruction, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 
                                           rounded-full flex items-center justify-center font-medium text-sm">
                              {index + 1}
                            </span>
                            <span className="text-gray-600 flex-1">{instruction.toString()}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'history' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan History</h2>
            
            {history.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 text-center text-gray-500">
                No scans yet. Try scanning your fridge!
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-sm space-y-4"
                >
                  {/* Date and Ingredients Count */}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {new Date(item.timestamp).toLocaleDateString()} at {' '}
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {item.foundIngredients.length} ingredients found
                    </p>
                  </div>

                  {/* Ingredients Tags */}
                  <div className="flex flex-wrap gap-2">
                    {item.foundIngredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>

                  {/* Recipe List */}
                  <div className="space-y-2">
                    {item.recipes.map((recipe, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedRecipe(recipe)}
                        className="w-full bg-white rounded-xl p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{recipe.title}</span>
                          <span className="text-sm text-gray-500">{recipe.cookTime}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200">
        <div className="max-w-md mx-auto flex justify-around py-4">
          <button 
            onClick={() => {
              setCurrentView('home');
              setShowCamera(false);
              setAnalysis(null);
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`p-2 rounded-full transition-colors ${
              currentView === 'home' ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}>
              <FiHome className={`text-xl ${
                currentView === 'home' ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            <span className={`text-xs ${
              currentView === 'home' ? 'text-blue-600' : 'text-gray-600'
            }`}>Home</span>
          </button>
          
          <button 
            onClick={() => {
              if (!loading && !analysis) {
                handleNavigate('scan');
              }
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`p-2 rounded-full transition-colors ${
              currentView === 'scan' ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}>
              <FiCamera className={`text-xl ${
                currentView === 'scan' ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            <span className={`text-xs ${
              currentView === 'scan' ? 'text-blue-600' : 'text-gray-600'
            }`}>Scan</span>
          </button>

          <button 
            onClick={() => {
              setCurrentView('history');
              setShowCamera(false);
              setAnalysis(null);
            }}
            className="flex flex-col items-center space-y-1"
          >
            <div className={`p-2 rounded-full transition-colors ${
              currentView === 'history' ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}>
              <FiClock className={`text-xl ${
                currentView === 'history' ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            <span className={`text-xs ${
              currentView === 'history' ? 'text-blue-600' : 'text-gray-600'
            }`}>History</span>
          </button>
        </div>
      </div>

      {/* Recipe Modal - Make sure this is at the root level of your component, not nested in the history section */}
      {selectedRecipe && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center"
          onClick={() => setSelectedRecipe(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {selectedRecipe.title}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {selectedRecipe.cookTime}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-800">Required Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.ingredients?.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-800">Cooking Instructions</h3>
                <ol className="space-y-4">
                  {selectedRecipe.instructions?.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 
                                     rounded-full flex items-center justify-center font-medium text-sm">
                        {index + 1}
                      </span>
                      <span className="text-gray-600 flex-1">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions to parse the markdown response
const parseIngredients = (markdown: string): string[] => {
  // Implementation to extract ingredients from markdown
  // You'll need to parse the markdown based on your response format
  return [];
};

const parseRecipes = (markdown: string): Recipe[] => {
  // Implementation to extract recipes from markdown
  // You'll need to parse the markdown based on your response format
  return [];
};

export default FridgeAnalyzer;