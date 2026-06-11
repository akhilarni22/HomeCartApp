import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, House, Lock, Trash, UserMinus, ChartBar, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ lists_created: 0, homes_owned: 0, items_added: 0 });
  const [homes, setHomes] = useState([]);
  const [membersByHome, setMembersByHome] = useState({});
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadHomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    try {
      const { data } = await axios.get(`${API}/users/me/stats`, { withCredentials: true });
      setStats(data);
    } catch (e) { /* no-op */ }
  }

  async function loadHomes() {
    try {
      const { data } = await axios.get(`${API}/homes`, { withCredentials: true });
      setHomes(data);
      for (const h of data) {
        loadMembers(h.home_id);
      }
    } catch (e) { /* no-op */ }
  }

  async function loadMembers(homeId) {
    try {
      const { data } = await axios.get(`${API}/homes/${homeId}/members`, { withCredentials: true });
      setMembersByHome((prev) => ({ ...prev, [homeId]: data }));
    } catch (e) { /* no-op */ }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });
    if (pw.new_password !== pw.confirm) {
      setPwMsg({ type: 'error', text: 'New password and confirmation do not match' });
      return;
    }
    setPwLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: pw.current_password,
        new_password: pw.new_password,
      }, { withCredentials: true });
      setPwMsg({ type: 'success', text: 'Password updated successfully' });
      setPw({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update password' });
    }
    setPwLoading(false);
  }

  async function removeMember(homeId, email) {
    if (!window.confirm(`Remove ${email} from this home?`)) return;
    try {
      await axios.delete(`${API}/homes/${homeId}/members/${encodeURIComponent(email)}`, { withCredentials: true });
      loadMembers(homeId);
      loadHomes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove member');
    }
  }

  async function deleteHome(homeId) {
    if (!window.confirm(`Delete this home? This will permanently delete all lists, items, and members. This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/homes/${homeId}`, { withCredentials: true });
      loadHomes();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete home');
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E8E5DC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#1A3626] hover:text-[#FF6B35] font-medium" data-testid="back-to-dashboard">
            <ArrowLeft size={20} weight="bold" />
            Back to Dashboard
          </Link>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="flex items-center gap-2 text-[#1A3626] hover:text-[#FF6B35] font-medium" data-testid="profile-logout">
            <SignOut size={20} weight="duotone" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Header */}
        <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#1A3626] rounded-full flex items-center justify-center">
              <User size={32} weight="duotone" className="text-[#FDFBF7]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1A3626] font-heading">{user?.name || 'User'}</h1>
              <p className="text-sm text-[#4A5D4E]">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E8E5DC] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ChartBar size={20} weight="duotone" className="text-[#FF6B35]" />
              <p className="text-xs text-[#8F9C93] uppercase tracking-wider">Lists Created</p>
            </div>
            <p className="text-3xl font-bold text-[#1A3626]" data-testid="stat-lists">{stats.lists_created}</p>
          </div>
          <div className="bg-white border border-[#E8E5DC] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <House size={20} weight="duotone" className="text-[#FF6B35]" />
              <p className="text-xs text-[#8F9C93] uppercase tracking-wider">Homes Owned</p>
            </div>
            <p className="text-3xl font-bold text-[#1A3626]" data-testid="stat-homes">{stats.homes_owned}</p>
          </div>
          <div className="bg-white border border-[#E8E5DC] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <User size={20} weight="duotone" className="text-[#FF6B35]" />
              <p className="text-xs text-[#8F9C93] uppercase tracking-wider">Items Added</p>
            </div>
            <p className="text-3xl font-bold text-[#1A3626]" data-testid="stat-items">{stats.items_added}</p>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={24} weight="duotone" className="text-[#1A3626]" />
            <h2 className="text-xl font-bold text-[#1A3626] font-heading">Change Password</h2>
          </div>
          <form onSubmit={changePassword} className="space-y-4 max-w-md">
            {pwMsg.text && (
              <div className={`text-sm rounded-lg px-3 py-2 ${pwMsg.type === 'success' ? 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]' : 'bg-[#D90429]/10 text-[#D90429] border border-[#D90429]'}`}>
                {pwMsg.text}
              </div>
            )}
            <input
              type="password"
              placeholder="Current password"
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
              required
              data-testid="current-password-input"
            />
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
              required
              minLength={6}
              data-testid="new-password-input"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              className="w-full bg-[#FDFBF7] border-b-2 border-[#E8E5DC] px-0 py-2 focus:outline-none focus:border-[#1A3626]"
              required
              minLength={6}
              data-testid="confirm-password-input"
            />
            <Button type="submit" disabled={pwLoading} data-testid="change-password-submit">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>

        {/* Manage Homes */}
        <div className="bg-white border border-[#E8E5DC] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <House size={24} weight="duotone" className="text-[#1A3626]" />
            <h2 className="text-xl font-bold text-[#1A3626] font-heading">My Homes</h2>
          </div>
          {homes.length === 0 ? (
            <p className="text-sm text-[#8F9C93]">You&apos;re not part of any home yet.</p>
          ) : (
            <div className="space-y-4">
              {homes.map((home) => (
                <div key={home.home_id} className="border border-[#E8E5DC] rounded-xl p-4" data-testid={`profile-home-${home.home_id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-[#1A3626]">{home.home_name}</p>
                      <p className="text-xs text-[#8F9C93] font-mono">{home.home_id}</p>
                      <p className="text-xs text-[#4A5D4E] mt-1">
                        {home.is_creator ? 'You are the creator' : 'Member'} • {home.members_count} member{home.members_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {home.is_creator && (
                      <button
                        onClick={() => deleteHome(home.home_id)}
                        className="flex items-center gap-1 text-[#D90429] hover:bg-[#D90429]/10 px-3 py-1.5 rounded-lg text-sm font-medium"
                        data-testid={`delete-home-${home.home_id}`}
                      >
                        <Trash size={16} weight="bold" />
                        Delete Home
                      </button>
                    )}
                  </div>
                  {/* Members */}
                  <div className="border-t border-[#E8E5DC] pt-3 mt-3">
                    <p className="text-xs text-[#8F9C93] uppercase tracking-wider mb-2">Members</p>
                    <div className="space-y-2">
                      {(membersByHome[home.home_id] || []).map((m) => (
                        <div key={m.email} className="flex items-center justify-between bg-[#F4F1EA] rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-[#1A3626]">{m.name || m.email}</p>
                            <p className="text-xs text-[#8F9C93]">{m.email}{m.is_creator ? ' • Creator' : ''}</p>
                          </div>
                          {home.is_creator && !m.is_creator && (
                            <button
                              onClick={() => removeMember(home.home_id, m.email)}
                              className="flex items-center gap-1 text-[#D90429] hover:bg-[#D90429]/10 px-2 py-1 rounded text-xs font-medium"
                              data-testid={`remove-member-${m.email}`}
                            >
                              <UserMinus size={14} weight="bold" />
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
