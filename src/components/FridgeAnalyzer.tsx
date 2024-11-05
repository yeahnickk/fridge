import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  FiCamera, 
  FiX, 
  FiChevronRight,
  FiClock,
  FiList,
  FiHome,
  FiSettings,
  FiUser,
  FiToggleLeft,
  FiInfo,
  FiMoon,
  FiGlobe,
  FiBell,
  FiFilter,
  FiLoader,
  FiArrowLeft,
  FiCheck,
  FiBookmark
} from 'react-icons/fi';
import CameraCapture from './CameraCapture';
import OpenAI from 'openai';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
  dietaryLabels?: string[];
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

interface DietaryPreference {
  id: string;
  label: string;
  description: string;
}

const dietaryOptions: DietaryPreference[] = [
  { id: 'vegetarian', label: 'Vegetarian', description: 'No meat or fish' },
  { id: 'vegan', label: 'Vegan', description: 'No animal products' },
  { id: 'glutenFree', label: 'Gluten Free', description: 'No gluten-containing ingredients' },
  { id: 'dairyFree', label: 'Dairy Free', description: 'No dairy products' },
  { id: 'nutFree', label: 'Nut Free', description: 'No nuts or nut products' },
  { id: 'lowCarb', label: 'Low Carb', description: 'Reduced carbohydrates' },
];

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
  const [currentView, setCurrentView] = useState<'home' | 'scan' | 'history' | 'settings' | 'saved' | 'preferences'>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const savedHistory = localStorage.getItem('scanHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(() => {
    const saved = localStorage.getItem('dietaryPreferences');
    return saved ? JSON.parse(saved) : [];
  });

  const analyzeImage = async (base64Image: string) => {
    setShowCamera(false);
    setLoading(true);

    try {
      // Create dietary restrictions string
      const dietaryString = dietaryPreferences.length > 0
        ? `IMPORTANT DIETARY REQUIREMENTS: The first 3 recipes must be suitable for: ${
            dietaryPreferences.map(id => 
              dietaryOptions.find(opt => opt.id === id)?.label
            ).join(', ')
          }. \n`
        : '';

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for ingredients that could be used in recipes, include all ingredients found irregardless of dietery restrictions. Usually the photo will be of a fridge and you are an expert image analyzer who will look at the entire image and detail all of the ingredients found. From those ingredients, suggest up to 5 possible recipes using STRICTLY only those ingredients found in the image. You are also a professional chef and undertstand flavour profiles so all of the recipes you suggest should be tasteful.Lastly, you MUST respond in EXACTLY this format:\n\n" +
                     dietaryString +
                     "FOUND_INGREDIENTS:\n" +
                     "- ingredient1\n" +
                     "- ingredient2\n\n" +
                     "RECIPES_START\n" +
                     "RECIPE_1\n" +
                     "NAME: Recipe Name\n" +
                     "TIME: X minutes\n" +
                     "DIETARY: Vegetarian, Gluten Free (list ALL applicable dietary labels from user preferences)\n" +
                     "INGREDIENTS:\n" +
                     "- ingredient1\n" +
                     "- ingredient2\n\n" +
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
        const dietary = block.match(/DIETARY:\s*(.*)\n/)?.[1]?.trim().split(',').map(d => d.trim()) || [];
        
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
          instructions,
          dietaryLabels: dietary
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

  const handleNavigate = (view: 'home' | 'scan' | 'history' | 'settings' | 'saved' | 'preferences') => {
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
        instructions: recipe.instructions,
        dietaryLabels: recipe.dietaryLabels
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
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 
                          flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full mx-4
                              border border-gray-100">
              <div className="space-y-6 text-center">
                {/* Animated Icons */}
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 animate-spin">
                    <div className="h-full w-full rounded-full border-4 
                                  border-blue-500 border-t-transparent"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">🔍</span>
                  </div>
                </div>

                {/* Loading Messages */}
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Analyzing Your Ingredients
                  </h3>
                  <div className="flex flex-col items-center gap-1">
                    <LoadingMessage />
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="space-y-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-2/3 
                                  animate-[loading_1.5s_ease-in-out_infinite]"></div>
                  </div>
                  <p className="text-sm text-gray-500">This may take a moment</p>
                </div>
              </div>
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
                    <button
                      key={index}
                      onClick={() => {
                        console.log('Setting selected recipe:', recipe);
                        setSelectedRecipe(recipe);
                      }}
                      className="w-full bg-white rounded-2xl p-6 text-left 
                                 hover:bg-gray-50 hover:shadow-lg transform 
                                 hover:-translate-y-0.5 transition-all duration-200 
                                 ease-in-out border border-gray-100"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {recipe.title}
                            </h3>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <FiClock className="text-blue-500" />
                              {recipe.cookTime}
                            </span>
                          </div>
                        </div>

                        {/* Dietary Labels - Updated with filter */}
                        {recipe.dietaryLabels && recipe.dietaryLabels.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {recipe.dietaryLabels
                              .filter(label => label.toLowerCase() !== 'non specific')
                              .map((label, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-green-50 text-green-700 
                                           rounded-full text-xs font-medium"
                                >
                                  {label}
                                </span>
                            ))}
                          </div>
                        )}

                        {/* Ingredients Preview */}
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 
                                       rounded-full text-sm font-medium"
                            >
                              {ingredient}
                            </span>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <span className="text-sm text-gray-500">
                              +{recipe.ingredients.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
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

        {currentView === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl">
              {/* User Profile Section */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiUser className="text-2xl text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Guest User</h2>
                    <p className="text-sm text-gray-500">Sign in to sync your recipes</p>
                  </div>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="divide-y divide-gray-100">
                {/* App Preferences */}
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">APP PREFERENCES</h3>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <FiMoon className="text-blue-600" />
                        </div>
                        <span className="text-gray-700">Dark Mode</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="checkbox"
                          checked={darkMode}
                          onChange={(e) => {
                            setDarkMode(e.target.checked);
                            localStorage.setItem('darkMode', JSON.stringify(e.target.checked));
                          }}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${
                          darkMode ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                            darkMode ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </button>

                    <button className="w-full flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <FiBell className="text-blue-600" />
                        </div>
                        <span className="text-gray-700">Notifications</span>
                      </div>
                      <FiChevronRight className="text-gray-400" />
                    </button>

                    <button className="w-full flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <FiGlobe className="text-blue-600" />
                        </div>
                        <span className="text-gray-700">Language</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">English</span>
                        <FiChevronRight className="text-gray-400" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">PREFERENCES</h3>
                  <button
                    onClick={() => setCurrentView('preferences')}
                    className="w-full flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                        <FiFilter className="text-blue-600" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-gray-700">Dietary Preferences</span>
                        <span className="text-sm text-gray-500">
                          {dietaryPreferences.length 
                            ? `${dietaryPreferences.length} selected` 
                            : 'None selected'}
                        </span>
                      </div>
                    </div>
                    <FiChevronRight className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 z-50">
        <div className="w-full mx-auto flex items-center relative h-20">
          {/* Left Side Nav */}
          <div className="flex flex-1 justify-evenly">
            <button 
              onClick={() => {
                setCurrentView('home');
                setAnalysis(null);
                setShowCamera(false);
              }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className={`p-2 rounded-full ${
                currentView === 'home' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                <FiHome className="text-2xl" />
              </div>
              <span className="text-xs font-medium">Home</span>
            </button>

            <button 
              onClick={() => {
                setCurrentView('saved');
                setAnalysis(null);
                setShowCamera(false);
              }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className={`p-2 rounded-full ${
                currentView === 'saved' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                <FiBookmark className="text-2xl" />
              </div>
              <span className="text-xs font-medium">Saved</span>
            </button>
          </div>

          {/* Floating Scan Button - Updated size and positioning */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={() => {
                if (!loading) {
                  setAnalysis(null);
                  setShowCamera(true);
                  setCurrentView('scan');
                }
              }}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 
                         flex items-center justify-center shadow-lg 
                         hover:shadow-xl transition-all duration-200 
                         hover:-translate-y-0.5 active:translate-y-0
                         border-4 border-white"
            >
              <FiCamera className="text-4xl text-white" />
            </button>
          </div>

          {/* Right Side Nav */}
          <div className="flex flex-1 justify-evenly">
            <button 
              onClick={() => {
                setCurrentView('history');
                setAnalysis(null);
                setShowCamera(false);
              }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className={`p-2 rounded-full ${
                currentView === 'history' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                <FiList className="text-2xl" />
              </div>
              <span className="text-xs font-medium">History</span>
            </button>

            <button 
              onClick={() => {
                setCurrentView('settings');
                setAnalysis(null);
                setShowCamera(false);
              }}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className={`p-2 rounded-full ${
                currentView === 'settings' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                <FiSettings className="text-2xl" />
              </div>
              <span className="text-xs font-medium">Settings</span>
            </button>
          </div>
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

      {/* Preferences View */}
      {currentView === 'preferences' && (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 border-b border-gray-100">
            <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentView('settings')}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiArrowLeft className="text-xl text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-blue-600">
                Dietary Preferences
              </h1>
              <div className="w-10" />
            </div>
          </div>

          {/* Content - Adjusted top padding */}
          <div className="pt-0 pb-24 px-4 max-w-lg mx-auto space-y-4">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <FiFilter className="text-xl text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">
                    Select your dietary preferences
                  </p>
                  <p className="text-sm text-gray-500">
                    Your selections will help us prioritize suitable recipes when analyzing your ingredients.
                  </p>
                </div>
              </div>
            </div>

            {/* Preferences Grid */}
            <div className="grid gap-4">
              {dietaryOptions.map((option) => (
                <label
                  key={option.id}
                  className="group relative bg-white rounded-2xl border border-gray-100 
                           hover:border-blue-200 transition-colors duration-200 
                           shadow-sm hover:shadow cursor-pointer overflow-hidden"
                >
                  <input
                    type="checkbox"
                    checked={dietaryPreferences.includes(option.id)}
                    onChange={(e) => {
                      const newPreferences = e.target.checked
                        ? [...dietaryPreferences, option.id]
                        : dietaryPreferences.filter(id => id !== option.id);
                      setDietaryPreferences(newPreferences);
                      localStorage.setItem('dietaryPreferences', JSON.stringify(newPreferences));
                    }}
                    className="peer sr-only"
                  />
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                    transition-colors duration-200
                                    ${dietaryPreferences.includes(option.id)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-blue-50 text-blue-500'}`}
                      >
                        <FiFilter className="text-xl" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-0.5">
                          {option.label}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                                      transition-all duration-200
                                      ${dietaryPreferences.includes(option.id)
                                        ? 'border-blue-500 bg-blue-500'
                                        : 'border-gray-300 bg-white'}`}
                    >
                      {dietaryPreferences.includes(option.id) && (
                        <FiCheck className="text-white text-sm" />
                      )}
                    </div>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 
                                transition-all duration-200
                                ${dietaryPreferences.includes(option.id)
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                  : 'bg-transparent'}`} 
                  />
                </label>
              ))}
            </div>

            {/* Selected Count */}
            {dietaryPreferences.length > 0 && (
              <div className="text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 
                              bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <FiCheck className="text-blue-500" />
                  {dietaryPreferences.length} preference{dietaryPreferences.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            )}
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

// Add this component for rotating loading messages
const LoadingMessage = () => {
  const messages = [
    "Scanning ingredients...",
    "Finding perfect recipes...",
    "Checking dietary preferences...",
    "Creating cooking instructions..."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <p className="text-gray-600 min-h-[1.5rem] transition-opacity duration-300">
      {messages[messageIndex]}
    </p>
  );
};

// Add these styles to your CSS
const loadingKeyframes = `
@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}`;

// Add to your index.css or create a new style tag
const style = document.createElement('style');
style.textContent = loadingKeyframes;
document.head.appendChild(style);

export default FridgeAnalyzer;