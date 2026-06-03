import React, { useState } from 'react'

const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        // Enregistrement SaaS
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            restaurant_name: restaurantName,
            whatsapp_phone: whatsappPhone || null
          })
        });

        const data = await response.json();
        if (!response.ok) {
          let errorMsg = "Une erreur est survenue lors de l'inscription.";
          if (data && data.detail) {
            if (typeof data.detail === 'string') {
              errorMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
              errorMsg = data.detail.map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`).join(', ');
            } else if (typeof data.detail === 'object') {
              errorMsg = JSON.stringify(data.detail);
            }
          }
          throw new Error(errorMsg);
        }

        setSuccessMsg(data.message);
        setIsRegister(false); // Basculer sur l'écran login
        setPassword('');
      } else {
        // Connexion
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) {
          let errorMsg = "Identifiants invalides.";
          if (data && data.detail) {
            if (typeof data.detail === 'string') {
              errorMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
              errorMsg = data.detail.map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`).join(', ');
            }
          }
          throw new Error(errorMsg);
        }

        // Sauvegarder dans le localStorage
        localStorage.setItem('maquis_token', data.access_token);
        localStorage.setItem('maquis_name', data.restaurant_name);
        localStorage.setItem('maquis_whatsapp', data.whatsapp_phone || '');
        
        onLoginSuccess(data.access_token, data.restaurant_name, data.whatsapp_phone || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center animate-fade-in" style={{ minHeight: '100vh', width: '100vw', padding: '1.5rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem 2rem', borderRadius: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '50px', height: '50px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', margin: '0 auto 1rem auto' }}>
            IA
          </div>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>MaquisIA</h2>
          <p className="text-muted">
            {isRegister ? "Lancez votre Maquis en mode intelligent" : "Accédez à votre tableau de bord gérant"}
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="badge badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nom d'utilisateur</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
              placeholder="ex: boss_maquis"
            />
          </div>

          <div className="flex-col gap-2" style={{ marginBottom: isRegister ? '0' : '1.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
              placeholder="••••••••"
            />
          </div>

          {isRegister && (
            <>
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nom du Maquis / Restaurant</label>
                <input 
                  type="text" 
                  value={restaurantName} 
                  onChange={(e) => setRestaurantName(e.target.value)} 
                  required 
                  style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
                  placeholder="ex: Le Garbadrôme Premium"
                />
              </div>

              <div className="flex-col gap-2" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Numéro WhatsApp associé (Optionnel)</label>
                <input 
                  type="text" 
                  value={whatsappPhone} 
                  onChange={(e) => setWhatsappPhone(e.target.value)} 
                  style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none' }}
                  placeholder="ex: +2250102030405"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
            {loading ? "Chargement..." : isRegister ? "Enregistrer mon Maquis" : "Se Connecter"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            {isRegister ? "Déjà un compte ?" : "Nouveau maquis ?"} &nbsp;
            <span 
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); }} 
              style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '500', textDecoration: 'underline' }}
            >
              {isRegister ? "Se connecter" : "Créer mon espace"}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
