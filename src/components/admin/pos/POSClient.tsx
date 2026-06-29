'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Search, ShoppingBag, Trash2, Plus, Minus, User, MapPin, Phone, Maximize, Minimize, ArrowLeft, Check, X, Wifi, WifiOff, RefreshCw, ListOrdered, FileText, Delete, ZoomIn, ZoomOut, Camera } from 'lucide-react';
import Link from 'next/link';
import POSProductCard from './POSProductCard';
import BarcodeScanner from './BarcodeScanner';
import { createPOSOrder } from '@/lib/actions/pos';
import { useUIStore } from '@/store/ui';
import { getWithYouCities } from '@/lib/actions/delivery';
import { printReceipt } from '@/lib/utils/printReceipt';

const InlineNumpad = ({ value, onChange, onClose, title }: { value: number | '', onChange: (val: number | '') => void, onClose: () => void, title: string }) => {
  const [localVal, setLocalVal] = useState(value === 0 ? '' : value.toString());

  const handlePress = (num: string) => {
    const newVal = localVal + num;
    setLocalVal(newVal);
    onChange(Number(newVal) || 0);
  };

  const handleDelete = () => {
    const newVal = localVal.slice(0, -1);
    setLocalVal(newVal);
    onChange(newVal === '' ? '' : Number(newVal));
  };

  const handleClear = () => {
    setLocalVal('');
    onChange('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localVal, onClose, onChange]);

  return (
    <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</h3>
        <button onClick={onClose} className="p-2 bg-white border border-gray-100 text-gray-600 rounded-full hover:bg-gray-50 shadow-sm transition-all active:scale-95">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handlePress(num.toString())} className="h-14 bg-white border border-gray-100 rounded-2xl text-xl font-black hover:border-black hover:bg-black hover:text-white active:scale-95 transition-all shadow-sm">
            {num}
          </button>
        ))}
        <button onClick={handleClear} className="h-14 bg-red-50 border border-red-100 text-red-500 rounded-2xl text-lg font-black hover:bg-red-500 hover:text-white active:scale-95 transition-all shadow-sm">
          C
        </button>
        <button onClick={() => handlePress('0')} className="h-14 bg-white border border-gray-100 rounded-2xl text-xl font-black hover:border-black hover:bg-black hover:text-white active:scale-95 transition-all shadow-sm">
          0
        </button>
        <button onClick={handleDelete} className="h-14 bg-white border border-gray-100 text-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all shadow-sm">
          <Delete className="w-6 h-6" />
        </button>
      </div>
      <button onClick={onClose} className="w-full mt-4 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">
        VALIDER
      </button>
    </div>
  );
};

interface Product {
  id: string;
  title?: string;
  name?: string;
  price: number;
  image: string | null;
  stock?: number;
  isbn?: string | null;
  category?: string | null;
}

interface CartItem extends Product {
  cartItemId: string;
  quantity: number;
  type: 'BOOK' | 'PACK' | 'ACCESSORY';
}

interface POSClientProps {
  books: any[];
  packs: any[];
  accessories?: any[];
  showCategories?: boolean;
  defaultDiscount?: number;
  maxDiscount?: number;
  favoriteCategories?: string;
  showSearch?: boolean;
  defaultGridCols?: number;
  defaultTab?: 'ALL' | 'BOOKS' | 'PACKS' | 'ACCESSORIES_LIBRARY' | 'ACCESSORIES_KIDS';
  allowOutOfStock?: boolean;
  requireCustomer?: boolean;
  shippingCompanies?: { id: string, name: string }[];
}

export default function POSClient({ 
  books, 
  packs, 
  accessories = [], 
  showCategories = true, 
  defaultDiscount = 0, 
  maxDiscount = 100, 
  favoriteCategories = '',
  showSearch = true,
  defaultGridCols = 8,
  defaultTab = 'ALL',
  allowOutOfStock = false,
  requireCustomer = true,
  shippingCompanies = []
}: POSClientProps) {
  const params = useParams();
  const locale = params.locale as string;
  const { showNotification } = useUIStore();
  const [localBooks, setLocalBooks] = useState<any[]>(books);
  const [localPacks, setLocalPacks] = useState<any[]>(packs);
  const [localAccessories, setLocalAccessories] = useState<any[]>(accessories);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'BOOKS' | 'PACKS' | 'ACCESSORIES_LIBRARY' | 'ACCESSORIES_KIDS'>(defaultTab);
  const [gridCols, setGridCols] = useState(defaultGridCols);
  const [activeNumpad, setActiveNumpad] = useState<'shipping' | 'discount' | null>(null);
  const [customer, setCustomer] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: ''
  });
  const [shippingFees, setShippingFees] = useState<number | ''>(0);
  const [discount, setDiscount] = useState<number | ''>(defaultDiscount || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [selectedShippingCompany, setSelectedShippingCompany] = useState<string>(shippingCompanies[0]?.id || '');
  
  const [allCities, setAllCities] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showCities, setShowCities] = useState(false);
  const [showCityPopup, setShowCityPopup] = useState(false);
  const [cityPopupResult, setCityPopupResult] = useState(false);

  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s-]/g, "");
  };

  const checkCity = () => {
    if (!customer.city) {
      showNotification('Veuillez d\'abord saisir une ville', 'error');
      return;
    }
    const normalizedInput = normalizeString(customer.city);
    const exists = allCities.some(c => normalizeString(c) === normalizedInput);
    setCityPopupResult(exists);
    setShowCityPopup(true);
  };

  const [isOffline, setIsOffline] = useState(false);
  const [offlineOrders, setOfflineOrders] = useState<any[]>([]);

  const prevOffline = useRef(isOffline);

  useEffect(() => {
    if (prevOffline.current !== isOffline) {
      if (isOffline && !prevOffline.current) {
        showNotification('Connexion perdue. Mode hors-ligne activé.', 'error');
      } else if (!isOffline && prevOffline.current) {
        showNotification('Connexion rétablie !', 'success');
      }
      prevOffline.current = isOffline;
    }
  }, [isOffline, showNotification]);

  useEffect(() => {
    // Initial network state
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérification en continu de la connexion (polling)
    const checkConnection = async () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }
      try {
        const res = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
        setIsOffline(!res.ok);
      } catch (e) {
        setIsOffline(true);
      }
    };

    const interval = setInterval(checkConnection, 10000);

    
    // Load offline orders
    const saved = localStorage.getItem('pos_offline_orders');
    if (saved) {
      try {
        setOfflineOrders(JSON.parse(saved));
      } catch (e) {}
    }

    getWithYouCities().then(setAllCities).catch(() => console.error("Impossible de récupérer les villes hors-ligne"));

    // Gestion du catalogue hors-ligne
    if (books.length > 0 || packs.length > 0 || accessories.length > 0) {
      localStorage.setItem('pos_cached_books', JSON.stringify(books));
      localStorage.setItem('pos_cached_packs', JSON.stringify(packs));
      localStorage.setItem('pos_cached_accessories', JSON.stringify(accessories));
      setLocalBooks(books);
      setLocalPacks(packs);
      setLocalAccessories(accessories);
    } else {
      const cachedBooks = localStorage.getItem('pos_cached_books');
      const cachedPacks = localStorage.getItem('pos_cached_packs');
      const cachedAccessories = localStorage.getItem('pos_cached_accessories');
      if (cachedBooks) setLocalBooks(JSON.parse(cachedBooks));
      if (cachedPacks) setLocalPacks(JSON.parse(cachedPacks));
      if (cachedAccessories) setLocalAccessories(JSON.parse(cachedAccessories));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [books, packs, accessories]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      const posContainer = document.getElementById('pos-container');
      if (posContainer && !document.fullscreenElement) {
        posContainer.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {});
      }
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, []);

  const saveOfflineOrder = (orderData: any) => {
    const newOrder = {
      ...orderData,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...offlineOrders, newOrder];
    setOfflineOrders(updated);
    localStorage.setItem('pos_offline_orders', JSON.stringify(updated));
    return newOrder.id;
  };

  const syncOfflineOrders = async () => {
    if (isOffline || offlineOrders.length === 0) return;
    setIsSubmitting(true);
    let successCount = 0;
    
    try {
      for (const order of offlineOrders) {
        const result = await createPOSOrder(order);
        if (result.success) successCount++;
      }
      
      setOfflineOrders([]);
      localStorage.removeItem('pos_offline_orders');
      showNotification(`${successCount} commande(s) synchronisée(s) avec le serveur`, 'success');
    } catch (e) {
      showNotification('Erreur lors de la synchronisation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (customer.city && customer.city.length > 0) {
      const normalizedInput = normalizeString(customer.city);
      const filtered = allCities.filter(c => 
        normalizeString(c).includes(normalizedInput)
      );
      setFilteredCities(filtered.slice(0, 8));
      setShowCities(filtered.length > 0);
    } else {
      setFilteredCities(allCities.slice(0, 8));
      // Do not auto-hide here, let onBlur/onFocus handle visibility
    }
  }, [customer.city, allCities]);

  const toggleFullscreen = () => {
    const posContainer = document.getElementById('pos-container');
    if (!document.fullscreenElement && posContainer) {
      posContainer.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.error);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(console.error);
      }
    }
  };

  const filteredBooks = localBooks.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()) || (b.isbn && b.isbn.includes(searchTerm)));
  const filteredPacks = localPacks.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAccessoriesLibrary = localAccessories.filter(a => a.category === 'LIBRARY' && a.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAccessoriesKids = localAccessories.filter(a => a.category === 'KIDS' && a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      const scannedBook = localBooks.find(b => b.isbn === searchTerm.trim());
      if (scannedBook) {
        addToCart(scannedBook, 'BOOK');
        setSearchTerm('');
        showNotification(`${scannedBook.title} ajouté au panier`, 'success');
      }
    }
  };

  const handleBarcodeScanResult = (isbn: string) => {
    setShowScanner(false);
    const scannedBook = localBooks.find(b => b.isbn === isbn.trim());
    if (scannedBook) {
      addToCart(scannedBook, 'BOOK');
      showNotification(`${scannedBook.title} ajouté au panier`, 'success');
    } else {
      showNotification(`Aucun livre trouvé avec le code-barres ${isbn}`, 'error');
    }
  };

  const displayedProducts = [
    ...(activeTab === 'ALL' || activeTab === 'BOOKS' ? filteredBooks.map(b => ({ ...b, type: 'BOOK' as const })) : []),
    ...(activeTab === 'ALL' || activeTab === 'PACKS' ? filteredPacks.map(p => ({ ...p, type: 'PACK' as const })) : []),
    ...(activeTab === 'ALL' || activeTab === 'ACCESSORIES_LIBRARY' ? filteredAccessoriesLibrary.map(a => ({ ...a, title: a.name, type: 'ACCESSORY' as const })) : []),
    ...(activeTab === 'ALL' || activeTab === 'ACCESSORIES_KIDS' ? filteredAccessoriesKids.map(a => ({ ...a, title: a.name, type: 'ACCESSORY' as const })) : [])
  ];

  const addToCart = (product: any, type: 'BOOK' | 'PACK' | 'ACCESSORY') => {
    if (!allowOutOfStock && type === 'BOOK' && (product.stock === undefined || product.stock <= 0)) {
        showNotification('Produit en rupture de stock', 'error');
        return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.type === type);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === existing.cartItemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, type, quantity: 1, cartItemId: Math.random().toString() }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const updatePrice = (cartItemId: string, newPrice: number) => {
    setCart(prev => prev.map(item =>
      item.cartItemId === cartItemId ? { ...item, price: newPrice >= 0 ? newPrice : 0 } : item
    ));
  };

  const removeItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = itemsTotal + Number(shippingFees) - Number(discount);

  const handleCheckout = async () => {
    if (cart.length === 0) return showNotification('Le panier est vide', 'error');
    if (requireCustomer && (!customer.fullName || !customer.phone)) return showNotification('Veuillez remplir les informations client (Nom et Téléphone)', 'error');

    setIsSubmitting(true);
    
    const orderPayload = {
      fullName: customer.fullName,
      phone: customer.phone,
      address: customer.address || 'Au magasin',
      city: customer.city || 'Non spécifiée',
      items: cart.map(c => ({
        id: c.id,
        type: c.type,
        quantity: c.quantity,
        price: c.price
      })),
      subtotal: itemsTotal,
      total: finalTotal,
      discount: Number(discount),
      shippingFees: Number(shippingFees),
      shippingCompany: selectedShippingCompany
    };

    const fallbackOffline = (msg: string) => {
      showNotification(`${msg}. Passage en sauvegarde locale...`, 'error');
      const offlineId = saveOfflineOrder(orderPayload);
      showNotification(`Sauvegardé hors-ligne: ${offlineId}`, 'success');
      
      printReceipt({
        orderId: offlineId,
        customerName: customer.fullName,
        customerPhone: customer.phone,
        customerCity: customer.city || 'Au magasin',
        items: cart,
        subtotal: itemsTotal,
        shippingFees: Number(shippingFees),
        discount: Number(discount),
        total: finalTotal,
        shippingCompany: selectedShippingCompany
      });

      setCart([]);
      setCustomer({ fullName: '', phone: '', address: '', city: '' });
      setShippingFees(0);
      setDiscount(0);
      setLastOrderId(null);
      setSelectedShippingCompany(shippingCompanies[0]?.id || '');
    };

    if (isOffline) {
      fallbackOffline('Mode hors-ligne détecté');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createPOSOrder(orderPayload);

      if (result.success) {
        showNotification(`Commande créée avec succès: ${result.orderId}`, 'success');
        
        if (result.orderId) {
          setLastOrderId(result.orderId);
          printReceipt({
            orderId: result.orderId,
            customerName: customer.fullName,
            customerPhone: customer.phone,
            customerCity: customer.city || 'Au magasin',
            items: cart,
            subtotal: itemsTotal,
            shippingFees: Number(shippingFees),
            discount: Number(discount),
            total: finalTotal,
            shippingCompany: selectedShippingCompany
          });
        }

        setCart([]);
        setCustomer({ fullName: '', phone: '', address: '', city: '' });
        setShippingFees(0);
        setDiscount(0);
        setSelectedShippingCompany(shippingCompanies[0]?.id || '');
      } else {
        fallbackOffline(result.error || 'Erreur serveur');
      }
    } catch (error) {
      fallbackOffline('Serveur injoignable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showMobileCart, setShowMobileCart] = useState(false);

  return (
    <div id="pos-container" className="flex flex-col lg:flex-row h-full gap-4 relative bg-gray-50/50 p-2 lg:p-4 overflow-hidden">
      {isOffline && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-red-600/30">
          <WifiOff className="w-4 h-4 animate-pulse" />
          Connexion perdue. Mode hors-ligne activé.
        </div>
      )}

      {showScanner && (
        <BarcodeScanner 
          onResult={handleBarcodeScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className={`flex-1 flex flex-col min-w-0 bg-white rounded-[3rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden ${showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-8 md:p-10 border-b border-gray-50 space-y-8 bg-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex items-center justify-between gap-6 w-full md:w-auto">

              <div className="flex items-center gap-3">
                <Link href={`/${locale}/admin/orders`} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 hover:bg-gray-100 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm">
                  <ListOrdered className="w-4 h-4" />
                  Commandes
                </Link>
                {lastOrderId && (
                  <Link href={`/${locale}/admin/orders/${lastOrderId}`} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-100 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm" target="_blank">
                    <FileText className="w-4 h-4" />
                    Dernière
                  </Link>
                )}
                {isOffline && (
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-2xl border border-red-100 font-black text-[10px] uppercase tracking-widest animate-pulse">
                    <WifiOff className="w-4 h-4" />
                    Mode Hors-Ligne
                  </div>
                )}
                {!isOffline && offlineOrders.length > 0 && (
                  <button 
                    onClick={syncOfflineOrders}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 hover:bg-amber-100 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                    Sync ({offlineOrders.length})
                  </button>
                )}
                <button 
                  onClick={toggleFullscreen}
                  className="hidden sm:flex w-12 h-12 items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded-2xl border border-gray-100 transition-all shadow-sm"
                  title={isFullscreen ? "Quitter" : "Plein écran"}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <div className="hidden sm:flex items-center gap-1 border border-gray-100 rounded-2xl p-1 bg-white shrink-0 shadow-sm h-12">
                  <button 
                    onClick={() => setGridCols(Math.max(2, gridCols - 1))} 
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl text-gray-400 hover:text-black transition-colors" 
                    title="Agrandir (Moins de livres)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-4 text-center text-xs font-black text-gray-300">{gridCols}</div>
                  <button 
                    onClick={() => setGridCols(Math.min(10, gridCols + 1))} 
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl text-gray-400 hover:text-black transition-colors" 
                    title="Réduire (Plus de livres)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20"
                >
                  <ShoppingBag className="w-6 h-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {showSearch && (
              <div className="flex items-center gap-2 w-full md:w-96">
                <div className="relative flex-1 group">
                  <Search className="w-4 h-4 text-gray-300 absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-black" />
                  <input
                    type="text"
                    placeholder="RECHERCHER OU SCANNER ISBN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleBarcodeScan}
                    className="w-full pl-14 pr-8 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all font-black text-[10px] uppercase tracking-widest shadow-inner"
                  />
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-14 h-14 bg-black text-white rounded-[1.5rem] flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg active:scale-95 shrink-0"
                  title="Scanner avec la caméra"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
          
          {showCategories && (
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 no-scrollbar">
              <div className="flex gap-3">
                {[
                    { id: 'ALL', label: 'TOUT LE CATALOGUE' },
                    { id: 'BOOKS', label: 'LIVRES UNITAIRES' },
                    { id: 'PACKS', label: 'PACKS PROMO' },
                    { id: 'ACCESSORIES_LIBRARY', label: 'ACCESSOIRES LECTURE' },
                    { id: 'ACCESSORIES_KIDS', label: 'ACCESSOIRES ENFANTS' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-8 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all whitespace-nowrap border ${
                      activeTab === tab.id 
                        ? 'bg-black text-white border-black shadow-xl shadow-black/20 scale-105' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-black'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-8 md:p-10 overflow-y-auto bg-gray-50/30 custom-scrollbar">
          <div 
            className="grid gap-6"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
            {displayedProducts.map((product) => (
              <POSProductCard
                key={`${product.type}-${product.id}`}
                product={product}
                type={product.type}
                onAdd={addToCart}
              />
            ))}
          </div>
          {displayedProducts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-32 text-gray-300">
              <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-50">
                <Search className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Aucun résultat trouvé</p>
            </div>
          )}
        </div>
      </div>

      <div className={`
        fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:w-[450px] flex flex-col bg-white lg:rounded-[3rem] shadow-2xl lg:shadow-xl border border-gray-100 overflow-y-auto custom-scrollbar shrink-0 transition-all duration-500 ease-in-out
        ${showMobileCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowMobileCart(false)}
              className="lg:hidden w-12 h-12 flex items-center justify-center hover:bg-white rounded-2xl transition-all border border-gray-100 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="text-xl font-black text-black tracking-tight italic flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                Commande
              </h2>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Terminal de vente actif</p>
            </div>
          </div>
          <span className="bg-black text-white text-[9px] font-black px-4 py-2 rounded-full shadow-xl shadow-black/10 uppercase tracking-widest">
            {cart.length} ARTICLES
          </span>
        </div>

        {!activeNumpad && (
          <>
            <div className="shrink-0 p-6 space-y-4 bg-white min-h-[300px]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-200 space-y-6">
              <div className="w-32 h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center shadow-inner">
                <ShoppingBag className="w-12 h-12 opacity-20" strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Le panier est vide</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="flex items-center gap-5 p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1">
                <div className="w-16 h-20 bg-white rounded-2xl border border-gray-100 overflow-hidden relative shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title || item.name} 
                      className="absolute inset-0 w-full h-full object-cover unoptimized"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-gray-100" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-black text-[11px] uppercase tracking-tight line-clamp-1 italic">{item.title || item.name}</h4>
                  {item.type === 'BOOK' && item.stock !== undefined && (
                    <p className={`text-xs font-black tracking-widest mt-1 ${item.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      Stock: {item.stock}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
                        <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={e => updatePrice(item.cartItemId, Number(e.target.value))}
                            className="w-12 text-right bg-transparent text-[11px] font-black text-emerald-600 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-400 font-black tracking-widest uppercase">DH</span>
                    </div>

                    <div className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      <button onClick={() => updateQuantity(item.cartItemId, -1)} className="px-3 py-2 text-gray-300 hover:text-black transition-colors border-r border-gray-50">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-[11px] font-black">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, 1)} className="px-3 py-2 text-gray-300 hover:text-black transition-colors border-l border-gray-50">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button onClick={() => removeItem(item.cartItemId)} className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 p-8 border-t border-gray-50 bg-gray-50/50 space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black text-black uppercase tracking-[0.2em]">
            <User className="w-3.5 h-3.5" /> Fiche Client
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="NOM COMPLET DU CLIENT *"
              value={customer.fullName}
              onChange={e => setCustomer({...customer, fullName: e.target.value})}
              className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
            />
            <div className="grid grid-cols-2 gap-3">
                <input
                    type="tel"
                    placeholder="TÉLÉPHONE *"
                    value={customer.phone}
                    onChange={e => setCustomer({...customer, phone: e.target.value})}
                    className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
                />
                <div className="relative">
                    <input
                        type="text"
                        placeholder="VILLE"
                        value={customer.city}
                        autoComplete="off"
                        onChange={e => {
                            setCustomer({...customer, city: e.target.value});
                            setShowCities(true);
                        }}
                        onFocus={() => setShowCities(true)}
                        onBlur={() => setTimeout(() => setShowCities(false), 200)}
                        className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
                    />
                    {showCities && (
                        <div className="absolute z-[999] left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar">
                            {filteredCities.map((city, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setCustomer({...customer, city});
                                        setShowCities(false);
                                    }}
                                    className="w-full px-6 py-3 text-left hover:bg-gray-50 font-black text-[9px] uppercase tracking-widest transition-colors border-b border-gray-50 last:border-none"
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    )}
                    <button 
                        type="button" 
                        onClick={checkCity} 
                        className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-2 hover:underline absolute -bottom-5 right-2"
                    >
                        Vérifier WithYou
                    </button>
                </div>
            </div>
            <input
                type="text"
                placeholder="ADRESSE DE LIVRAISON (SI NÉCESSAIRE)"
                value={customer.address}
                onChange={e => setCustomer({...customer, address: e.target.value})}
                className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
            />
            {shippingCompanies.length > 0 && (
                <div className="relative">
                    <select
                        value={selectedShippingCompany}
                        onChange={(e) => setSelectedShippingCompany(e.target.value)}
                        className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
                    >
                        <option value="">-- CHOISIR UNE SOCIÉTÉ DE LIVRAISON --</option>
                        {shippingCompanies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
          </div>
        </div>
          </>
        )}

        <div className="shrink-0 p-8 md:p-10 bg-white border-t border-gray-50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] rounded-b-3xl">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Sous-total articles</span>
              <span className="text-black font-black">{itemsTotal.toFixed(0)} DH</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Frais de livraison</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveNumpad('shipping')}
                  className={`w-16 text-right px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border outline-none ${activeNumpad === 'shipping' ? 'bg-black text-white border-black' : 'bg-gray-50 border-gray-100 text-black focus:border-black'}`}
                >
                  {shippingFees === '' ? '0' : shippingFees}
                </button>
                <span className="text-black">DH</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Remise exceptionnelle</span>
              <div className="flex items-center gap-2 text-red-500">
                <span className="font-black">-</span>
                <button
                  onClick={() => setActiveNumpad('discount')}
                  className={`w-16 text-right px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border outline-none ${activeNumpad === 'discount' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50/50 border-red-100 text-red-600 focus:border-red-600'}`}
                >
                  {discount === '' ? '0' : discount}
                </button>
                <span className="font-black">DH</span>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-gray-100 border-dashed flex justify-between items-end">
              <div>
                <span className="text-gray-400 font-black text-[9px] uppercase tracking-[0.4em] block mb-1">Total Final</span>
                <span className="text-4xl md:text-5xl font-black text-black tracking-tighter italic">
                    {finalTotal.toFixed(0)}<span className="text-sm font-bold ml-1 text-emerald-500">DH</span>
                </span>
              </div>
              <ShoppingBag className="w-10 h-10 text-gray-50" />
            </div>
          </div>

          {activeNumpad ? (
            <InlineNumpad 
              title={activeNumpad === 'shipping' ? "Frais de livraison" : "Remise"}
              value={activeNumpad === 'shipping' ? shippingFees : discount}
              onChange={(val) => {
                if (activeNumpad === 'shipping') {
                  setShippingFees(val);
                } else {
                  const numVal = Number(val);
                  if (numVal <= maxDiscount) {
                    setDiscount(val);
                  } else {
                    showNotification(`La remise maximale autorisée est de ${maxDiscount}%`, 'error');
                  }
                }
              }}
              onClose={() => setActiveNumpad(null)}
            />
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-6 bg-black text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-black/30 hover:bg-gray-900 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {isSubmitting ? 'Traitement en cours...' : 'VALIDER LA VENTE'}
            </button>
          )}
        </div>
      </div>

      {showCityPopup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center mx-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${cityPopupResult ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                 {cityPopupResult ? <Check className="w-8 h-8"/> : <X className="w-8 h-8"/>}
              </div>
              <h3 className="text-lg font-black text-black uppercase tracking-widest mb-2">
                 {cityPopupResult ? 'Ville reconnue' : 'Ville introuvable'}
              </h3>
              <p className="text-gray-500 text-[11px] font-medium mb-6 uppercase tracking-wider">
                 {cityPopupResult ? `La ville "${customer.city}" est prise en charge par la livraison WithYou.` : `Attention, la ville "${customer.city}" ne figure pas dans la base de données WithYou.`}
              </p>
              <button onClick={() => setShowCityPopup(false)} className="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-colors">
                 Fermer
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
