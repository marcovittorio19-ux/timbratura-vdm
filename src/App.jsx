import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from './supabaseClient'

function App() {
  const [messaggio, setMessaggio] = useState("Inquadra il QR per timbrare")
  const [caricamento, setCaricamento] = useState(false)

  // Funzione che scatta quando il QR viene letto
  const onScanSuccess = async (decodedText) => {
    if (caricamento) return; // Evita scansioni multiple
    setCaricamento(true)
    setMessaggio("Codice letto! Controllo posizione GPS...")

    // Chiediamo al telefono: "Dove sei?"
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      // Inviamo i dati al tuo database Supabase
      const { data, error } = await supabase.rpc('registra_timbratura_sicura', {
        p_qr_secret: decodedText,
        p_lat: latitude,
        p_lon: longitude,
        p_tipo: 'ENTRATA'
      });

      if (error) setMessaggio("Errore: " + error.message);
      else setMessaggio(data.message);
      
      setCaricamento(false)
    }, (err) => {
      setMessaggio("Errore: Devi attivare il GPS sul telefono!");
      setCaricamento(false)
    });
  };

  useEffect(() => {
    // Accende la telecamera appena apri l'app
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    scanner.render(onScanSuccess);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: '#3ecf8e' }}>VDM Software</h1>
      <p>Sistema di Timbratura Intelligente</p>
      
      {/* Qui appare la telecamera */}
      <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: 'auto', border: '2px solid #3ecf8e' }}></div>
      
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#1e1e1e', borderRadius: '15px' }}>
        <h3 style={{ margin: 0 }}>{messaggio}</h3>
      </div>
    </div>
  )
}

export default App