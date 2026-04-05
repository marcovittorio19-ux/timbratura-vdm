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
    // Controlla se l'utente è già loggato
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) controlloRuolo(session.user.id)
    })
  }, [])

  const controlloRuolo = async (userId) => {
    const { data } = await supabase.from('profili').select('ruolo').eq('id', userId).single()
    setRuolo(data?.ruolo)
    if (data?.ruolo === 'ADMIN') caricaDatiAdmin()
  }

  const caricaDatiAdmin = async () => {
    const { data } = await supabase.from('timbrature').select('*, sedi(nome)').order('creato_il', { ascending: false })
    setTutteLeTimbrature(data)
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
      else setMessaggio(data.message);
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
      return () => scanner.clear();
    }
  }, [user, ruolo]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
        <h1 style={{ color: '#3ecf8e' }}>VDM Login</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: 'auto' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px' }} />
          <button type="submit" style={{ padding: '10px', backgroundColor: '#3ecf8e', border: 'none', cursor: 'pointer' }}>Entra</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#3ecf8e' }}>VDM Software</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '5px 10px' }}>Esci</button>
      </header>

      {ruolo === 'ADMIN' ? (
        <div style={{ marginTop: '20px' }}>
          <h2>Pannello Controllo Admin</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e1e1e' }}>
                <th style={{ padding: '10px' }}>Data</th>
                <th>Sede</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {tutteLeTimbrature.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '10px' }}>{new Date(t.creato_il).toLocaleString()}</td>
                  <td>{t.sedi?.nome}</td>
                  <td>{t.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <p>Benvenuto! Inquadra il QR per timbrare.</p>
          <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: 'auto', border: '2px solid #3ecf8e' }}></div>
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#1e1e1e', borderRadius: '15px' }}>
            <h3>{messaggio}</h3>
          </div>
        </>
      )}
    </div>
  )
}

export default App
