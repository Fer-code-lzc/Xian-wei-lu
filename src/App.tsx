import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChefHat, 
  Users, 
  BookOpen, 
  Sparkles, 
  PlusCircle, 
  Heart, 
  MessageCircle, 
  Share2, 
  Crown,
  ArrowRight,
  Utensils,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { generateRecipe, searchEncyclopedia, generateFoodImage } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface User {
  id: number;
  username: string;
}

interface Post {
  id: number;
  username: string;
  content: string;
  image_url?: string;
  created_at: string;
}

// --- Components ---

const AuthModal = ({ onClose, onAuthSuccess }: { onClose: () => void, onAuthSuccess: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-serif font-bold mb-6 text-center">
          {isLogin ? '欢迎回来' : '加入鲜味录'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border-gray-200 bg-gray-50 p-4 focus:ring-orange-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              required
              className="w-full rounded-xl border-gray-200 bg-gray-50 p-4 focus:ring-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loading ? '请稍候...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-orange-600 font-bold ml-1"
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const Navbar = ({ activeTab, setActiveTab, user, onLogout, onOpenAuth }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void,
  user: User | null,
  onLogout: () => void,
  onOpenAuth: () => void
}) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div className="hidden md:flex items-center gap-2 font-serif text-2xl font-bold text-orange-600">
        <ChefHat className="w-8 h-8" />
        <span>鲜味录</span>
      </div>
      <div className="flex gap-6 w-full md:w-auto justify-around md:justify-end items-center">
        {[
          { id: 'ai', icon: Sparkles, label: 'AI智能' },
          { id: 'kitchen', icon: Utensils, label: '我的厨房' },
          { id: 'encyclopedia', icon: BookOpen, label: '百科' },
          { id: 'community', icon: Users, label: '社区' },
          { id: 'pro', icon: Crown, label: '会员' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col md:flex-row items-center gap-1 transition-colors",
              activeTab === item.id ? "text-orange-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] md:text-sm font-medium">{item.label}</span>
          </button>
        ))}
        <div className="h-8 w-px bg-gray-100 hidden md:block mx-2" />
        {user ? (
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">你好, {user.username}</span>
            <button onClick={onLogout} className="text-xs text-gray-400 hover:text-gray-600">退出</button>
          </div>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="hidden md:flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-100 transition-colors"
          >
            登录
          </button>
        )}
      </div>
    </div>
  </nav>
);

const AIRecipe = ({ user, onOpenAuth }: { user: User | null, onOpenAuth: () => void }) => {
  const [ingredients, setIngredients] = useState('');
  const [seasonings, setSeasonings] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<string | null>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [usage, setUsage] = useState({ count: 0, limit: 3 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/usage').then(r => r.json()).then(setUsage);
  }, []);

  const handleGenerate = async () => {
    if (!ingredients) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    if (usage.count >= usage.limit) {
      alert("今日免费额度已用完，升级 Pro 解锁无限生成！");
      return;
    }

    setLoading(true);
    setSaved(false);
    try {
      const [text, img] = await Promise.all([
        generateRecipe(ingredients, seasonings, method),
        generateFoodImage(ingredients, imageSize)
      ]);
      setRecipe(text || "生成失败，请重试");
      setRecipeImage(img);
      
      // Log usage
      await fetch('/api/usage/log', { method: 'POST' });
      const newUsage = await fetch('/api/usage').then(r => r.json());
      setUsage(newUsage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!recipe || !user) return;
    try {
      const title = recipe.split('\n')[0].replace('#', '').trim() || '未命名食谱';
      await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: recipe, image_url: recipeImage })
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-orange-50">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Sparkles className="text-orange-500" /> AI 灵感厨师
          </h2>
          <div className="bg-orange-50 px-3 py-1 rounded-full text-[10px] font-bold text-orange-600">
            今日剩余: {usage.limit - usage.count} 次
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">现有食材</label>
            <textarea
              placeholder="例如：鸡蛋、番茄、牛肉..."
              className="w-full rounded-xl border-gray-200 bg-gray-50 p-4 focus:ring-orange-500 focus:border-orange-500"
              rows={2}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调味料 (可选)</label>
              <input
                type="text"
                placeholder="盐、生抽、蚝油..."
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-4"
                value={seasonings}
                onChange={(e) => setSeasonings(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">偏好做法 (可选)</label>
              <input
                type="text"
                placeholder="清蒸、红烧、空气炸锅..."
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-4"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">图片质量:</label>
            <select 
              value={imageSize} 
              onChange={(e) => setImageSize(e.target.value as any)}
              className="rounded-lg border-gray-200 bg-gray-50 text-sm"
            >
              <option value="1K">1K (标准)</option>
              <option value="2K">2K (高清)</option>
              <option value="4K">4K (超清)</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !ingredients}
            className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ChefHat />}
            {loading ? '正在研发秘籍...' : '开始生成食谱'}
          </button>
        </div>
      </div>

      {recipe && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl overflow-hidden shadow-lg border border-orange-100"
        >
          {recipeImage && (
            <div className="relative h-64 w-full">
              <img 
                src={recipeImage} 
                alt="Recipe" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 recipe-card-gradient" />
            </div>
          )}
          <div className="p-8">
            <div className="flex justify-end mb-4">
              <button 
                onClick={handleSave}
                disabled={saved}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
                  saved ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                )}
              >
                <Heart className={cn("w-4 h-4", saved && "fill-current")} />
                {saved ? '已存入厨房' : '存入我的厨房'}
              </button>
            </div>
            <div className="prose prose-orange max-w-none">
              <Markdown>{recipe}</Markdown>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const MyKitchen = ({ user, onOpenAuth }: { user: User | null, onOpenAuth: () => void }) => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      fetch('/api/saved-recipes').then(r => r.json()).then(data => {
        setRecipes(data);
        setLoading(false);
      });
    } else {
      onOpenAuth();
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif font-bold">我的厨房</h2>
      
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">厨房空空的，快去让 AI 帮你研发新菜谱吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map((r) => (
            <motion.div 
              key={r.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedRecipe(r)}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
            >
              {r.image_url && <img src={r.image_url} className="h-48 w-full object-cover" referrerPolicy="no-referrer" />}
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">{r.title}</h3>
                <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-y-auto relative"
            >
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg z-10"
              >
                <X className="w-6 h-6" />
              </button>
              {selectedRecipe.image_url && <img src={selectedRecipe.image_url} className="w-full h-64 object-cover" referrerPolicy="no-referrer" />}
              <div className="p-8 prose prose-orange max-w-none">
                <Markdown>{selectedRecipe.content}</Markdown>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Encyclopedia = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await searchEncyclopedia(query);
      setResult(res || "未找到相关内容");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="text"
          placeholder="搜索全球食谱、食材知识、烹饪技巧..."
          className="w-full rounded-2xl border-none bg-white p-6 pr-16 shadow-sm text-lg focus:ring-2 focus:ring-orange-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          onClick={handleSearch}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
          >
            <div className="prose prose-orange max-w-none">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {['红烧肉', '法式蜗牛', '如何挑选牛排', '面粉种类', '空气炸锅技巧', '川菜精髓'].map((tag) => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); }}
                className="p-4 bg-white rounded-2xl border border-gray-100 text-gray-600 hover:border-orange-200 hover:text-orange-600 transition-all text-sm font-medium"
              >
                {tag}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Community = ({ user, onOpenAuth }: { user: User | null, onOpenAuth: () => void }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);

  const handlePost = async () => {
    if (!newContent) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
      const updated = await fetch('/api/posts').then(r => r.json());
      setPosts(updated);
      setNewContent('');
      setShowAdd(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold">食客社区</h2>
        <button 
          onClick={() => user ? setShowAdd(true) : onOpenAuth()}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-full font-medium hover:bg-orange-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5" /> 分享心得
        </button>
      </div>

      {/* Sponsored Post (Monetization) */}
      <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100 relative overflow-hidden">
        <div className="absolute top-4 right-4 text-[10px] font-bold text-orange-400 uppercase tracking-widest">推广</div>
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <Utensils className="text-orange-500 w-10 h-10" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-orange-900">鲜味录精选：特级初榨橄榄油</h3>
            <p className="text-sm text-orange-700 mt-1">订阅会员即可享受 8 折优惠，让你的每一道菜都散发自然清香。</p>
            <button className="mt-3 text-sm font-bold text-orange-600 flex items-center gap-1">
              立即查看 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                {post.username[0]}
              </div>
              <div>
                <div className="font-bold text-gray-900">{post.username}</div>
                <div className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{post.content}</p>
            <div className="flex gap-6 pt-2 border-t border-gray-50">
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" /> <span className="text-sm">24</span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                <MessageCircle className="w-5 h-5" /> <span className="text-sm">8</span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-green-500 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Post Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative"
            >
              <button onClick={() => setShowAdd(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-serif font-bold mb-6">分享你的美食时刻</h3>
              <textarea
                placeholder="今天做了什么好吃的？分享一下你的心得吧..."
                className="w-full rounded-2xl border-gray-100 bg-gray-50 p-4 min-h-[150px] mb-6 focus:ring-orange-500"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <div className="flex gap-4">
                <button className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  添加图片
                </button>
                <button 
                  onClick={handlePost}
                  disabled={loading || !newContent}
                  className="flex-[2] bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '发布中...' : '立即发布'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Subscription = () => {
  return (
    <div className="space-y-8 max-w-2xl mx-auto py-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-serif font-bold text-gray-900">升级 鲜味录 Pro</h2>
        <p className="text-gray-500">解锁更多高级功能，开启你的顶级厨神之路</p>
      </div>

      <div className="grid gap-6">
        {[
          {
            title: '基础版',
            price: '免费',
            features: ['AI食谱生成 (每日3次)', '基础百科搜索', '社区互动'],
            button: '当前方案',
            active: false
          },
          {
            title: 'Pro 会员',
            price: '¥19 / 月',
            features: [
              '无限次 AI 食谱生成',
              '4K 超高清 AI 菜品图生成',
              '深度营养成分分析',
              '专属米其林大厨 AI 咨询',
              '商城购物 8.5 折优惠',
              '无广告纯净体验'
            ],
            button: '立即升级',
            active: true
          }
        ].map((plan) => (
          <div 
            key={plan.title}
            className={cn(
              "p-8 rounded-3xl border-2 transition-all",
              plan.active ? "border-orange-500 bg-orange-50/30 shadow-lg" : "border-gray-100 bg-white"
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{plan.title}</h3>
                <div className="text-3xl font-serif font-black mt-2">{plan.price}</div>
              </div>
              {plan.active && <Crown className="text-orange-500 w-8 h-8" />}
            </div>
            <ul className="space-y-4 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-gray-600">
                  <Sparkles className="w-4 h-4 text-orange-400" /> {f}
                </li>
              ))}
            </ul>
            <button className={cn(
              "w-full py-4 rounded-2xl font-bold transition-all",
              plan.active ? "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200 shadow-lg" : "bg-gray-100 text-gray-400 cursor-default"
            )}>
              {plan.button}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('ai');
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(setUser);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <div className="min-h-screen pb-24 md:pt-20">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuth(true)}
      />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'ai' && <AIRecipe user={user} onOpenAuth={() => setShowAuth(true)} />}
            {activeTab === 'kitchen' && <MyKitchen user={user} onOpenAuth={() => setShowAuth(true)} />}
            {activeTab === 'encyclopedia' && <Encyclopedia />}
            {activeTab === 'community' && <Community user={user} onOpenAuth={() => setShowAuth(true)} />}
            {activeTab === 'pro' && <Subscription />}
          </motion.div>
        </AnimatePresence>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuthSuccess={setUser} />}

      {/* Floating Ad / Recommendation (Monetization) */}
      {activeTab !== 'pro' && (
        <div className="fixed bottom-24 right-6 z-40 hidden lg:block">
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-orange-100 w-48 space-y-3">
            <div className="text-[10px] font-bold text-orange-400 uppercase">今日推荐</div>
            <img 
              src="https://picsum.photos/seed/kitchen/200/150" 
              alt="Ad" 
              className="rounded-lg" 
              referrerPolicy="no-referrer"
            />
            <div className="text-xs font-bold">智能空气炸锅</div>
            <p className="text-[10px] text-gray-500">限时特惠，一键解锁百种食谱。</p>
            <button className="w-full py-2 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-lg">了解详情</button>
          </div>
        </div>
      )}
    </div>
  );
}
