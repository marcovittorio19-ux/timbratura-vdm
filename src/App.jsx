import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from './supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [messaggio, setMessaggio] = useState("Pronto per la timbratura")
  const [caricamento, setCaricamento] = useState(false)
  const [ruolo, setRuolo] = useState('OPERAIO')
  const [tutteLeTimbrature, setTutteLeTimbrature] = useState([])

  // Colori Aziendali
  const AZZURRO = "#007BFF"; // Puoi cambiare questo codice esagonale con l'azzurro esatto del tuo logo
  const BIANCO = "#FFFFFF";
  const GRIGIO_LIGHT = "#f8f9fa";

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
    const { data, error } = await supabase
      .from('timbrature')
      .select(`id, creato_il, tipo, sedi ( nome ), profili ( nome_completo )`)
      .order('creato_il', { ascending: false });
    if (!error) setTutteLeTimbrature(data || []);
  };

  const handleLogin = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Credenziali errate")
    else {
      setUser(data.user)
      controlloRuolo(data.user.id)
    }
  }

  const onScanSuccess = async (decodedText) => {
    if (caricamento) return;
    const tipoScelto = messaggio.includes('USCITA') ? 'USCITA' : 'ENTRATA';
    setCaricamento(true);
    setMessaggio(`Registrazione ${tipoScelto} in corso...`);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const { data, error } = await supabase.rpc('registra_timbratura_sicura', {
        p_qr_secret: decodedText, p_lat: latitude, p_lon: longitude, p_tipo: tipoScelto 
      });

      if (error) setMessaggio("Errore: " + error.message);
      else {
        setMessaggio("✅ " + data.message);
        if (ruolo === 'ADMIN') caricaDatiAdmin();
      }
      setTimeout(() => { setCaricamento(false); setMessaggio(`Seleziona prossima azione`); }, 4000);
    }, () => {
      setMessaggio("❌ Attiva il GPS!");
      setCaricamento(false);
    });
  };

  useEffect(() => {
    if (user && ruolo === 'OPERAIO') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
      scanner.render(onScanSuccess);
      return () => scanner.clear().catch(console.error);
    }
  }, [user, ruolo, messaggio]);

  // Trova la fine di onScanSuccess e incolla questo:

const generaPDF = () => {
  const doc = new jsPDF();
  
  // Intestazione del documento
  doc.setFontSize(18);
  doc.setTextColor(0, 123, 255); // Azzurro aziendale
  doc.text("Riepilogo Timbrature - VDM Software", 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Report generato il: ${new Date().toLocaleString()}`, 14, 30);

  // Trasforma i dati per la tabella
  const tableRows = tutteLeTimbrature.map(t => [
    new Date(t.creato_il).toLocaleString(),
    t.profili?.nome_completo || 'Utente',
    t.sedi?.nome || 'Sede N.D.',
    t.tipo
  ]);

  // Genera la tabella automatica
  doc.autoTable({
    head: [['Data e Ora', 'Dipendente', 'Sede', 'Azione']],
    body: tableRows,
    startY: 40,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 123, 255] }, // Azzurro per l'intestazione
  });

  // Salva il file sul dispositivo
  doc.save(`Report_VDM_${new Date().toISOString().split('T')[0]}.pdf`);
};

  // SCHERMATA LOGIN
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: BIANCO, color: '#333', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Logo Azienda" style={{ height: '100px', margin: '0 auto 30px', objectFit: 'contain' }} />
        <h2 style={{ color: AZZURRO, marginBottom: '20px' }}>Area Riservata Personale</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '350px', margin: 'auto', width: '100%' }}>
          <input type="email" placeholder="Email aziendale" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }} />
          <button type="submit" style={{ padding: '15px', backgroundColor: AZZURRO, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,123,255,0.2)' }}>ACCEDI</button>
        </form>
      </div>
    )
  }

  // SCHERMATA APP (OPERAIO O ADMIN)
  return (
    <div style={{ textAlign: 'center', backgroundColor: GRIGIO_LIGHT, color: '#333', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: BIANCO, borderBottom: `3px solid ${AZZURRO}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '40px' }} />
        <button onClick={() => { supabase.auth.signOut(); setUser(null); }} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Esci</button>
      </header>

      <main style={{ padding: '20px' }}>
{ruolo === 'ADMIN' ? (
  <div>
    {/* CONTENITORE TITOLO + PULSANTE PDF */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
      <h2 style={{ color: AZZURRO, margin: 0 }}>Riepilogo Timbrature</h2>
      <button 
        onClick={generaPDF}
        style={{ 
          padding: '10px 15px', 
          backgroundColor: '#28a745', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          fontSize: '14px',
          boxShadow: '0 4px 6px rgba(40,167,69,0.2)'
        }}
      >
        📄 Scarica PDF
      </button>
    </div>
            <div style={{ overflowX: 'auto', backgroundColor: BIANCO, borderRadius: '15px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${AZZURRO}`, color: AZZURRO }}>
                    <th style={{ padding: '12px' }}>Data/Ora</th>
                    <th style={{ padding: '12px' }}>Dipendente</th>
                    <th style={{ padding: '12px' }}>Sede</th>
                    <th style={{ padding: '12px' }}>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {tutteLeTimbrature.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{new Date(t.creato_il).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{t.profili?.nome_completo || 'Utente'}</td>
                      <td style={{ padding: '12px' }}>{t.sedi?.nome}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '5px', fontSize: '12px', backgroundColor: t.tipo === 'ENTRATA' ? '#e3f2fd' : '#fff3e0', color: t.tipo === 'ENTRATA' ? '#1976d2' : '#e65100' }}>{t.tipo}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '500px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '25px' }}>
              <button onClick={() => setMessaggio("Inquadra per ENTRATA")} style={{ flex: 1, padding: '20px', backgroundColor: messaggio.includes('ENTRATA') ? AZZURRO : BIANCO, color: messaggio.includes('ENTRATA') ? BIANCO : AZZURRO, border: `2px solid ${AZZURRO}`, borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>ENTRATA</button>
              <button onClick={() => setMessaggio("Inquadra per USCITA")} style={{ flex: 1, padding: '20px', backgroundColor: messaggio.includes('USCITA') ? AZZURRO : BIANCO, color: messaggio.includes('USCITA') ? BIANCO : AZZURRO, border: `2px solid ${AZZURRO}`, borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>USCITA</button>
            </div>

            <div id="reader" style={{ width: '100%', borderRadius: '20px', overflow: 'hidden', border: `4px solid ${AZZURRO}`, backgroundColor: BIANCO }}></div>
            
            <div style={{ marginTop: '25px', padding: '20px', backgroundColor: BIANCO, borderRadius: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: 0, color: messaggio.includes('Errore') || messaggio.includes('❌') ? '#d32f2f' : AZZURRO }}>{messaggio}</h3>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
