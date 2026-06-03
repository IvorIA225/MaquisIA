import { useState, useEffect } from 'react'
import './index.css'
import Login from './components/Login'

// Icons
const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
);

const OrdersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);

const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

const RobotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
);

const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';

function App() {
  const [token, setToken] = useState(localStorage.getItem('maquis_token') || '');
  const [restaurantName, setRestaurantName] = useState(localStorage.getItem('maquis_name') || 'Mon Maquis');
  const [whatsappPhone, setWhatsappPhone] = useState(localStorage.getItem('maquis_whatsapp') || '');
  
  const [stats, setStats] = useState({
    daily_sales: 0,
    daily_orders: 0,
    pending_whatsapp_orders: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  
  // États de navigation
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // États WhatsApp QR Code
  const [restaurantId, setRestaurantId] = useState(1); // À récupérer via l'API en prod
  const [waStatus, setWaStatus] = useState('DISCONNECTED');
  const [waQr, setWaQr] = useState(null);
  
  // États pour l'onglet Commandes WhatsApp
  const [allOrders, setAllOrders] = useState([]);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersFilter, setOrdersFilter] = useState('Tous');
  
  // États pour l'onglet Comptabilité
  const [transactions, setTransactions] = useState([]);
  const [accountingSummary, setAccountingSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    profit_margin: 0
  });
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('Tous');
  
  // États pour l'onglet Assistant IA
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Salut Patron ! C'est MaquisIA, ton expert comptable virtuel 🤖. 

Je suis connecté en direct aux ventes, aux dépenses et aux commandes de ton restaurant **${restaurantName || 'Mon Maquis'}**. 

Pose-moi toutes tes questions ou clique sur l'une des suggestions rapides ci-dessous. On est ensemble ! 🇨🇮`
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // États pour la création de transaction (Modal)
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('income'); // 'income' ou 'expense'
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // États pour le Simulateur de Message WhatsApp (Modal)
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simulatedMessage, setSimulatedMessage] = useState('');
  const [simulatedSenderPhone, setSimulatedSenderPhone] = useState('+2250708091011');
  const [simulatorError, setSimulatorError] = useState('');
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorSuccess, setSimulatorSuccess] = useState('');

  const handleLoginSuccess = (userToken, name, phone) => {
    setToken(userToken);
    setRestaurantName(name);
    setWhatsappPhone(phone);
  };

  const handleLogout = () => {
    localStorage.removeItem('maquis_token');
    localStorage.removeItem('maquis_name');
    localStorage.removeItem('maquis_whatsapp');
    setToken('');
    setRestaurantName('Mon Maquis');
    setWhatsappPhone('');
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      // 1. Dashboard stats
      const statsResponse = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.status === 401) {
        handleLogout();
        return;
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData);

      // 2. Recent orders
      const ordersResponse = await fetch(`${API_BASE_URL}/api/orders/recent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (ordersResponse.status === 401) {
        handleLogout();
        return;
      }

      const ordersData = await ordersResponse.json();
      setRecentOrders(ordersData);

      // 3. All orders for the dedicated view
      const allOrdersResponse = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (allOrdersResponse.ok) {
        const allOrdersData = await allOrdersResponse.json();
        setAllOrders(allOrdersData);
      }

      // 4. All transactions for accounting ledger
      const txResponse = await fetch(`${API_BASE_URL}/api/accounting/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (txResponse.ok) {
        const txData = await txResponse.json();
        setTransactions(txData);
      }

      // 5. Financial accounting summary
      const summaryResponse = await fetch(`${API_BASE_URL}/api/accounting/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setAccountingSummary(summaryData);
      }

    } catch (error) {
      console.error("Erreur de connexion au backend:", error);
    }
  };

  const fetchWhatsAppStatus = async () => {
    if (!token) return;
    try {
      const waServiceUrl = import.meta.env.DEV ? 'http://127.0.0.1:3001' : ''; // En prod, URL du service Node
      const response = await fetch(`${waServiceUrl}/api/whatsapp/session/${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setWaStatus(data.status);
        setWaQr(data.qr);
      }
    } catch (err) {
      console.log("Service WhatsApp non joignable");
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      fetchWhatsAppStatus();
      const interval = setInterval(() => {
        fetchData();
        if (currentTab === 'whatsapp') {
          fetchWhatsAppStatus();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token, currentTab, restaurantId]);

  // Ajouter une transaction comptable en base de données
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    if (!transactionAmount || isNaN(transactionAmount) || parseFloat(transactionAmount) <= 0) {
      setModalError('Veuillez entrer un montant valide supérieur à 0.');
      setModalLoading(false);
      return;
    }

    if (!transactionDescription.trim()) {
      setModalError('Veuillez entrer une désignation (description).');
      setModalLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/transaction?amount=${transactionAmount}&type=${transactionType}&description=${encodeURIComponent(transactionDescription)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Une erreur est survenue lors de l'enregistrement de la transaction.");
      }

      fetchData();
      setTransactionAmount('');
      setTransactionDescription('');
      setShowTransactionModal(false);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Mettre à jour le statut d'une commande WhatsApp
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status?status=${newStatus}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Erreur de mise à jour du statut.");
      }
      
      // Rafraîchir les statistiques et les commandes
      fetchData();
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'état :", error);
    }
  };

  // Simuler l'envoi d'un message WhatsApp client
  const handleSimulateWhatsApp = async (e) => {
    e.preventDefault();
    setSimulatorError('');
    setSimulatorSuccess('');
    setSimulatorLoading(true);

    if (!simulatedMessage.trim()) {
      setSimulatorError('Veuillez entrer un message de simulation.');
      setSimulatorLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/whatsapp/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: simulatedMessage,
          phone: simulatedSenderPhone,
          receiver_phone: whatsappPhone || "default_whatsapp_phone"
        })
      });

      if (!response.ok) {
        throw new Error("Erreur de communication avec le webhook.");
      }

      setSimulatorSuccess("Message reçu par l'IA ! L'analyse est en cours en arrière-plan...");
      setSimulatedMessage('');
      
      // Rafraîchir les données après 2 secondes
      setTimeout(() => {
        fetchData();
        setShowSimulatorModal(false);
        setSimulatorSuccess('');
      }, 2000);

    } catch (err) {
      setSimulatorError(err.message);
    } finally {
      setSimulatorLoading(false);
    }
  };

  // Envoyer un message à l'assistant IA
  const handleSendChatMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    // Ajouter le message de l'utilisateur au fil de discussion
    const newMessages = [...messages, { sender: 'user', text: text }];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: text })
      });

      if (!response.ok) {
        throw new Error("Une erreur est survenue lors de la communication avec l'assistant.");
      }

      const data = await response.json();
      setMessages([...newMessages, { sender: 'bot', text: data.response }]);
    } catch (err) {
      setMessages([...newMessages, { sender: 'bot', text: "Aïe patron, j'ai eu un petit souci de réseau. Tu peux répéter ta question ?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Si l'utilisateur n'est pas connecté, afficher l'écran Login
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex animate-fade-in" style={{ minHeight: '100vh', width: '100vw' }}>
      {/* Sidebar */}
      <aside className="glass flex-col" style={{ width: '280px', margin: '1rem', padding: '2rem 1.5rem', position: 'sticky', top: '1rem', height: 'calc(100vh - 2rem)' }}>
        <div className="flex items-center gap-4" style={{ marginBottom: '3rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
            IA
          </div>
          <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>{restaurantName}</h2>
        </div>

        <nav className="flex-col gap-2">
          <button 
            onClick={() => setCurrentTab('dashboard')} 
            className="btn btn-glass" 
            style={{ 
              justifyContent: 'flex-start', 
              border: currentTab === 'dashboard' ? '1px solid var(--primary)' : 'none', 
              background: currentTab === 'dashboard' ? 'rgba(255, 123, 0, 0.1)' : 'transparent',
              width: '100%'
            }}
          >
            <DashboardIcon />
            Tableau de bord
          </button>
          <button 
            onClick={() => setCurrentTab('orders')} 
            className="btn btn-glass" 
            style={{ 
              justifyContent: 'flex-start', 
              border: currentTab === 'orders' ? '1px solid var(--primary)' : 'none', 
              background: currentTab === 'orders' ? 'rgba(255, 123, 0, 0.1)' : 'transparent',
              width: '100%'
            }}
          >
            <OrdersIcon />
            Commandes WhatsApp
          </button>
          <button 
            onClick={() => setCurrentTab('accounting')} 
            className="btn btn-glass" 
            style={{ 
              justifyContent: 'flex-start', 
              border: currentTab === 'accounting' ? '1px solid var(--primary)' : 'none', 
              background: currentTab === 'accounting' ? 'rgba(255, 123, 0, 0.1)' : 'transparent',
              width: '100%'
            }}
          >
            <WalletIcon />
            Comptabilité
          </button>
          <button 
            onClick={() => setCurrentTab('ai_agent')} 
            className="btn btn-glass" 
            style={{ 
              justifyContent: 'flex-start', 
              border: currentTab === 'ai_agent' ? '1px solid var(--primary)' : 'none', 
              background: currentTab === 'ai_agent' ? 'rgba(255, 123, 0, 0.1)' : 'transparent',
              width: '100%'
            }}
          >
            <RobotIcon />
            Assistant IA 🤖
          </button>
          <button 
            onClick={() => setCurrentTab('whatsapp')} 
            className="btn btn-glass" 
            style={{ 
              justifyContent: 'flex-start', 
              border: currentTab === 'whatsapp' ? '1px solid var(--success)' : 'none', 
              background: currentTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              width: '100%'
            }}
          >
            <PhoneIcon />
            Scanner WhatsApp
          </button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => setShowSimulatorModal(true)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
            💬 Simuler Client WhatsApp
          </button>

          <button onClick={handleLogout} className="btn btn-glass" style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
            <LogoutIcon />
            Se Déconnecter
          </button>
          
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Statut WhatsApp</p>
            <div className={`badge ${waStatus === 'CONNECTED' ? 'badge-success' : 'badge-warning'}`}>
              {waStatus === 'CONNECTED' ? 'Connecté' : waStatus}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-col" style={{ flex: 1, padding: '1rem 2rem 1rem 0' }}>
        
        {/* Header */}
        <header className="flex justify-between items-center glass" style={{ padding: '1rem 2rem', marginBottom: '2rem', borderRadius: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>
              {currentTab === 'dashboard' && 'Bonjour, Patron 👋'}
              {currentTab === 'orders' && 'Commandes WhatsApp & Sur Place 🛵'}
              {currentTab === 'accounting' && 'Comptabilité & Grand Livre 📊'}
              {currentTab === 'ai_agent' && 'Assistant IA Comptable & Conseil 🤖'}
              {currentTab === 'whatsapp' && 'Connexion WhatsApp (QR Code) 📱'}
            </h1>
            <p className="text-muted">
              {currentTab === 'dashboard' && `Résumé de votre journée pour ${restaurantName}.`}
              {currentTab === 'orders' && `Gérez et suivez le statut de toutes vos commandes pour ${restaurantName}.`}
              {currentTab === 'accounting' && `Suivi de la performance financière globale de ${restaurantName}.`}
              {currentTab === 'ai_agent' && `Posez vos questions comptables et obtenez des analyses en temps réel sur ${restaurantName}.`}
              {currentTab === 'whatsapp' && `Scannez ce QR Code avec votre téléphone WhatsApp Business.`}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-glass" onClick={() => { setTransactionType('expense'); setShowTransactionModal(true); }}>
              + Nouvelle Dépense
            </button>
            <button className="btn btn-primary" onClick={() => { setTransactionType('income'); setShowTransactionModal(true); }}>
              + Nouvelle Vente
            </button>
          </div>
        </header>

        {/* ----------------- DASHBOARD VIEW ----------------- */}
        {currentTab === 'dashboard' && (
          <div className="animate-fade-in flex-col" style={{ width: '100%' }}>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Chiffre d'Affaires (Aujourd'hui)</h3>
                <div className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {stats.daily_sales.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Commandes Validées</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {stats.daily_orders}
                </div>
              </div>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s', border: '1px solid rgba(255, 123, 0, 0.3)' }}>
                <h3 className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Commandes WhatsApp en attente</h3>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {stats.pending_whatsapp_orders}
                  </span>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={fetchData}>Rafraîrir</button>
                </div>
              </div>
            </div>

            {/* Recent Orders Section */}
            <h2 style={{ marginBottom: '1rem' }}>Commandes Récentes & Actions rapides</h2>
            <div className="glass" style={{ overflow: 'hidden', borderRadius: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Heure</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Client</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Plats / Boissons</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Montant</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Statut</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>{order.time}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{order.customer}</td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{order.items}</td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{order.amount.toLocaleString('fr-FR')} F</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span className={`badge ${order.status === 'Nouveau' ? 'badge-danger' : order.status === 'Livré' ? 'badge-success' : 'badge-warning'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 1.5rem' }}>
                          {order.status === 'Nouveau' && (
                            <button className="btn btn-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary-light)' }} onClick={() => handleUpdateOrderStatus(order.id, 'En préparation')}>
                              👨‍🍳 Préparer
                            </button>
                          )}
                          {order.status === 'En préparation' && (
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#f59e0b', border: 'none', boxShadow: 'none' }} onClick={() => handleUpdateOrderStatus(order.id, 'Prêt')}>
                              ✅ Prêt
                            </button>
                          )}
                          {order.status === 'Prêt' && (
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#10b981', border: 'none', boxShadow: 'none' }} onClick={() => handleUpdateOrderStatus(order.id, 'Livré')}>
                              🛵 Livrer & Encaisser
                            </button>
                          )}
                          {order.status === 'Livré' && (
                            <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: '500' }}>💸 Encaissé & Comptabilisé</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aucune commande récente. Configurez vos ventes pour commencer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- ORDERS VIEW ----------------- */}
        {currentTab === 'orders' && (
          <div className="animate-fade-in flex-col" style={{ width: '100%' }}>
            {/* Search & Filter Controls */}
            <div className="glass-card flex items-center justify-between gap-4" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <input 
                type="text"
                placeholder="🔍 Rechercher par plat ou par client..."
                value={ordersSearch}
                onChange={(e) => setOrdersSearch(e.target.value)}
                style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0.5rem', 
                  border: '1px solid var(--surface-border)', 
                  background: 'rgba(255,255,255,0.03)', 
                  color: 'white', 
                  outline: 'none',
                  width: '300px'
                }}
              />
              <div className="flex gap-2">
                {['Tous', 'Nouveau', 'En préparation', 'Prêt', 'Livré'].map((statusOption) => (
                  <button 
                    key={statusOption}
                    onClick={() => setOrdersFilter(statusOption)}
                    className="btn btn-glass"
                    style={{ 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.85rem',
                      borderColor: ordersFilter === statusOption ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      background: ordersFilter === statusOption ? 'rgba(255, 123, 0, 0.1)' : 'rgba(255,255,255,0.05)'
                    }}
                  >
                    {statusOption}
                  </button>
                ))}
              </div>
            </div>

            {/* All Orders Table */}
            <div className="glass" style={{ overflow: 'hidden', borderRadius: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>ID</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Heure</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Client</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Canal</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Plats / Boissons</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Montant</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Statut</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders
                    .filter(order => {
                      const matchesSearch = 
                        order.customer.toLowerCase().includes(ordersSearch.toLowerCase()) ||
                        (order.customer_phone && order.customer_phone.includes(ordersSearch)) ||
                        order.items.toLowerCase().includes(ordersSearch.toLowerCase());
                      const matchesFilter = ordersFilter === 'Tous' || order.status === ordersFilter;
                      return matchesSearch && matchesFilter;
                    })
                    .length > 0 ? (
                    allOrders
                      .filter(order => {
                        const matchesSearch = 
                          order.customer.toLowerCase().includes(ordersSearch.toLowerCase()) ||
                          (order.customer_phone && order.customer_phone.includes(ordersSearch)) ||
                          order.items.toLowerCase().includes(ordersSearch.toLowerCase());
                        const matchesFilter = ordersFilter === 'Tous' || order.status === ordersFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((order) => (
                        <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>#{order.id}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>{order.time}</td>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>
                            {order.customer}
                            {order.customer_phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{order.customer_phone}</div>}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span className={`badge ${order.source === 'whatsapp' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                              {order.source === 'whatsapp' ? '💬 WhatsApp' : '🏠 Sur place'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{order.items}</td>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{order.amount.toLocaleString('fr-FR')} F</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span className={`badge ${order.status === 'Nouveau' ? 'badge-danger' : order.status === 'Livré' ? 'badge-success' : 'badge-warning'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 1.5rem' }}>
                            {order.status === 'Nouveau' && (
                              <button className="btn btn-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary-light)' }} onClick={() => handleUpdateOrderStatus(order.id, 'En préparation')}>
                                👨‍🍳 Préparer
                              </button>
                            )}
                            {order.status === 'En préparation' && (
                              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#f59e0b', border: 'none', boxShadow: 'none' }} onClick={() => handleUpdateOrderStatus(order.id, 'Prêt')}>
                                ✅ Prêt
                              </button>
                            )}
                            {order.status === 'Prêt' && (
                              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#10b981', border: 'none', boxShadow: 'none' }} onClick={() => handleUpdateOrderStatus(order.id, 'Livré')}>
                                🛵 Livrer & Encaisser
                              </button>
                            )}
                            {order.status === 'Livré' && (
                              <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: '500' }}>💸 Encaissé & Comptabilisé</span>
                            )}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aucune commande ne correspond aux critères.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- ACCOUNTING VIEW ----------------- */}
        {currentTab === 'accounting' && (
          <div className="animate-fade-in flex-col" style={{ width: '100%' }}>
            {/* Financial Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s', borderLeft: '4px solid var(--success)' }}>
                <h3 className="text-muted" style={{ fontSize: '1.0rem', marginBottom: '0.5rem' }}>Chiffre d'Affaires Cumulé</h3>
                <div style={{ fontSize: '2.0rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  {accountingSummary.total_income.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.2s', borderLeft: '4px solid var(--danger)' }}>
                <h3 className="text-muted" style={{ fontSize: '1.0rem', marginBottom: '0.5rem' }}>Total des Dépenses</h3>
                <div style={{ fontSize: '2.0rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                  {accountingSummary.total_expense.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s', borderLeft: '4px solid var(--primary)', background: 'rgba(255, 123, 0, 0.05)' }}>
                <h3 className="text-muted" style={{ fontSize: '1.0rem', marginBottom: '0.5rem' }}>Bénéfice Net</h3>
                <div style={{ fontSize: '2.0rem', fontWeight: 'bold', color: accountingSummary.net_profit >= 0 ? '#10b981' : 'var(--danger)' }}>
                  {accountingSummary.net_profit.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div className="glass-card animate-fade-in" style={{ animationDelay: '0.4s', borderLeft: '4px solid #a855f7' }}>
                <h3 className="text-muted" style={{ fontSize: '1.0rem', marginBottom: '0.5rem' }}>Marge Bénéficiaire</h3>
                <div style={{ fontSize: '2.0rem', fontWeight: 'bold', color: '#a855f7' }}>
                  {accountingSummary.profit_margin}%
                </div>
              </div>
            </div>

            {/* Grand Livre Search & Filter */}
            <div className="glass-card flex items-center justify-between gap-4" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <input 
                type="text"
                placeholder="🔍 Filtrer les transactions..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0.5rem', 
                  border: '1px solid var(--surface-border)', 
                  background: 'rgba(255,255,255,0.03)', 
                  color: 'white', 
                  outline: 'none',
                  width: '300px'
                }}
              />
              <div className="flex gap-2">
                {['Tous', 'Ventes', 'Dépenses'].map((txOption) => (
                  <button 
                    key={txOption}
                    onClick={() => setTxFilter(txOption)}
                    className="btn btn-glass"
                    style={{ 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.85rem',
                      borderColor: txFilter === txOption ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      background: txFilter === txOption ? 'rgba(255, 123, 0, 0.1)' : 'rgba(255,255,255,0.05)'
                    }}
                  >
                    {txOption}
                  </button>
                ))}
              </div>
            </div>

            {/* Ledger */}
            <h2 style={{ marginBottom: '1rem' }}>Le Grand Livre Comptable</h2>
            <div className="glass" style={{ overflow: 'hidden', borderRadius: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Date</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Type</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Désignation / Description</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Montant</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Réf. Commande</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter(tx => {
                      const matchesSearch = tx.description.toLowerCase().includes(txSearch.toLowerCase());
                      const matchesFilter = 
                        txFilter === 'Tous' ||
                        (txFilter === 'Ventes' && tx.type === 'income') ||
                        (txFilter === 'Dépenses' && tx.type === 'expense');
                      return matchesSearch && matchesFilter;
                    })
                    .length > 0 ? (
                    transactions
                      .filter(tx => {
                        const matchesSearch = tx.description.toLowerCase().includes(txSearch.toLowerCase());
                        const matchesFilter = 
                          txFilter === 'Tous' ||
                          (txFilter === 'Ventes' && tx.type === 'income') ||
                          (txFilter === 'Dépenses' && tx.type === 'expense');
                        return matchesSearch && matchesFilter;
                      })
                      .map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>{tx.time}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span className={`badge ${tx.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                              {tx.type === 'income' ? '📈 VENTE' : '📉 DÉPENSE'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{tx.description}</td>
                          <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                            {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                            {tx.order_id ? `#${tx.order_id}` : 'Manuel'}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Aucune transaction comptabilisée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- AI AGENT VIEW ----------------- */}
        {currentTab === 'ai_agent' && (
          <div className="animate-fade-in flex-col" style={{ width: '100%', height: 'calc(100vh - 12rem)', display: 'flex', flexDirection: 'column' }}>
            {/* Conversation Window */}
            <div className="glass flex-col" style={{ flex: 1, padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem', overflowY: 'auto', display: 'flex', gap: '1rem', minHeight: '300px' }}>
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ width: '100%' }}
                >
                  <div 
                    className="glass-card" 
                    style={{ 
                      maxWidth: '70%', 
                      padding: '1rem', 
                      borderRadius: msg.sender === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                      background: msg.sender === 'user' ? 'linear-gradient(135deg, rgba(255,123,0,0.15), rgba(255,123,0,0.05))' : 'rgba(255,255,255,0.03)',
                      border: msg.sender === 'user' ? '1px solid rgba(255,123,0,0.3)' : '1px solid var(--surface-border)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start" style={{ width: '100%' }}>
                  <div 
                    className="glass-card" 
                    style={{ 
                      maxWidth: '70%', 
                      padding: '1rem', 
                      borderRadius: '1rem 1rem 1rem 0',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic'
                    }}
                  >
                    💬 MaquisIA est en train d'analyser vos comptes...
                  </div>
                </div>
              )}
            </div>

            {/* Quick suggestions */}
            <div className="flex gap-2" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleSendChatMessage("Fais-moi un résumé de ma journée")} 
                className="btn btn-glass" 
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '2rem' }}
                disabled={chatLoading}
              >
                📊 Résumé de la journée
              </button>
              <button 
                onClick={() => handleSendChatMessage("Où s'en va mon argent (mes plus grosses dépenses) ?")} 
                className="btn btn-glass" 
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '2rem' }}
                disabled={chatLoading}
              >
                💸 Analyse des dépenses
              </button>
              <button 
                onClick={() => handleSendChatMessage("Quel est mon bénéfice net actuel et ma marge ?")} 
                className="btn btn-glass" 
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '2rem' }}
                disabled={chatLoading}
              >
                📈 Point sur le bénéfice & marge
              </button>
            </div>

            {/* Input form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} 
              className="flex gap-3" 
              style={{ width: '100%' }}
            >
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Posez une question sur vos ventes, dépenses, bénéfices... (ex: 'Combien ai-je vendu aujourd'hui ?')"
                style={{ 
                  flex: 1, 
                  padding: '1rem', 
                  borderRadius: '0.75rem', 
                  border: '1px solid var(--surface-border)', 
                  background: 'var(--surface)', 
                  color: 'white', 
                  outline: 'none',
                  fontSize: '1rem'
                }}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ borderRadius: '0.75rem', padding: '0 2rem' }}
                disabled={chatLoading}
              >
                {chatLoading ? "Analyse..." : "Demander"}
              </button>
            </form>
          </div>
        )}

        {/* ----------------- WHATSAPP CONNECTION VIEW ----------------- */}
        {currentTab === 'whatsapp' && (
          <div className="animate-fade-in flex-col items-center" style={{ width: '100%', marginTop: '2rem' }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '1rem' }}>Lier votre compte WhatsApp</h2>
              
              {waStatus === 'CONNECTED' ? (
                <div>
                  <div style={{ width: '80px', height: '80px', background: 'var(--success)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h3 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Connecté avec succès !</h3>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>L'IA est désormais branchée sur votre numéro et écoute les messages entrants de vos clients.</p>
                  
                  <button onClick={async () => {
                    const waServiceUrl = import.meta.env.DEV ? 'http://127.0.0.1:3001' : '';
                    await fetch(`${waServiceUrl}/api/whatsapp/session/${restaurantId}`, { method: 'DELETE' });
                    setWaStatus('DISCONNECTED');
                  }} className="btn btn-glass" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', margin: '0 auto' }}>
                    Déconnecter le téléphone
                  </button>
                </div>
              ) : waQr ? (
                <div>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>Ouvrez WhatsApp sur votre téléphone &gt; Appareils Connectés &gt; Lier un appareil, puis scannez ce QR Code.</p>
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '2rem' }}>
                    <img src={waQr} alt="WhatsApp QR Code" style={{ width: '256px', height: '256px' }} />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>Génération du QR Code en cours...</p>
                  <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>


      {/* Modal d'ajout de transaction comptable */}
      {showTransactionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>
              {transactionType === 'income' ? '➕ Enregistrer une Vente' : '➖ Enregistrer une Dépense'}
            </h2>

            {modalError && (
              <div className="badge badge-danger" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="flex-col gap-4">
              <div className="flex-col gap-2">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Montant (FCFA)</label>
                <input 
                  type="number" 
                  value={transactionAmount} 
                  onChange={(e) => setTransactionAmount(e.target.value)} 
                  required 
                  placeholder="ex: 15000"
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
                />
              </div>

              <div className="flex-col gap-2" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Désignation (Description)</label>
                <input 
                  type="text" 
                  value={transactionDescription} 
                  onChange={(e) => setTransactionDescription(e.target.value)} 
                  required 
                  placeholder={transactionType === 'income' ? 'ex: Vente Table 4' : 'ex: Achat de poissons au marché'}
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
                />
              </div>

              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-glass" onClick={() => setShowTransactionModal(false)} disabled={modalLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? "Enregistrement..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simulateur WhatsApp Client */}
      {showSimulatorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 className="text-gradient" style={{ marginBottom: '0.5rem' }}>
              💬 Simulateur Message Client (WhatsApp)
            </h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Simulez un message envoyé par un client sur WhatsApp. L'IA Gemini va analyser le texte, comprendre s'il s'agit d'une commande, lister les plats et estimer le montant automatiquement !
            </p>

            {simulatorError && (
              <div className="badge badge-danger" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                {simulatorError}
              </div>
            )}

            {simulatorSuccess && (
              <div className="badge badge-success" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                {simulatorSuccess}
              </div>
            )}

            <form onSubmit={handleSimulateWhatsApp} className="flex-col gap-4">
              <div className="flex-col gap-2">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Numéro du Client (Expéditeur)</label>
                <input 
                  type="text" 
                  value={simulatedSenderPhone} 
                  onChange={(e) => setSimulatedSenderPhone(e.target.value)} 
                  required 
                  placeholder="ex: +2250708091011"
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
                />
              </div>

              <div className="flex-col gap-2" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Message du Client (Français / Nouchi / Vocabulaire local)</label>
                <textarea 
                  value={simulatedMessage} 
                  onChange={(e) => setSimulatedMessage(e.target.value)} 
                  required 
                  rows="4"
                  placeholder="ex: Chef pardon pardon envoie 2 garba complet et un poulet braisé bien pimenté, on est à la maison à Cocody Angré !"
                  style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-glass" onClick={() => setShowSimulatorModal(false)} disabled={simulatorLoading}>
                  Fermer
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }} disabled={simulatorLoading}>
                  {simulatorLoading ? "Analyse IA..." : "Envoyer à l'IA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
