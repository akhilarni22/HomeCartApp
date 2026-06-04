import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, House, Plus, Trash, Archive, Check, Share, MagnifyingGlass, 
  CaretDown, X, List as ListIcon, User, SignOut, Tag, ArrowsClockwise, Package, Pill, Carrot, Grains
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import analytics from '../utils/analytics';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = [
  { id: 'Groceries', icon: Grains, color: '#1A3626', img: 'https://static.prod-images.emergentagent.com/jobs/6572fb12-e787-4b88-a1d9-ee34d1031f5a/images/029e95aa4f9e3a50c4bd581524bec420fe7ab6197b7221b992b348cfcf9f21a9.png' },
  { id: 'Vegetables', icon: Carrot, color: '#2D6A4F', img: 'https://static.prod-images.emergentagent.com/jobs/6572fb12-e787-4b88-a1d9-ee34d1031f5a/images/1410f0372970bfc2864adfebd4cfc11949e2b59e653a3b8403bb909a4506a219.png' },
  { id: 'Medicines', icon: Pill, color: '#FF6B35', img: 'https://static.prod-images.emergentagent.com/jobs/6572fb12-e787-4b88-a1d9-ee34d1031f5a/images/95e93359d3ba619ca3d67342424873e2eb4b2adb691ae8691fc4d65173abaff6.png' }
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [completedLists, setCompletedLists] = useState([]);
  const [viewMode, setViewMode] = useState('active'); // active | archived | completed | catalogue
  const [homes, setHomes] = useState([]);
  const [selectedHome, setSelectedHome] = useState(null);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [items, setItems] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [archivedLists, setArchivedLists] = useState([]);
  const [basketComparison, setBasketComparison] = useState([]);
  
  const [showCreateHome, setShowCreateHome] = useState(false);
  const [showJoinHome, setShowJoinHome] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedItemForPrices, setSelectedItemForPrices] = useState(null);
  const [itemPrices, setItemPrices] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [homeForm, setHomeForm] = useState({ home_name: '', home_id: '' });
  const [joinHomeId, setJoinHomeId] = useState('');
  const [listFrequency, setListFrequency] = useState('Weekly');
  const [itemForm, setItemForm] = useState({ name: '', category: 'Groceries', quantity: 1, unit: 'kg' });
  
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const isReadOnlyList = viewMode === 'archived' || viewMode === 'completed';

  useEffect(() => {
    loadHomes();
    analytics.page('App', 'Dashboard', { path: '/dashboard', title: 'HomeCart — Dashboard' });
  }, []);

  useEffect(() => {
    if (selectedHome) {
      loadLists();
      loadCatalogue();
      loadMembers();
      loadArchivedLists();
      loadCompletedLists();
    }
  }, [selectedHome]);

  useEffect(() => {
    if (selectedList) {
      loadItems();
      loadBasketComparison();
    }
  }, [selectedList]);

  async function loadHomes() {
    try {
      const { data } = await axios.get(`${API}/homes`, { withCredentials: true });
      setHomes(data);
      if (data.length > 0 && !selectedHome) {
        setSelectedHome(data[0]);
      }
    } catch (error) {
      console.error('Failed to load homes:', error);
    }
  }
  async function openHistoricalList(list, mode) {
    setSelectedList(list);
    setViewMode(mode);

    try {
      const { data } = await axios.get(`${API}/items?list_id=${list._id}`, {
        withCredentials: true,
       });
      setItems(data);
    } catch (error) {
      console.error('Failed to load historical list items:', error);
   }
 }
//   async function loadCompletedLists() {
//   try {
//     const { data } = await axios.get(`${API}/lists/completed?home_id=${selectedHome.home_id}`, {
//       withCredentials: true,
//     });
//     setCompletedLists(data);
//   } catch (error) {
//     console.error('Failed to load completed lists:', error);
//   }
// }
async function loadCompletedLists() {
  try {
    const { data } = await axios.get(`${API}/lists/completed?home_id=${selectedHome.home_id}`, {
      withCredentials: true,
    });
    setCompletedLists(data);
  } catch (error) {
    console.error('Failed to load completed lists:', error);
  }
}

async function completeList() {
  if (!selectedList) return;

  try {
    await axios.post(`${API}/lists/${selectedList._id}/complete`, {}, {
      withCredentials: true,
    });

    await loadLists();
    await loadCompletedLists();

    setSelectedList(null);
    setItems([]);
    setViewMode('active');
  } catch (error) {
    alert(error.response?.data?.detail || 'Failed to complete list');
  }
}

  async function loadLists() {
    try {
      const { data } = await axios.get(`${API}/lists?home_id=${selectedHome.home_id}`, { withCredentials: true });
      setLists(data);
      if (data.length > 0 && !selectedList) {
        setSelectedList(data[0]);
      }
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  }

  async function loadItems() {
    try {
      const { data } = await axios.get(`${API}/items?list_id=${selectedList._id}`, { withCredentials: true });
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }

  async function loadCatalogue() {
    try {
      const { data } = await axios.get(`${API}/catalogue?home_id=${selectedHome.home_id}`, { withCredentials: true });
      setCatalogue(data);
    } catch (error) {
      console.error('Failed to load catalogue:', error);
    }
  }

  async function loadMembers() {
    try {
      const { data } = await axios.get(`${API}/homes/${selectedHome.home_id}/members`, { withCredentials: true });
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }

  async function loadArchivedLists() {
    try {
      const { data } = await axios.get(`${API}/lists/archived?home_id=${selectedHome.home_id}`, { withCredentials: true });
      setArchivedLists(data);
    } catch (error) {
      console.error('Failed to load archived lists:', error);
    }
  }

  async function loadBasketComparison() {
    try {
      const { data } = await axios.get(`${API}/lists/${selectedList._id}/basket`, { withCredentials: true });
      setBasketComparison(data);
    } catch (error) {
      console.error('Failed to load basket comparison:', error);
    }
  }

  async function createHome(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: newHome } = await axios.post(`${API}/homes`, homeForm, { withCredentials: true });
      analytics.track('Home Created', {
        home_id: newHome.home_id,
        home_name: newHome.home_name,
        is_custom_id: Boolean(homeForm.home_id),
      });
      analytics.group(newHome.home_id, {
        home_id: newHome.home_id,
        home_name: newHome.home_name,
        members_count: 1,
        action: 'created',
      });
      await loadHomes();
      setShowCreateHome(false);
      setHomeForm({ home_name: '', home_id: '' });
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create home');
    }
    setLoading(false);
  }

  async function joinHome(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/homes/join`, { home_id: joinHomeId }, { withCredentials: true });
      // Read home_name from the already-loaded homes state — the join API only returns {message, home_id}
      const existingHome = homes.find(h => h.home_id === joinHomeId);
      analytics.track('Home Joined', {
        home_id: joinHomeId,
      });
      analytics.group(joinHomeId, {
        home_id: joinHomeId,
        home_name: existingHome?.home_name || '',
        action: 'joined',
      });
      await loadHomes();
      setShowJoinHome(false);
      setJoinHomeId('');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to join home');
    }
    setLoading(false);
  }

  async function createList(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/lists`, { frequency: listFrequency, home_id: selectedHome.home_id }, { withCredentials: true });
      analytics.track('List Created', {
        list_id: String(data._id),
        home_id: selectedHome.home_id,
        frequency: listFrequency,
      });
      await loadLists();
      setSelectedList(data);
      setShowCreateList(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create list');
    }
    setLoading(false);
  }

  async function addItem(e) {
    e.preventDefault();
    if (!selectedList) {
      alert('Please create or select a list first');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/items`, { ...itemForm, list_id: selectedList._id }, { withCredentials: true });
      analytics.track('Item Added', {
        item_name: itemForm.name,
        category: itemForm.category,
        quantity: itemForm.quantity,
        unit: itemForm.unit,
        list_id: String(selectedList._id),
        home_id: selectedHome.home_id,
        list_frequency: selectedList.frequency,
        from_catalogue: false,
      });
      await loadItems();
      await loadCatalogue();
      await loadBasketComparison();
      setShowAddItem(false);
      setItemForm({ name: '', category: 'Groceries', quantity: 1, unit: 'kg' });
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add item');
    }
    setLoading(false);
  }

  async function addFromCatalogue(catalogueItem) {
    if (!selectedList) {
      alert('Please create or select a list first');
      return;
    }
    try {
      await axios.post(`${API}/items`, { 
        name: catalogueItem.name, 
        category: catalogueItem.category, 
        quantity: 1, 
        unit: catalogueItem.unit, 
        list_id: selectedList._id 
      }, { withCredentials: true });
      analytics.track('Item Added', {
        item_name: catalogueItem.name,
        category: catalogueItem.category,
        quantity: 1,
        unit: catalogueItem.unit,
        list_id: String(selectedList._id),
        home_id: selectedHome.home_id,
        list_frequency: selectedList.frequency,
        from_catalogue: true,
      });
      await loadItems();
      await loadBasketComparison();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add item');
    }
  }

  async function toggleItemComplete(itemId, completed) {
    try {
      await axios.patch(`${API}/items/${itemId}`, { completed: !completed }, { withCredentials: true });
      if (!completed) {
        const item = items.find(i => i._id === itemId);
        if (item) {
          analytics.track('Item Completed', {
            item_id: String(item._id),
            item_name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            home_id: selectedHome?.home_id,
            list_id: String(selectedList?._id || ''),
          });
        }
      }
      await loadItems();
      await loadBasketComparison();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  }

  async function deleteItem(itemId) {
    try {
      const item = items.find(i => i._id === itemId);
      await axios.delete(`${API}/items/${itemId}`, { withCredentials: true });
      if (item) {
        analytics.track('Item Deleted', {
          item_id: String(item._id),
          item_name: item.name,
          category: item.category,
          home_id: selectedHome?.home_id,
          list_id: String(selectedList?._id || ''),
        });
      }
      await loadItems();
      await loadBasketComparison();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }

  async function archiveList() {
    if (!selectedList) return;
    try {
      await axios.post(`${API}/lists/${selectedList._id}/archive`, {}, { withCredentials: true });
      const bestBasket = basketComparison.find(b => b.best);
      const completedCount = items.filter(i => i.completed).length;
      const archiveProps = {
        list_id: String(selectedList._id),
        home_id: selectedHome?.home_id,
        frequency: selectedList.frequency,
        total_items: items.length,
        completed_items: completedCount,
        basket_best_total: bestBasket ? bestBasket.total : 0,
      };
      if (bestBasket) {
        archiveProps.basket_best_vendor = bestBasket.vendor;
      }
      analytics.track('List Archived', archiveProps);
      await loadLists();
      await loadArchivedLists();
      setSelectedList(null);
      setItems([]);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to archive list');
    }
  }

  async function viewItemPrices(item) {
    analytics.track('Item Prices Viewed', {
      item_id: String(item._id),
      item_name: item.name,
      category: item.category,
      home_id: selectedHome?.home_id,
    });
    setSelectedItemForPrices(item);
    setShowPriceModal(true);
    try {
      const { data } = await axios.get(`${API}/items/${item._id}/prices`, { withCredentials: true });
      setItemPrices(data);
    } catch (error) {
      console.error('Failed to load prices:', error);
    }
  }

  function shareOnWhatsApp() {
    if (!items.length) return;
    analytics.track('List Shared', {
      home_id: selectedHome?.home_id,
      list_id: String(selectedList?._id || ''),
      frequency: selectedList?.frequency,
      item_count: items.length,
      channel: 'whatsapp',
    });
    const grouped = CATEGORIES.map(({ id }) => {
      const categoryItems = items.filter(i => i.category === id);
      if (!categoryItems.length) return '';
      const lines = categoryItems.map(i => `- ${i.name}: ${i.quantity} ${i.unit}${i.completed ? ' ✅' : ''}`).join('%0A');
      return `*${id}*%0A${lines}`;
    }).filter(Boolean).join('%0A%0A');
    
    const text = `HomeCart List - ${selectedList?.frequency}%0AHome: ${selectedHome?.home_id}%0A%0A${grouped}`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const filteredCatalogue = useMemo(() => {
    return catalogue.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [catalogue, searchQuery]);

  const activeItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E8E5DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1A3626] rounded-xl flex items-center justify-center">
                <ShoppingCart size={24} weight="duotone" className="text-[#FDFBF7]" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-[#1A3626] font-heading">HomeCart</h1>
                <p className="text-xs text-[#8F9C93]">Smart grocery lists</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedHome && (
                <div className="hidden md:flex items-center gap-2 bg-[#F4F1EA] px-4 py-2 rounded-lg">
                  <House size={16} weight="duotone" className="text-[#1A3626]" />
                  <span className="text-sm font-medium text-[#1A3626]">{selectedHome.home_id}</span>
                  <button className="text-[#8F9C93] hover:text-[#1A3626]" onClick={() => setSelectedHome(homes.find(h => h.home_id !== selectedHome.home_id) || homes[0])}>
                    <ArrowsClockwise size={16} />
                  </button>
                </div>
              )}
              <button onClick={logout} className="p-2 hover:bg-[#F4F1EA] rounded-lg" data-testid="logout-button">
                <SignOut size={20} weight="duotone" className="text-[#1A3626]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedHome ? (
          <div className="text-center py-12">
            <img src="https://static.prod-images.emergentagent.com/jobs/6572fb12-e787-4b88-a1d9-ee34d1031f5a/images/45558b082f86fbeae04ec05efbe5823b588d5c4788738acdf666099a8fa077be.png" alt="Empty state" className="w-64 h-64 mx-auto object-cover rounded-2xl mb-6 opacity-70" />
            <h2 className="text-2xl font-bold text-[#1A3626] mb-2">No homes yet</h2>
            <p className="text-[#4A5D4E] mb-6">Create or join a home to start managing your grocery lists</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowCreateHome(true)} className="bg-[#1A3626] hover:bg-[#2D6A4F]" data-testid="create-home-button">
                <Plus size={20} className="mr-2" />
                Create Home
              </Button>
              <Button onClick={() => setShowJoinHome(true)} variant="outline" data-testid="join-home-button">
                Join Home
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <aside className="lg:col-span-3 space-y-6">
              {/* Home Card */}
              <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#1A3626] font-heading">Home</h3>
                  <button onClick={() => setShowCreateHome(true)} className="text-[#FF6B35]" data-testid="add-home-button">
                    <Plus size={20} weight="bold" />
                  </button>
                </div>
                <div className="text-sm text-[#4A5D4E] mb-2">{selectedHome.home_name}</div>
                <div className="text-xs text-[#8F9C93] mb-3">{selectedHome.home_id}</div>
                <div className="flex items-center gap-2 text-xs text-[#8F9C93]">
                  <User size={14} />
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#1A3626] font-heading mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => setShowCreateList(true)} className="w-full bg-[#1A3626] text-[#FDFBF7] rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#2D6A4F] flex items-center justify-center gap-2" data-testid="new-list-button">
                    <ListIcon size={18} />
                    New List
                  </button>
                  <button onClick={() => setShowAddItem(true)} disabled={!selectedList} className="w-full bg-[#F4F1EA] text-[#1A3626] rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#E8E5DC] disabled:opacity-50 flex items-center justify-center gap-2" data-testid="add-item-button">
                    <Plus size={18} />
                    Add Item
                  </button>
                </div>
              </div>

              <div>
                   <Button onClick={() => setViewMode('active')}>Active Lists</Button>
                    <Button onClick={() => setViewMode('completed')}>Completed Lists</Button>
                    <Button onClick={() => setViewMode('archived')}>Archived Lists</Button>
                    <Button onClick={() => setViewMode('catalogue')}>Catalogue</Button>
              </div>
              {/* Catalogue Search */}
              <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MagnifyingGlass size={20} weight="duotone" className="text-[#1A3626]" />
                  <h3 className="text-lg font-bold text-[#1A3626] font-heading">Catalogue</h3>
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 text-sm focus:outline-none focus:border-[#1A3626] rounded-none mb-4"
                  data-testid="catalogue-search"
                />
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredCatalogue.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => addFromCatalogue(item)}
                      className="w-full flex items-center justify-between bg-[#F4F1EA] hover:bg-[#E8E5DC] rounded-lg p-3 text-left"
                      data-testid={`catalogue-item-${idx}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1A3626]">{item.name}</p>
                        <p className="text-xs text-[#8F9C93]">{item.category} • {item.unit}</p>
                      </div>
                      <Plus size={16} className="text-[#1A3626]" />
                    </button>
                    
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-6">
              {viewMode === 'catalogue' ? (
               <div className="bg-white rounded-3xl p-6 shadow-sm">
               <h2 className="text-2xl font-bold mb-4">Complete Catalogue</h2>
               <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalogue..."
                  className="w-full border rounded-xl px-4 py-3 mb-4"/>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCatalogue.map(item => (
                <div key={item._id || item.name} className="border rounded-2xl p-4">
                <h3 className="font-semibold">{item.name}</h3>
                <p>{item.category}</p>
                <p>Default unit: {item.unit}</p>
                
                {!isReadOnlyList && selectedList && (
                    <Button onClick={() => addFromCatalogue(item)}>
                      Add to Current List
                    </Button>
                )}
                </div>
            ))}
            </div>
            </div>
          ):(
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E8E5DC] rounded-xl p-4">
                  <p className="text-xs text-[#8F9C93] mb-1">Active Items</p>
                  <p className="text-2xl font-bold text-[#1A3626]">{activeItems.length}</p>
                </div>
                <div className="bg-white border border-[#E8E5DC] rounded-xl p-4">
                  <p className="text-xs text-[#8F9C93] mb-1">Completed</p>
                  <p className="text-2xl font-bold text-[#2D6A4F]">{completedItems.length}</p>
                </div>
                <div className="bg-white border border-[#E8E5DC] rounded-xl p-4">
                  <p className="text-xs text-[#8F9C93] mb-1">Lists</p>
                  <p className="text-2xl font-bold text-[#1A3626]">{lists.length}</p>
                </div>
                <div className="bg-white border border-[#E8E5DC] rounded-xl p-4">
                  <p className="text-xs text-[#8F9C93] mb-1">Archived</p>
                  <p className="text-2xl font-bold text-[#8F9C93]">{archivedLists.length}</p>
                </div>
              </div>

              {/* Basket Comparison */}
              {activeItems.length > 0 && (
                <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag size={24} weight="duotone" className="text-[#FF6B35]" />
                    <div>
                      <h2 className="text-xl font-bold text-[#1A3626] font-heading">Basket Comparison</h2>
                      <p className="text-sm text-[#8F9C93]">Total cost if you buy all items from one platform</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {basketComparison.map((basket) => (
                      <div
                        key={basket.vendor}
                        className={`border-2 rounded-xl p-4 ${basket.best ? 'border-[#FF6B35] bg-[#FF6B35]/5' : 'border-[#E8E5DC]'}`}
                        data-testid={`basket-${basket.vendor.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-[#1A3626]">{basket.vendor}</p>
                          {basket.best && <span className="text-xs bg-[#FF6B35] text-white px-2 py-0.5 rounded-full font-bold">BEST</span>}
                        </div>
                        <p className="text-2xl font-bold text-[#1A3626]">{String.fromCharCode(8377)}{basket.total}</p>
                        <p className="text-xs text-[#8F9C93] mt-1">
                          {basket.best ? 'Lowest basket cost' : `${String.fromCharCode(8377)}${basket.savings} more`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shopping List */}
              {selectedList && (
                <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A3626] font-heading">{selectedList.frequency} List</h2>
                      <p className="text-sm text-[#8F9C93]">{items.length} items total</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={shareOnWhatsApp} variant="outline" size="sm" data-testid="share-whatsapp-button">
                        <Share size={16} className="mr-2" />
                        Share
                      </Button>
                      {!isReadOnlyList && (
                        <Button onClick={completeList} variant="outline" size="sm">
                        <Check size={16} className="mr-2" />
                            Complete
                        </Button>
                      )}
                      {!isReadOnlyList && (
                        <Button
                          onClick={archiveList}
                          variant="outline"
                          size="sm"
                          data-testid="archive-list-button"
                          >
                          <Archive size={16} className="mr-2" />
                          Archive
                          </Button>
                    )}
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} weight="duotone" className="text-[#8F9C93] mx-auto mb-4" />
                      <p className="text-[#8F9C93]">No items in this list yet. Add some items to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {CATEGORIES.map(({ id, icon: Icon, color, img }) => {
                        const categoryItems = items.filter(i => i.category === id);
                        if (!categoryItems.length) return null;
                        
                        return (
                          <div key={id} className="space-y-3" data-testid={`category-${id.toLowerCase()}`}>
                            <div className="relative h-24 rounded-xl overflow-hidden mb-3">
                              <img src={img} alt={id} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#1A3626]/60 to-transparent flex items-end p-4">
                                <div className="flex items-center gap-2">
                                  <Icon size={24} weight="duotone" className="text-white" />
                                  <h3 className="text-xl font-bold text-white font-heading">{id}</h3>
                                  <span className="text-sm text-white/80">({categoryItems.length})</span>
                                </div>
                              </div>
                            </div>

                            {categoryItems.map((item) => (
                              <motion.div
                                key={item._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-[#F4F1EA] border border-[#E8E5DC] rounded-xl p-4 list-item"
                                data-testid={`list-item-${item._id}`}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    disabled={isReadOnlyList}
                                    onClick={() => toggleItemComplete(item._id, item.completed)}
                                    className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      item.completed
                                        ? 'bg-[#2D6A4F] border-[#2D6A4F]'
                                        : 'border-[#E8E5DC]'
                                      } ${isReadOnlyList ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {item.completed && (
                                          <Check size={14} weight="bold" className="text-white" />
                                        )}
                                  </button>
                                  
                                  <div className="flex-1">
                                    <p className={`text-lg font-semibold ${item.completed ? 'line-through text-[#8F9C93]' : 'text-[#1A3626]'}`}>
                                      {item.name}
                                    </p>
                                    <p className="text-sm text-[#8F9C93]">{item.quantity} {item.unit}</p>
                                    
                                    {!item.completed && (
                                      <button
                                        onClick={() => viewItemPrices(item)}
                                        className="mt-2 text-sm text-[#FF6B35] font-semibold hover:underline"
                                        data-testid={`compare-prices-${item._id}`}
                                      >
                                        Compare prices →
                                      </button>
                                    )}
                                  </div>

                                  {!isReadOnlyList && (
                                    <button
                                      onClick={() => deleteItem(item._id)}
                                      className="p-2 hover:bg-white rounded-lg"
                                      data-testid={`delete-${item._id}`}
                                    >
                                  <Trash size={18} className="text-[#D90429]" />
                                </button>
                              )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Archives */}
              {viewMode === 'archived' && archivedLists.length > 0 && (
                <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                <Archive size={24} weight="duotone" className="text-[#1A3626]" />
                <h2 className="text-xl font-bold text-[#1A3626] font-heading">Archived Lists</h2>
                </div>

                <div className="space-y-2">
                    {archivedLists.map((list) => (
                      <div key={list._id} className="flex items-center justify-between bg-[#F4F1EA] rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-[#1A3626]">{list.frequency} List</p>
                          <p className="text-xs text-[#8F9C93]">{list.items_count} items</p>
                        </div>
                        <Button onClick={() => openHistoricalList(list, 'archived')}>
                              View
                        </Button>
                        {/* {!isReadOnlyList && (
                           <Button onClick={archiveList} variant="outline" size="sm">
                            <Archive size={16} className="mr-2" />
                              Archive
                           </Button>
                        )} */}
                      </div>
                   ))}
                </div>
              </div>
             )}
              {/* Completed Lists */}
              {viewMode === 'completed' && completedLists.map(list => (
              <div key={list._id}>
              <p>{list.frequency} List</p>
              <p>{list.items_count} items</p>
              <Button onClick={() => openHistoricalList(list, 'completed')}>
                     View
              </Button>
              </div>
             ))}
            </>
          )}
            </div>
          </div>
        )}


      </main>

      {/* Modals */}
      <Dialog open={showCreateHome} onOpenChange={setShowCreateHome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Home</DialogTitle>
          </DialogHeader>
          <form onSubmit={createHome} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Home Name</label>
              <input
                type="text"
                value={homeForm.home_name}
                onChange={(e) => setHomeForm({ ...homeForm, home_name: e.target.value })}
                className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
                placeholder="e.g. Smith Family"
                required
                data-testid="home-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Home ID (optional)</label>
              <input
                type="text"
                value={homeForm.home_id}
                onChange={(e) => setHomeForm({ ...homeForm, home_id: e.target.value })}
                className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
                placeholder="Leave empty for auto-generated"
                data-testid="home-id-input"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="create-home-submit">
              {loading ? 'Creating...' : 'Create Home'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoinHome} onOpenChange={setShowJoinHome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Existing Home</DialogTitle>
          </DialogHeader>
          <form onSubmit={joinHome} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Home ID</label>
              <input
                type="text"
                value={joinHomeId}
                onChange={(e) => setJoinHomeId(e.target.value)}
                className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
                placeholder="Enter Home ID"
                required
                data-testid="join-home-id-input"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="join-home-submit">
              {loading ? 'Joining...' : 'Join Home'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <form onSubmit={createList} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {['Daily', 'Weekly', 'Monthly'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setListFrequency(freq)}
                    className={`px-4 py-2 rounded-lg font-medium ${listFrequency === freq ? 'bg-[#1A3626] text-white' : 'bg-[#F4F1EA] text-[#1A3626]'}`}
                    data-testid={`frequency-${freq.toLowerCase()}`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="create-list-submit">
              {loading ? 'Creating...' : 'Create List'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={addItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, category: id })}
                    className={`px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-1 ${itemForm.category === id ? 'bg-[#1A3626] text-white' : 'bg-[#F4F1EA] text-[#1A3626]'}`}
                    data-testid={`category-${id.toLowerCase()}`}
                  >
                    <Icon size={16} />
                    <span className="text-xs">{id.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A3626] mb-2">Item Name</label>
              <input
                type="text"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
                placeholder="e.g. Rice, Tomato"
                required
                data-testid="item-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A3626] mb-2">Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) })}
                  className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
                  required
                  data-testid="item-quantity-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A3626] mb-2">Unit</label>
                <input
                  type="text"
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
                  placeholder="kg, litre"
                  required
                  data-testid="item-unit-input"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="add-item-submit">
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price Comparison</DialogTitle>
            {selectedItemForPrices && (
              <p className="text-sm text-[#8F9C93]">
                {selectedItemForPrices.name} - {selectedItemForPrices.quantity} {selectedItemForPrices.unit}
              </p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {itemPrices.map((offer) => (
              <a
                key={offer.vendor}
                href={`https://www.google.com/search?q=${encodeURIComponent(offer.vendor + ' ' + (selectedItemForPrices?.name || ''))}`}
                target="_blank"
                rel="noreferrer"
                className={`border-2 rounded-xl p-4 price-card ${offer.best ? 'border-[#FF6B35] bg-[#FF6B35]/5' : 'border-[#E8E5DC]'}`}
                data-testid={`price-${offer.vendor.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-[#1A3626]">{offer.vendor}</p>
                  {offer.best && <span className="text-xs bg-[#FF6B35] text-white px-2 py-0.5 rounded-full font-bold">BEST</span>}
                </div>
                <p className="text-2xl font-bold text-[#1A3626]">{String.fromCharCode(8377)}{offer.price}</p>
                <p className="text-xs text-[#8F9C93] mt-1">ETA: {offer.eta}</p>
                {offer.coupon && <p className="text-xs text-[#2D6A4F] mt-1 font-medium">{offer.coupon}</p>}
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
