import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from './supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [messaggio, setMessaggio] = useState("Inquadra il QR per timbrare")
  const [caricamento, setCaricamento] = useState(false)
  const [ruolo, setRuolo] = useState('OPERAIO')
  const [tutteLeTimbrature, setTutteLeTimbrature] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        controlloRuolo(session.user.id)
      }
    })
  }, [])

  const controlloRuolo = async (userId) => {
    const { data } = await supabase.from('profili').select('ruolo').eq('id', userId).single()
    if (data) {
      setRuolo(data.ruolo)
      if (data.ruolo === 'ADMIN') caricaDatiAdmin()
    }
  }

  const caricaDatiAdmin = async () => {
    // Recupera timbrature + nome sede + nome completo dal profilo collegato
    const { data, error } = await supabase
      .from('timbrature')
      .select(`
        id,
        creato_il,
        tipo,
        sedi(nome),
        profili:utente_id(nome_completo)
      `)
      .order('creato_il', { ascending: false })
    
    if (error) console.error("Errore fetch:", error)
    if (data) setTutteLeTimbrature(data)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else {
      setUser(data.user)
      controlloRuolo(data.user.id)
    }
  }

  const onScanSuccess = async (decodedText) => {
    if (caricamento) return;
    setCaricamento(true)
    setMessaggio("Codice letto! Controllo posizione...")

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const { data, error } = await supabase.rpc('registra_timbratura_sicura', {
        p_qr_secret: decodedText,
        p_lat: latitude,
        p_lon: longitude,
        p_tipo: 'ENTRATA'
      });

      if (error) setMessaggio("Errore: " + error.message);
      else {
        setMessaggio(data.message);
        if (ruolo === 'ADMIN') caricaDatiAdmin(); // Aggiorna se admin sta testando
      }
      setCaricamento(false)
    }, () => {
      setMessaggio("Attiva il GPS!");
      setCaricamento(false)
    });
  };

  useEffect(() => {
    if (user && ruolo === 'OPERAIO') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render(onScanSuccess);
      return () => scanner.clear().catch(console.error);
    }
  }, [user, ruolo]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
        <h1 style={{ color: '#3ecf8e' }}>VDM Login</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: 'auto' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #333' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #333' }} />
          <button type="submit" style={{ padding: '10px', backgroundColor: '#3ecf8e', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Entra</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#3ecf8e', margin: 0 }}>VDM Software</h1>
        <button onClick={() => { supabase.auth.signOut(); setUser(null); }} style={{ backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Esci</button>
      </header>

      {ruolo === 'ADMIN' ? (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ borderBottom: '2px solid #3ecf8e', paddingBottom: '10px' }}>Pannello Admin - Tutte le Timbrature</h2>
          {tutteLeTimbrature && tutteLeTimbrature.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e1e1e', color: '#3ecf8e' }}>
                    <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Data e Ora</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Operaio</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Sede</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #333' }}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {tutteLeTimbrature.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px' }}>{new Date(t.creato_il).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.profili?.nome_completo || 'N.D.'}</td>
                      <td style={{ padding: '12px' }}>{t.sedi?.nome || 'Sede sconosciuta'}</td>
                      <td style={{ padding: '12px' }}>{t.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ marginTop: '20px', color: '#888' }}>Caricamento dati o nessuna timbratura presente...</p>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '1.2rem' }}>Benvenuto! Inquadra il QR della sede.</p>
          <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: 'auto', border: '2px solid #3ecf8e', borderRadius: '10px', overflow: 'hidden' }}></div>
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#1e1e1e', borderRadius: '15px', border: '1px solid #333' }}>
            <h3 style={{ margin: 0, color: messaggio.includes('Errore') ? '#ff4444' : '#3ecf8e' }}>{messaggio}</h3>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
