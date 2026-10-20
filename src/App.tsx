import { useEffect, useRef, useState } from 'react';
import './App.css';
import { supabase } from './supabase';
import {
  initializeFaceDetection,
  detectFace,
  closeFaceDetection,
} from './faceDetection';

supabase
  .from('office_settings')
  .select('office_name')
  .limit(1)
  .then(({ data, error }) => {
    console.log('HASIL TES SUPABASE:', { data, error });
  });

function App() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [message, setMessage] = useState(
    'Masukkan nomor pegawai, lalu aktifkan kamera untuk memulai.'
  );
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startCamera() {
    try {
      setMessage('Meminta izin kamera...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await initializeFaceDetection();

      setCameraOn(true);
      setMessage('Kamera aktif. Menyiapkan deteksi wajah...');

      if (videoRef.current) {
        const result = detectFace(videoRef.current);

        if (result.faceLandmarks.length > 0) {
          setMessage('Wajah terdeteksi. Identitas pegawai belum diverifikasi.');
        } else {
          setMessage(
            'Wajah belum terdeteksi. Posisikan wajah di depan kamera.'
          );
        }
      }
    } catch (error) {
      console.error('Kesalahan kamera atau deteksi wajah:', error);

      const detail =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);

      setMessage(`Kamera atau deteksi wajah gagal: ${detail}`);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setMessage('Kamera ditutup.');
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleAttendance(type: 'check_in' | 'check_out') {
    if (!employeeNumber.trim()) {
      setMessage('Masukkan nomor pegawai terlebih dahulu.');
      return;
    }

    if (!cameraOn) {
      setMessage('Aktifkan kamera terlebih dahulu.');
      return;
    }

    if (!navigator.geolocation) {
      setMessage('Browser tidak mendukung GPS.');
      return;
    }

    setLoading(true);
    setMessage('Mengambil lokasi dan mengirim absensi...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const { data, error } = await supabase.functions.invoke(
            'faceattend-api',
            {
              body: {
                action: type,
                employee_number: employeeNumber.trim(),
                latitude,
                longitude,
              },
            }
          );

          if (error) {
            throw error;
          }

          if (data?.success) {
            setMessage(data.message || 'Absensi berhasil dikirim ke server.');
          } else {
            setMessage(
              data?.error || data?.message || 'Absensi ditolak oleh server.'
            );
          }
        } catch (error) {
          console.error('Gagal mengirim absensi:', error);

          const detail =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : JSON.stringify(error);

          setMessage(`Gagal absensi: ${detail}`);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setMessage(
          error.code === 1
            ? 'Izin lokasi ditolak. Izinkan akses lokasi di browser.'
            : 'Lokasi gagal dibaca. Aktifkan GPS lalu coba lagi.'
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  return (
    <main className="attendance-page">
      <header className="app-header">
        <div className="brand-mark">FA</div>
        <div>
          <h1>FaceAttend</h1>
          <p>DISKOMINFO KABUPATEN SUBANG</p>
        </div>
        <span className="status-badge">Online</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">SISTEM KEHADIRAN PEGAWAI</p>
        <h2>Selamat datang 👋</h2>
        <p>Absensi kerja yang praktis, aman, dan berbasis lokasi kantor.</p>
      </section>

      <section className="attendance-card">
        <div className="camera-placeholder">
          <video
            ref={videoRef}
            className={`camera-video ${cameraOn ? 'visible' : ''}`}
            autoPlay
            muted
            playsInline
          />
          {!cameraOn && (
            <>
              <div className="camera-icon">◎</div>
              <h3>Verifikasi Wajah</h3>
              <p>
                Posisikan wajah di depan kamera dengan pencahayaan yang cukup.
              </p>
            </>
          )}
        </div>

        <button
          className="camera-button"
          onClick={cameraOn ? stopCamera : startCamera}
        >
          {cameraOn ? 'Tutup Kamera' : 'Aktifkan Kamera'}
        </button>

        <label htmlFor="employee-number">Nomor Pegawai</label>
        <input
          id="employee-number"
          type="text"
          value={employeeNumber}
          onChange={(event) => setEmployeeNumber(event.target.value)}
          placeholder="Masukkan nomor pegawai"
          autoComplete="off"
        />

        <div className="attendance-actions">
          <button
            className="check-in-button"
            onClick={() => handleAttendance('check_in')}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Absen Masuk'}
          </button>
          <button
            className="check-out-button"
            onClick={() => handleAttendance('check_out')}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Absen Pulang'}
          </button>
        </div>

        <div className="message-box" role="status">
          {message}
        </div>
      </section>

      <footer>
        <p>FaceAttend Subang</p>
        <p>Dinas Komunikasi dan Informatika Kabupaten Subang</p>
      </footer>
    </main>
  );
}

export default App;
