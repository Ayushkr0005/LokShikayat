import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  ShieldAlert, 
  LogOut,
  Plus,
  Search,
  TrendingUp,
  Users,
  AlertCircle,
  Bell,
  Languages,
  Camera,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  QrCode,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, limit, doc, getDoc, where, setDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { getDashboardInsights } from '../lib/gemini';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const chartData = [
  { name: 'Mon', complaints: 40, resolved: 24 },
  { name: 'Tue', complaints: 30, resolved: 13 },
  { name: 'Wed', complaints: 20, resolved: 98 },
  { name: 'Thu', complaints: 27, resolved: 39 },
  { name: 'Fri', complaints: 18, resolved: 48 },
  { name: 'Sat', complaints: 23, resolved: 38 },
  { name: 'Sun', complaints: 34, resolved: 43 },
];

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showNewComplaint, setShowNewComplaint] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    category: 'Other',
    priority: 'medium'
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          if (userDoc.data().languagePreference) {
            i18n.changeLanguage(userDoc.data().languagePreference);
          }
        } else {
          const defaultProfile = {
            role: 'citizen',
            organizationId: 'org_default',
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName || 'Anonymous Citizen',
            languagePreference: i18n.language,
            createdAt: new Date().toISOString()
          };
          
          try {
            await setDoc(userRef, defaultProfile);
            setUserProfile(defaultProfile);
          } catch (error) {
            console.error("Error creating user profile:", error);
            setUserProfile(defaultProfile);
          }
        }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (complaints.length > 0 && insights.length === 0) {
      getDashboardInsights(complaints).then(setInsights);
    }
  }, [complaints, insights.length]);

  useEffect(() => {
    if (!userProfile) return;

    let q;
    if (userProfile.role === 'citizen') {
      q = query(
        collection(db, 'complaints'), 
        where('authorId', '==', auth.currentUser?.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    } else if (userProfile.role === 'officer') {
      q = query(
        collection(db, 'complaints'), 
        where('organizationId', '==', userProfile.organizationId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComplaints(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    });

    const nq = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser?.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubNotifications = onSnapshot(nq, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubNotifications();
    };
  }, [userProfile]);

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.qrCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUpdateStatus = async (complaintId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await setDoc(doc(db, 'complaints', complaintId), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      if (selectedComplaint?.authorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedComplaint.authorId,
          title: 'Status Updated',
          message: `Your grievance (${selectedComplaint.qrCode}) has been moved to ${newStatus}.`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
      
      setSelectedComplaint((prev: any) => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    } finally {
      setIsUpdating(false);
    }
  };

  const categories = ['All', 'Infrastructure', 'Sanitation', 'Traffic', 'Noise', 'Safety', 'Utilities', 'Environment', 'Other'];

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userProfile) return;

    try {
      const complaintData = {
        ...newComplaint,
        authorId: auth.currentUser.uid,
        organizationId: userProfile.organizationId || 'org_default',
        status: 'submitted',
        createdAt: new Date().toISOString(),
        qrCode: `LS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        sentiment: 0
      };

      await addDoc(collection(db, 'complaints'), complaintData);
      setShowNewComplaint(false);
      setNewComplaint({ title: '', description: '', category: 'Other', priority: 'medium' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'complaints');
    }
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), { languagePreference: newLang }, { merge: true });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-slate-100 text-slate-600';
      case 'in-review': return 'bg-blue-100 text-blue-600';
      case 'in-progress': return 'bg-orange-100 text-orange-600';
      case 'resolved': return 'bg-green-100 text-green-600';
      case 'rejected': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex h-screen bg-bg text-text-main font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-bg flex flex-col shadow-2xl z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg leading-tight text-white tracking-tight">
                {t('app_name').split(' ')[0]} <span className="text-primary">{t('app_name').split(' ')[1]}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Digital Governance</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            <NavItem 
              icon={<LayoutDashboard size={18} />} 
              label={t('dashboard_overview')} 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
            />
            <NavItem 
              icon={<MessageSquare size={18} />} 
              label={t('my_complaints')} 
              active={activeTab === 'complaints'} 
              onClick={() => setActiveTab('complaints')} 
            />
            {userProfile?.role !== 'citizen' && (
              <>
                <NavItem 
                  icon={<BarChart3 size={18} />} 
                  label="Analytics" 
                  active={activeTab === 'analytics'} 
                  onClick={() => setActiveTab('analytics')} 
                />
                <NavItem 
                  icon={<Users size={18} />} 
                  label="Officer Panel" 
                  active={activeTab === 'team'} 
                  onClick={() => setActiveTab('team')} 
                />
              </>
            )}
            <NavItem 
              icon={<Bell size={18} />} 
              label="Notifications" 
              active={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')} 
              badge={notifications.filter(n => !n.read).length}
            />
          </nav>

          {userProfile?.role === 'admin' && (
            <div className="mt-10">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-4">System Admin</h4>
              <nav className="space-y-1.5">
                <NavItem icon={<ShieldAlert size={18} />} label="Security Audit" />
                <NavItem icon={<Settings size={18} />} label="Global Config" />
              </nav>
            </div>
          )}
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all text-sm font-bold group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {t('sign_out')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-bg relative">
        <header className="h-20 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-text-main capitalize tracking-tight">{t(activeTab === 'overview' ? 'dashboard_overview' : activeTab)}</h2>
              <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                <span>{t('app_name')}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="text-primary">{userProfile?.role}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-primary hover:text-primary transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Languages size={14} />
              {i18n.language === 'en' ? 'हिंदी' : 'English'}
            </button>

            <div className="h-8 w-px bg-border mx-2" />

            {userProfile && (
              <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                userProfile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                userProfile.role === 'officer' ? 'bg-blue-100 text-blue-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {userProfile.role}
              </div>
            )}
            
            <div className="relative group">
              <div className="w-10 h-10 bg-slate-100 rounded-xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center font-bold text-primary group-hover:border-primary transition-all cursor-pointer">
                {auth.currentUser?.displayName?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-text-main mb-2">
                {userProfile?.role === 'citizen' ? t('citizen_portal') : 
                 userProfile?.role === 'officer' ? t('officer_dashboard') : 
                 t('admin_console')}
              </h1>
              <p className="text-sm text-text-muted font-medium">
                {userProfile?.role === 'citizen' ? t('login_subtitle') : 
                 userProfile?.role === 'officer' ? 'Manage and resolve citizen grievances efficiently.' : 
                 'System-wide intelligence and administrative oversight.'}
              </p>
            </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder={t('search_placeholder')} 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-white border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 w-72 transition-all shadow-sm"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                  <select 
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-white border border-border rounded-xl py-2.5 pl-10 pr-8 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm appearance-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {(userProfile?.role === 'citizen' || userProfile?.role === 'admin') && (
                <button 
                  onClick={() => setShowNewComplaint(true)}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5"
                >
                  <Plus size={18} />
                  {t('new_case')}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* AI Insights */}
                <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 rounded-2xl p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp size={120} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <TrendingUp className="text-primary w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em]">{t('ai_insights')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    {insights.length > 0 ? insights.map((insight, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-white shadow-sm text-sm text-text-main font-medium leading-relaxed"
                      >
                        {insight}
                      </motion.div>
                    )) : (
                      <div className="col-span-3 text-center py-8 text-text-muted text-sm font-bold italic bg-white/40 rounded-2xl border border-dashed border-primary/20">
                        {loading ? "Initializing neural patterns..." : "Generating real-time intelligence..."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    label={userProfile?.role === 'citizen' ? t('my_complaints') : "Total Grievances"} 
                    value={userProfile?.role === 'citizen' ? complaints.length.toString() : "4,829"} 
                    trend="+12%" 
                    icon={<MessageSquare className="text-primary" />} 
                  />
                  <StatCard label="Resolution Rate" value="89.4%" trend="+3.1%" icon={<CheckCircle2 className="text-emerald-500" />} />
                  <StatCard label="Avg. Response" value="4.2h" trend="-18%" icon={<Clock className="text-amber-500" />} />
                  {userProfile?.role !== 'citizen' && (
                    <StatCard label="Citizen Satisfaction" value="4.8/5" trend="+0.2" icon={<TrendingUp className="text-indigo-500" />} />
                  )}
                  {userProfile?.role === 'citizen' && (
                    <StatCard label="Active Cases" value={complaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length.toString()} trend="0" icon={<AlertCircle className="text-orange-500" />} />
                  )}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em]">Complaint Volume</h3>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Feed</span>
                      </div>
                    </div>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="complaints" stroke="#2563eb" fillOpacity={1} fill="url(#colorComplaints)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em]">Category Distribution</h3>
                      <Filter className="text-slate-400 w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
                    </div>
                    <div className="h-[320px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Infrastructure', value: 400 },
                              { name: 'Sanitation', value: 300 },
                              { name: 'Safety', value: 300 },
                              { name: 'Other', value: 200 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {COLORS.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Complaints Table */}
                <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-border flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em]">{t('recent_events')}</h3>
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All Records</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-border bg-slate-50/30">
                          <th className="px-8 py-4 font-black">Tracking ID / Title</th>
                          <th className="px-8 py-4 font-black">Category</th>
                          <th className="px-8 py-4 font-black">Status</th>
                          <th className="px-8 py-4 font-black text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loading ? (
                          <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold italic">Synchronizing with central database...</td></tr>
                        ) : filteredComplaints.length === 0 ? (
                          <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold italic">No active grievances found matching your criteria.</td></tr>
                        ) : filteredComplaints.map((c) => (
                          <tr 
                            key={c.id} 
                            onClick={() => setSelectedComplaint(c)}
                            className="hover:bg-slate-50 transition-all cursor-pointer group"
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                                  <QrCode size={20} className="text-slate-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                  <div className="font-black text-xs text-text-main uppercase tracking-tight">{c.qrCode || 'LS-PENDING'}</div>
                                  <div className="text-[11px] text-text-muted font-medium mt-0.5 line-clamp-1">{c.title}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{c.category}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(c.status)}`}>
                                {t(`status_${c.status.replace('-', '_')}`)}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <span className="text-[10px] font-black uppercase tracking-widest">Details</span>
                                <ChevronRight size={14} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto space-y-4"
              >
                <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-text-main uppercase tracking-[0.2em]">Notification Center</h3>
                    <button className="text-[10px] font-black text-primary uppercase tracking-widest">Mark all as read</button>
                  </div>
                  <div className="divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-bold italic">
                        No new alerts at this time.
                      </div>
                    ) : notifications.map((n) => (
                      <div key={n.id} className={`p-6 hover:bg-slate-50 transition-colors flex gap-4 ${!n.read ? 'bg-primary/5' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                          n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Bell size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-text-main mb-1">{n.title}</div>
                          <p className="text-xs text-text-muted leading-relaxed mb-2">{n.message}</p>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-sm font-black text-text-main uppercase tracking-[0.2em] mb-6">Resolution Quality Index</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Resolved Early', value: 45 },
                              { name: 'Resolved on time', value: 35 },
                              { name: 'Late', value: 20 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {COLORS.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-sm font-black text-text-main uppercase tracking-[0.2em] mb-6">Regional Distribution</h3>
                    <div className="space-y-4">
                      {[
                        { region: 'North Sector', count: 120, trend: '+12%' },
                        { region: 'South Sector', count: 85, trend: '-5%' },
                        { region: 'East Sector', count: 142, trend: '+20%' },
                        { region: 'West Sector', count: 64, trend: '+2%' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <div className="font-bold text-sm text-text-main">{item.region}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.count} Active Grievances</div>
                          </div>
                          <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${item.trend.startsWith('+') ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {item.trend}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'team' && (
              <motion.div 
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm"
              >
                <div className="p-8 border-b border-border bg-slate-50/50">
                  <h3 className="text-sm font-black text-text-main uppercase tracking-[0.2em]">Active Duty Officers</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { name: 'Officer Rajesh Kumar', role: 'Chief Investigator', cases: 24, status: 'Active' },
                    { name: 'Officer Amit Singh', role: 'Field Inspector', cases: 18, status: 'On Field' },
                    { name: 'Officer Priya Sharma', role: 'Documentation Officer', cases: 32, status: 'Active' },
                    { name: 'Officer Vikas Mishra', role: 'Resolution Lead', cases: 15, status: 'Busy' },
                  ].map((officer, i) => (
                    <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-primary">
                          {officer.name[8]}
                        </div>
                        <div>
                          <div className="font-black text-sm text-text-main">{officer.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{officer.role}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm text-text-main">{officer.cases} Cases</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${
                          officer.status === 'Active' ? 'text-emerald-500' : 
                          officer.status === 'On Field' ? 'text-blue-500' : 'text-amber-500'
                        }`}>{officer.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* New Complaint Modal */}
      <AnimatePresence>
        {showNewComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewComplaint(false)}
              className="absolute inset-0 bg-sidebar-bg/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-border bg-slate-50/50">
                <h2 className="text-2xl font-black tracking-tight text-text-main">{t('new_case')}</h2>
                <p className="text-sm text-text-muted font-medium">Submit a new grievance for official redressal.</p>
              </div>
              <form onSubmit={handleCreateComplaint} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Complaint Title</label>
                  <input 
                    required
                    value={newComplaint.title}
                    onChange={e => setNewComplaint({...newComplaint, title: e.target.value})}
                    placeholder="Brief summary of the issue..."
                    className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                    <select 
                      value={newComplaint.category}
                      onChange={e => setNewComplaint({...newComplaint, category: e.target.value})}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                    >
                      {['Infrastructure', 'Sanitation', 'Traffic', 'Noise', 'Safety', 'Utilities', 'Environment', 'Other'].map(c => (
                        <option key={c} value={c}>{t(`category_${c.toLowerCase()}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority</label>
                    <select 
                      value={newComplaint.priority}
                      onChange={e => setNewComplaint({...newComplaint, priority: e.target.value})}
                      className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                    >
                      {['low', 'medium', 'high', 'critical'].map(p => (
                        <option key={p} value={p}>{t(`priority_${p}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                  <textarea 
                    required
                    rows={4}
                    value={newComplaint.description}
                    onChange={e => setNewComplaint({...newComplaint, description: e.target.value})}
                    placeholder="Provide detailed information about the grievance..."
                    className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-4 py-2">
                  <button type="button" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                    <Camera size={16} />
                    Attach Media
                  </button>
                  <button type="button" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                    <MapPin size={16} />
                    Tag Location
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewComplaint(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-primary text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                  >
                    Submit Grievance
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complaint Details Modal */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedComplaint(null)}
              className="absolute inset-0 bg-sidebar-bg/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-border bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-text-main">Grievance Details</h2>
                  <p className="text-sm text-text-muted font-medium">Tracking ID: {selectedComplaint.qrCode}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${getStatusColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </div>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="flex gap-8">
                  <div className="flex-1 space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Title</label>
                      <div className="text-lg font-bold text-text-main">{selectedComplaint.title}</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Description</label>
                      <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Category</label>
                        <div className="text-sm font-bold text-text-main">{selectedComplaint.category}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Priority</label>
                        <div className={`text-sm font-bold capitalize ${
                          selectedComplaint.priority === 'critical' ? 'text-red-500' :
                          selectedComplaint.priority === 'high' ? 'text-orange-500' :
                          'text-text-main'
                        }`}>{selectedComplaint.priority}</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-48 space-y-6 text-center">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-border inline-block">
                      <QRCodeCanvas value={selectedComplaint.qrCode} size={140} />
                    </div>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Share QR for Quick Tracking</p>
                  </div>
                </div>

                {userProfile?.role !== 'citizen' && (
                  <div className="pt-6 border-t border-border">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Official Action: Update Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['submitted', 'in-review', 'in-progress', 'resolved', 'rejected'].map((status) => (
                        <button
                          key={status}
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(selectedComplaint.id, status)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                            selectedComplaint.status === status 
                              ? 'bg-primary border-primary text-white scale-105' 
                              : 'border-slate-100 text-slate-500 hover:border-primary/20 bg-slate-50'
                          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-border flex justify-end items-center gap-4">
                <div className="mr-auto text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Submitted on {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                </div>
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="bg-white border border-border px-8 py-2.5 rounded-xl text-sm font-black text-text-main hover:bg-slate-50 transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 w-full rounded-xl transition-all text-sm font-bold group ${
        active 
          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`${active ? 'text-white' : 'group-hover:text-primary'} transition-colors`}>
          {icon}
        </div>
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: React.ReactNode }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-white border border-border p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:shadow-md transition-all">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
          {trend}
        </div>
      </div>
      <div className="text-3xl font-black text-text-main tracking-tight mb-1 relative z-10">{value}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black relative z-10">{label}</div>
    </div>
  );
}
