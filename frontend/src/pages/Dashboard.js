import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, House, Plus, Trash, Archive, Check, Share, MagnifyingGlass, 
  CaretDown, X, List as ListIcon, User, SignOut, Tag, ArrowsClockwise, Package, Pill, Carrot, Grains, Copy, UserPlus
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
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
  const [basketComparison, setBasketComparison] = useState({ grocery: [], medicine: [] });
  
  const [showCreateHome, setShowCreateHome] = useState(false);
  const [showJoinHome, setShowJoinHome] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedItemForPrices, setSelectedItemForPrices] = useState(null);
  const [itemPrices, setItemPrices] = useState([]);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberMsg, setAddMemberMsg] = useState({ type: '', text: '' });
  
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
      // Bug #4 fix: reset list/item state when switching homes.
      // Note: these setState calls are intentional in this effect — they reset
      // stale state from the previously-selected home before the new loaders fire.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedList(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBasketComparison({ grocery: [], medicine: [] });
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
  // Bug #3 fix: reset selected list / items / basket when switching view modes
  // so archived/completed state never leaks into the active view (and vice versa).
  function switchViewMode(newMode) {
    setSelectedList(null);
    setItems([]);
    setBasketComparison({ grocery: [], medicine: [] });
    setViewMode(newMode);
  }

  async function openHistoricalList(list, mode) {
    setSelectedList(list);
    setViewMode(mode);
    // Bug #2 (already in earlier review): useEffect on selectedList will
    // auto-load items and basket — no need to fetch items manually here.
  }

  // Close a historical (archived/completed) list — returns user to the list overview
  function closeHistoricalList() {
    setSelectedList(null);
    setItems([]);
    setBasketComparison({ grocery: [], medicine: [] });
  }

  // Copy home ID to clipboard so the user can share it with family
  async function copyHomeId(homeId) {
    try {
      await navigator.clipboard.writeText(homeId);
      alert(`Home ID copied: ${homeId}`);
    } catch (e) {
      alert(`Home ID: ${homeId}`);
    }
  }

  // Add a member to the currently selected home (creator only)
  async function addMember(e) {
    e.preventDefault();
    setAddMemberMsg({ type: '', text: '' });
    if (!selectedHome) return;
    setLoading(true);
    try {
      await axios.post(
        `${API}/homes/${selectedHome.home_id}/members`,
        { email: addMemberEmail },
        { withCredentials: true }
      );
      setAddMemberMsg({ type: 'success', text: `Added ${addMemberEmail} to the home.` });
      setAddMemberEmail('');
      await loadMembers();
      await loadHomes();
    } catch (err) {
      setAddMemberMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to add member' });
    }
    setLoading(false);
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
      // Normalise response: backend now returns { grocery: [...], medicine: [...], baskets: [...] }
      // Older callers may still receive a flat array — handle both shapes.
      if (Array.isArray(data)) {
        setBasketComparison({ grocery: data, medicine: [] });
      } else {
        setBasketComparison({
          grocery: data.grocery || [],
          medicine: data.medicine || [],
        });
      }
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
      // Best basket can come from either grocery or medicine group — use the cheapest overall.
      const allBaskets = [...(basketComparison.grocery || []), ...(basketComparison.medicine || [])];
      const bestBasket = allBaskets.find(b => b.best);
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
              {selectedHome && homes.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="hidden md:flex items-center gap-2 bg-[#F4F1EA] hover:bg-[#E8E5DC] px-4 py-2 rounded-lg transition-colors"
                      data-testid="home-switcher-trigger"
                    >
                      <House size={16} weight="duotone" className="text-[#1A3626]" />
                      <span className="text-sm font-medium text-[#1A3626]">{selectedHome.home_name || selectedHome.home_id}</span>
                      <CaretDown size={14} className="text-[#8F9C93]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[240px]">
                    {homes.map((h) => (
                      <DropdownMenuItem
                        key={h.home_id}
                        onSelect={() => setSelectedHome(h)}
                        data-testid={`switch-home-${h.home_id}`}
                        className={selectedHome.home_id === h.home_id ? 'bg-[#F4F1EA] font-semibold' : ''}
                      >
                        <House size={14} weight="duotone" className="mr-2 text-[#1A3626]" />
                        <div className="flex-1">
                          <p className="text-sm">{h.home_name || h.home_id}</p>
                          <p className="text-xs text-[#8F9C93] font-mono">{h.home_id}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setShowCreateHome(true)} data-testid="dropdown-create-home">
                      <Plus size={14} weight="bold" className="mr-2" /> Create new home
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShowJoinHome(true)} data-testid="dropdown-join-home">
                      <UserPlus size={14} weight="bold" className="mr-2" /> Join existing home
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Link
                to="/profile"
                className="p-2 hover:bg-[#F4F1EA] rounded-lg"
                title="Profile"
                data-testid="profile-link"
              >
                <User size={20} weight="duotone" className="text-[#1A3626]" />
              </Link>
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
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-xs text-[#8F9C93] font-mono bg-[#F4F1EA] px-2 py-1 rounded">{selectedHome.home_id}</code>
                  <button
                    onClick={() => copyHomeId(selectedHome.home_id)}
                    className="text-[#8F9C93] hover:text-[#1A3626]"
                    title="Copy home ID — share this with family to let them join"
                    data-testid="copy-home-id"
                  >
                    <Copy size={14} weight="duotone" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8F9C93]">
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </div>
                  {selectedHome.is_creator && (
                    <button
                      onClick={() => { setAddMemberMsg({ type: '', text: '' }); setShowAddMember(true); }}
                      className="text-[#FF6B35] hover:underline font-semibold flex items-center gap-1"
                      data-testid="open-add-member"
                    >
                      <UserPlus size={14} weight="bold" />
                      Add
                    </button>
                  )}
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

              <div className="bg-white border border-[#E8E5DC] rounded-2xl p-3 grid grid-cols-2 gap-2" data-testid="view-mode-tabs">
                {[
                  { key: 'active', label: 'Active' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'archived', label: 'Archived' },
                  { key: 'catalogue', label: 'Catalogue' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => switchViewMode(tab.key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === tab.key
                        ? 'bg-[#1A3626] text-white'
                        : 'bg-[#F4F1EA] text-[#1A3626] hover:bg-[#E8E5DC]'
                    }`}
                    data-testid={`tab-${tab.key}`}
                  >
                    {tab.label}
                  </button>
                ))}
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
              {/* Visual differentiation banner per view mode */}
              {viewMode === 'archived' && (
                <div className="rounded-2xl px-5 py-3 bg-[#8F9C93]/15 border border-[#8F9C93]/30 flex items-center gap-3" data-testid="banner-archived">
                  <Archive size={20} weight="duotone" className="text-[#4A5D4E]" />
                  <p className="text-sm text-[#4A5D4E]"><strong>Archived view</strong> · these lists are read-only history</p>
                </div>
              )}
              {viewMode === 'completed' && (
                <div className="rounded-2xl px-5 py-3 bg-[#2D6A4F]/10 border border-[#2D6A4F]/30 flex items-center gap-3" data-testid="banner-completed">
                  <Check size={20} weight="duotone" className="text-[#2D6A4F]" />
                  <p className="text-sm text-[#2D6A4F]"><strong>Completed view</strong> · these lists are read-only purchase history</p>
                </div>
              )}
              {viewMode === 'catalogue' && (
                <div className="rounded-2xl px-5 py-3 bg-[#FF6B35]/10 border border-[#FF6B35]/30 flex items-center gap-3" data-testid="banner-catalogue">
                  <Package size={20} weight="duotone" className="text-[#FF6B35]" />
                  <p className="text-sm text-[#1A3626]"><strong>Catalogue view</strong> · all items you&apos;ve ever added — click any to add to a list</p>
                </div>
              )}

              {viewMode === 'catalogue' ? (
                <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-[#1A3626] font-heading">Complete Catalogue</h2>
                    {/* List selector — pick which active list to add items to */}
                    {lists.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[#8F9C93]">Add to:</label>
                        <select
                          value={selectedList?._id || ''}
                          onChange={(e) => {
                            const lst = lists.find(l => l._id === e.target.value);
                            if (lst) setSelectedList(lst);
                          }}
                          className="bg-[#F4F1EA] border border-[#E8E5DC] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#1A3626]"
                          data-testid="catalogue-list-selector"
                        >
                          {lists.map(l => (
                            <option key={l._id} value={l._id}>{l.frequency} List ({l.items_count} items)</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search catalogue..."
                    className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626] mb-4"
                    data-testid="catalogue-main-search"
                  />

                  {filteredCatalogue.length === 0 ? (
                    <div className="text-center py-12">
                      <Package size={48} weight="duotone" className="text-[#8F9C93] mx-auto mb-3" />
                      <p className="text-[#8F9C93]">No catalogue items yet. Items you add to any list will appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCatalogue.map((item) => (
                        <div
                          key={item._id || item.name}
                          className="border border-[#E8E5DC] rounded-xl p-4 flex flex-col gap-3 bg-white hover:shadow-md transition-shadow"
                          data-testid={`catalogue-card-${item.name}`}
                        >
                          <div>
                            <h3 className="font-bold text-[#1A3626]">{item.name}</h3>
                            <p className="text-xs text-[#8F9C93]">{item.category} · default unit: {item.unit}</p>
                          </div>
                          {lists.length === 0 ? (
                            <Button onClick={() => setShowCreateList(true)} variant="outline" size="sm" className="w-full">
                              Create a list first
                            </Button>
                          ) : (
                            <Button
                              onClick={() => addFromCatalogue(item)}
                              disabled={!selectedList}
                              className="w-full bg-[#1A3626] hover:bg-[#2D6A4F]"
                              data-testid={`catalogue-add-${item.name}`}
                            >
                              <Plus size={14} weight="bold" className="mr-1" />
                              Add to {selectedList?.frequency || 'list'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Basket Comparison — split into grocery and medicine groups.
                  Each card is now an <a> link to the vendor's site so the user
                  can jump straight to the shop after seeing the best deal. */}
              {activeItems.length > 0 && (
                <div className="space-y-6">
                  {[
                    { key: 'grocery', label: 'Grocery & Vegetable Basket', list: basketComparison.grocery || [] },
                    { key: 'medicine', label: 'Medicine Basket', list: basketComparison.medicine || [] },
                  ].filter(g => g.list.length > 0).map((group) => (
                    <div key={group.key} className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Tag size={24} weight="duotone" className="text-[#FF6B35]" />
                        <div>
                          <h2 className="text-xl font-bold text-[#1A3626] font-heading">{group.label}</h2>
                          <p className="text-sm text-[#8F9C93]">Click a vendor to open their shop in a new tab</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {group.list.map((basket) => (
                          <a
                            key={basket.vendor}
                            href={basket.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className={`block border-2 rounded-xl p-4 transition hover:shadow-md hover:-translate-y-0.5 ${basket.best ? 'border-[#FF6B35] bg-[#FF6B35]/5' : 'border-[#E8E5DC] bg-white'}`}
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
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shopping List — visual differentiation by viewMode */}
              {selectedList && (
                <div
                  className={`border rounded-2xl p-6 ${
                    viewMode === 'archived'
                      ? 'bg-[#8F9C93]/10 border-[#8F9C93]/40'
                      : viewMode === 'completed'
                      ? 'bg-[#2D6A4F]/5 border-[#2D6A4F]/40'
                      : 'bg-white border-[#E8E5DC]'
                  }`}
                  data-testid={`shopping-list-${viewMode}`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A3626] font-heading">
                        {selectedList.frequency} List
                        {viewMode === 'archived' && <span className="ml-2 text-sm font-medium text-[#4A5D4E] bg-[#8F9C93]/20 px-2 py-0.5 rounded-full">Archived</span>}
                        {viewMode === 'completed' && <span className="ml-2 text-sm font-medium text-[#2D6A4F] bg-[#2D6A4F]/15 px-2 py-0.5 rounded-full">Completed</span>}
                      </h2>
                      <p className="text-sm text-[#8F9C93]">{items.length} items total</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={shareOnWhatsApp} variant="outline" size="sm" data-testid="share-whatsapp-button">
                        <Share size={16} className="mr-2" />
                        Share
                      </Button>
                      {!isReadOnlyList && (
                        <Button onClick={completeList} variant="outline" size="sm" data-testid="complete-list-button">
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
                      {isReadOnlyList && (
                        <Button
                          onClick={closeHistoricalList}
                          variant="outline"
                          size="sm"
                          data-testid="close-historical-list"
                        >
                          <X size={16} className="mr-2" />
                          Close
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
              {viewMode === 'archived' && (
                archivedLists.length > 0 ? (
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
                          <Button onClick={() => openHistoricalList(list, 'archived')} variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                     ))}
                    </div>
                  </div>
                ) : (
                  // Bug #5 fix: empty state for archived view
                  <div className="bg-white border border-[#E8E5DC] rounded-2xl p-12 text-center">
                    <Archive size={48} weight="duotone" className="text-[#8F9C93] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#1A3626] mb-1">No archived lists yet</h3>
                    <p className="text-sm text-[#8F9C93]">Lists you archive will appear here for future reference.</p>
                  </div>
                )
              )}

              {/* Completed Lists */}
              {viewMode === 'completed' && (
                completedLists.length > 0 ? (
                  // Bug #8 fix: proper styling matching the Archived block
                  <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Check size={24} weight="duotone" className="text-[#2D6A4F]" />
                      <h2 className="text-xl font-bold text-[#1A3626] font-heading">Completed Lists</h2>
                    </div>

                    <div className="space-y-2">
                      {completedLists.map((list) => (
                        <div key={list._id} className="flex items-center justify-between bg-[#F4F1EA] rounded-lg p-3">
                          <div>
                            <p className="text-sm font-medium text-[#1A3626]">{list.frequency} List</p>
                            <p className="text-xs text-[#8F9C93]">{list.items_count} items</p>
                          </div>
                          <Button onClick={() => openHistoricalList(list, 'completed')} variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Bug #5 fix: empty state for completed view
                  <div className="bg-white border border-[#E8E5DC] rounded-2xl p-12 text-center">
                    <Check size={48} weight="duotone" className="text-[#8F9C93] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#1A3626] mb-1">No completed lists yet</h3>
                    <p className="text-sm text-[#8F9C93]">Mark a list as complete to track your purchase history here.</p>
                  </div>
                )
              )}
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
                href={offer.url || `https://www.google.com/search?q=${encodeURIComponent(offer.vendor + ' ' + (selectedItemForPrices?.name || ''))}`}
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

      {/* Add Member Modal — visible only to home creators */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {selectedHome?.home_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addMember} className="space-y-4">
            <p className="text-sm text-[#4A5D4E]">
              Enter the email of a registered HomeCart user to add them to this home. They&apos;ll see all shared lists.
            </p>
            {addMemberMsg.text && (
              <div className={`text-sm rounded-lg px-3 py-2 ${addMemberMsg.type === 'success' ? 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]' : 'bg-[#D90429]/10 text-[#D90429] border border-[#D90429]'}`}>
                {addMemberMsg.text}
              </div>
            )}
            <input
              type="email"
              placeholder="member@example.com"
              value={addMemberEmail}
              onChange={(e) => setAddMemberEmail(e.target.value)}
              className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
              required
              data-testid="add-member-email-input"
            />
            <div className="bg-[#F4F1EA] rounded-lg p-3 text-xs text-[#4A5D4E]">
              <strong>Tip:</strong> You can also share your Home ID <code className="font-mono">{selectedHome?.home_id}</code> with family. They can use &quot;Join Home&quot; with this ID instead.
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="add-member-submit">
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
