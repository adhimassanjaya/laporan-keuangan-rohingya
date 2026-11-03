import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, PlusCircle, Trash2, 
  User, ShieldCheck, LogOut, Loader2, Filter, Calendar, ChevronLeft, ChevronRight, Clock, Users, BarChart2, ShieldAlert, Share2, Check, ChevronDown 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, get, remove, child } from 'firebase/database';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

// ==========================================
// KONFIGURASI FIREBASE REALTIME DATABASE
// ==========================================
const firebaseConfig = {
  databaseURL: "https://laporan-keuangan-rohingya-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Inisialisasi Firebase Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ANGGOTA_LIST = ["Adhi", "Adi", "Agus", "Ari", "Faldi", "Huda", "Ikbal", "Rizal", "Nardi"];
const ADMIN_LIST = ["Adhi", "Adi", "Nardi"];

export default function App() {
  const [user, setUser] = useState<string | null>(localStorage.getItem('rohingya_user'));
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [showWADropdown, setShowWADropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter State
  const [filterJenis, setFilterJenis] = useState('Semua');
  const [filterTanggal, setFilterTanggal] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [jenis, setJenis] = useState('Inbound');
  const [subKategori, setSubKategori] = useState('Atas');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [anggotaLoan, setAnggotaLoan] = useState('Adhi');
  const [aksiLoan, setAksiLoan] = useState('Peminjaman');

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWADropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ambil data transaksi dan log dari Firebase Realtime Database saat aplikasi dibuka
  useEffect(() => {
    async function fetchData() {
      try {
        const dbRef = ref(db);
        
        // Ambil Transaksi
        const txSnapshot = await get(child(dbRef, 'transactions'));
        if (txSnapshot.exists()) {
          const data = txSnapshot.val();
          const list = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          list.sort((a, b) => b.createdAt - a.createdAt);
          setTransactions(list);
        } else {
          setTransactions([]);
        }

        // Ambil Log Hapus
        const logSnapshot = await get(child(dbRef, 'logs'));
        if (logSnapshot.exists()) {
          const logData = logSnapshot.val();
          const logList = Object.keys(logData).map(key => ({
            id: key,
            ...logData[key]
          }));
          logList.sort((a, b) => b.createdAt - a.createdAt);
          setLogs(logList);
        } else {
          setLogs([]);
        }

      } catch (error) {
        console.error("Gagal memuat data dari database: ", error);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput) {
      setErrorMsg('Silakan pilih nama terlebih dahulu!');
      return;
    }

    const isAdmin = ADMIN_LIST.includes(usernameInput);
    const reversedName = usernameInput.toLowerCase().split('').reverse().join('');
    const validPassword = isAdmin ? 'adminrohingya123' : reversedName;

    if (passwordInput === validPassword) {
      setUser(usernameInput);
      localStorage.setItem('rohingya_user', usernameInput);
      setErrorMsg('');
    } else {
      setErrorMsg(isAdmin ? 'Password Admin salah!' : 'Password salah!');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rohingya_user');
    setPasswordInput('');
    setUsernameInput('');
  };

  const isAdmin = user && ADMIN_LIST.includes(user);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah) return;

    if (jenis === 'Pengeluaran' && !keterangan.trim()) {
      alert("Keterangan wajib diisi untuk transaksi Pengeluaran!");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const optionsDate: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
      const optionsTime: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };

      const formatterDate = new Intl.DateTimeFormat('en-CA', optionsDate);
      const formatterTime = new Intl.DateTimeFormat('en-GB', optionsTime);

      const tanggalWIB = formatterDate.format(now);
      const jamWIB = formatterTime.format(now);

      const numJumlah = parseFloat(jumlah);
      const newTxData = {
        tanggal: tanggalWIB,
        jam: jamWIB,
        jenis,
        subKategori: jenis === 'Inbound' ? subKategori : '-',
        jumlah: numJumlah,
        keterangan: keterangan.trim() ? keterangan.trim() : '-',
        anggotaLoan: jenis === 'Loan' ? anggotaLoan : '-',
        aksiLoan: jenis === 'Loan' ? aksiLoan : '-',
        inputBy: user,
        createdAt: Date.now()
      };

      const newTxRef = push(ref(db, 'transactions'));
      await set(newTxRef, newTxData); 
      
      setTransactions([{ id: newTxRef.key, ...newTxData }, ...transactions]);
      setJumlah('');
      setKeterangan('');
      setCurrentPage(1); 
    } catch (error) {
      console.error("Gagal menyimpan transaksi: ", error);
      alert("Gagal menyimpan ke database cloud.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tx: any) => {
    if (!window.confirm(`Yakin ingin menghapus transaksi "${tx.keterangan || tx.jenis}" senilai Rp ${tx.jumlah.toLocaleString()}?`)) return;
    
    try {
      await remove(ref(db, `transactions/${tx.id}`));
      
      const now = new Date();
      const optionsDate: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
      const optionsTime: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
      const formatterDate = new Intl.DateTimeFormat('en-CA', optionsDate);
      const formatterTime = new Intl.DateTimeFormat('en-GB', optionsTime);

      const logData = {
        deletedBy: user,
        tanggal: formatterDate.format(now),
        jam: formatterTime.format(now),
        detailTx: `${tx.jenis} - ${tx.keterangan || '-'} (Rp ${tx.jumlah.toLocaleString()})`,
        createdAt: Date.now()
      };

      const newLogRef = push(ref(db, 'logs'));
      await set(newLogRef, logData);

      setTransactions(transactions.filter(t => t.id !== tx.id));
      setLogs([ { id: newLogRef.key, ...logData }, ...logs ]);

    } catch (error) {
      console.error("Gagal menghapus data: ", error);
      alert("Gagal menghapus data dari database.");
    }
  };

  // Kalkulasi Keuangan Umum
  const totalInbound = transactions
    .filter(t => t.jenis === 'Inbound')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const totalOutbound = transactions
    .filter(t => t.jenis === 'Outbound')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const totalPengeluaran = transactions
    .filter(t => t.jenis === 'Pengeluaran')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const totalLoanPinjam = transactions
    .filter(t => t.jenis === 'Loan' && t.aksiLoan === 'Peminjaman')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const totalLoanKembali = transactions
    .filter(t => t.jenis === 'Loan' && t.aksiLoan === 'Pengembalian')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const netLoan = totalLoanPinjam - totalLoanKembali;
  const saldoUtama = (totalInbound + totalOutbound) - totalPengeluaran - netLoan;

  // Kalkulasi Loan Khusus Anggota yang sedang login
  const userLoanPinjam = transactions
    .filter(t => t.jenis === 'Loan' && t.anggotaLoan === user && t.aksiLoan === 'Peminjaman')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const userLoanKembali = transactions
    .filter(t => t.jenis === 'Loan' && t.anggotaLoan === user && t.aksiLoan === 'Pengembalian')
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  const userNetLoan = userLoanPinjam - userLoanKembali;

  // Generator Teks WhatsApp Berdasarkan Periode dengan Rincian Inbound yang Jelas
  const handleCopyWAReport = (periodeType: 'Harian' | 'Mingguan' | 'Bulanan') => {
    const nowWIB = new Date();
    const formatterDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
    const todayStrWIB = formatterDateStr.format(nowWIB); // YYYY-MM-DD
    const [currentYear, currentMonth, currentDay] = todayStrWIB.split('-').map(Number);

    // Filter transaksi berdasarkan periode yang dipilih
    let targetTransactions = transactions;
    let periodeLabel = "";

    if (periodeType === 'Harian') {
      targetTransactions = transactions.filter(t => t.tanggal === todayStrWIB);
      periodeLabel = `Harian (${new Date(currentYear, currentMonth - 1, currentDay).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;
    } else if (periodeType === 'Mingguan') {
      const todayObj = new Date(currentYear, currentMonth - 1, currentDay);
      const sevenDaysAgo = new Date(todayObj.getTime() - (7 * 24 * 60 * 60 * 1000));
      targetTransactions = transactions.filter(t => {
        if (!t.tanggal) return false;
        const [ty, tm, td] = t.tanggal.split('-').map(Number);
        const tObj = new Date(ty, tm - 1, td);
        return tObj >= sevenDaysAgo && tObj <= todayObj;
      });
      periodeLabel = `Mingguan (7 Hari Terakhir)`;
    } else if (periodeType === 'Bulanan') {
      const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      targetTransactions = transactions.filter(t => t.tanggal && t.tanggal.startsWith(currentMonthStr));
      const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      periodeLabel = `Bulanan (${monthName})`;
    }

    // Kalkulasi rincian Inbound per sub-kategori
    const inboundAtas = targetTransactions.filter(t => t.jenis === 'Inbound' && t.subKategori === 'Atas').reduce((acc, c) => acc + c.jumlah, 0);
    const inboundBawah = targetTransactions.filter(t => t.jenis === 'Inbound' && t.subKategori === 'Bawah').reduce((acc, c) => acc + c.jumlah, 0);
    const inboundPallet = targetTransactions.filter(t => t.jenis === 'Inbound' && t.subKategori === 'Pallet').reduce((acc, c) => acc + c.jumlah, 0);
    const pInboundTotal = inboundAtas + inboundBawah + inboundPallet;

    const pOutbound = targetTransactions.filter(t => t.jenis === 'Outbound').reduce((acc, c) => acc + c.jumlah, 0);
    const pPengeluaran = targetTransactions.filter(t => t.jenis === 'Pengeluaran').reduce((acc, c) => acc + c.jumlah, 0);
    const pLoanPinjam = targetTransactions.filter(t => t.jenis === 'Loan' && t.aksiLoan === 'Peminjaman').reduce((acc, c) => acc + c.jumlah, 0);
    const pLoanKembali = targetTransactions.filter(t => t.jenis === 'Loan' && t.aksiLoan === 'Pengembalian').reduce((acc, c) => acc + c.jumlah, 0);
    const pNetLoanPeriode = pLoanPinjam - pLoanKembali;

    // Rekap sisa loan anggota
    let loanSummaryText = "";
    ANGGOTA_LIST.forEach(nama => {
      const pinjam = transactions.filter(t => t.jenis === 'Loan' && t.anggotaLoan === nama && t.aksiLoan === 'Peminjaman').reduce((acc, c) => acc + c.jumlah, 0);
      const kembali = transactions.filter(t => t.jenis === 'Loan' && t.anggotaLoan === nama && t.aksiLoan === 'Pengembalian').reduce((acc, c) => acc + c.jumlah, 0);
      const sisa = pinjam - kembali;
      
      if (sisa > 0) {
        loanSummaryText += `• ${nama}: *Rp ${sisa.toLocaleString()}*\n`;
      } else {
        loanSummaryText += `• ${nama}: Lunas\n`;
      }
    });

    const waText = `📊 *LAPORAN KEUANGAN KELOMPOK ROHINGYA 5.0*
📌 Periode: ${periodeLabel}

💰 *RINGKASAN POSISI KAS*
🔹 Saldo Akhir Kas Utama: *Rp ${saldoUtama.toLocaleString()}*

📈 *ARUS DANA PERIODE INI*
📥 Total Inbound (Masuk): Rp ${pInboundTotal.toLocaleString()}
  ▫️ Atas: Rp ${inboundAtas.toLocaleString()}
  ▫️ Bawah: Rp ${inboundBawah.toLocaleString()}
  ▫️ Pallet: Rp ${inboundPallet.toLocaleString()}
📤 Keluar (Outbound): Rp ${pOutbound.toLocaleString()}
🛒 Pengeluaran: Rp ${pPengeluaran.toLocaleString()}
🤝 Loan Periode Ini: Rp ${pNetLoanPeriode.toLocaleString()}

👥 *REKAP SISA LOAN ANGGOTA*
${loanSummaryText}
_Laporan otomatis sistem Rohingya 5.0_ 🤖✨`;

    navigator.clipboard.writeText(waText).then(() => {
      setCopiedStatus(periodeType);
      setShowWADropdown(false);
      setTimeout(() => setCopiedStatus(null), 3000);
    });
  };

  // Menyiapkan Data Grafik Per Transaksi
  const chartData = [...transactions]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((t) => {
      return {
        tanggalOnly: t.tanggal,
        keterangan: t.keterangan,
        Inbound: t.jenis === 'Inbound' ? t.jumlah : 0,
        Outbound: t.jenis === 'Outbound' ? t.jumlah : 0,
        Pengeluaran: t.jenis === 'Pengeluaran' ? t.jumlah : 0,
        Loan: t.jenis === 'Loan' ? (t.aksiLoan === 'Peminjaman' ? t.jumlah : -t.jumlah) : 0,
      };
    });

  // Filter Transaksi berdasarkan Kategori & Tanggal
  const filteredTransactions = transactions.filter(t => {
    const matchJenis = filterJenis === 'Semua' || t.jenis === filterJenis;
    const matchTanggal = !filterTanggal || t.tanggal === filterTanggal;
    return matchJenis && matchTanggal;
  });

  // Logika Paginasi (Maksimal 10 per halaman)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterJenis, filterTanggal]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <Wallet size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Laporan Keuangan Rohingya 5.0</h1>
            <p className="text-xs text-slate-400 mt-2">Silakan login untuk mengakses laporan</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                <select 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                >
                  <option value="">Pilih Anggota</option>
                  {ANGGOTA_LIST.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3.5 text-slate-400" size={20} />
                <input 
                  type="password"
                  placeholder=""
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition duration-200 text-sm"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                <Wallet size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">Laporan Keuangan Rohingya 5.0</h1>
                <p className="text-xs text-slate-400">Login sebagai: <span className="text-emerald-400 font-medium">{user}</span> {isAdmin ? '(Admin)' : ''}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Tombol Dropdown Salin Laporan WA KHUSUS ADMIN */}
              {isAdmin && (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowWADropdown(!showWADropdown)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      copiedStatus ? 'bg-emerald-600 text-white' : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {copiedStatus ? <Check size={16} /> : <Share2 size={16} />}
                    <span className="hidden sm:inline">
                      {copiedStatus ? `Berhasil Disalin (${copiedStatus})!` : 'Salin Laporan WA'}
                    </span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showWADropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu Pilihan */}
                  {showWADropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-30 text-xs">
                      <div className="px-3 py-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-700/50 mb-1">
                        Pilih Periode Laporan
                      </div>
                      <button 
                        onClick={() => handleCopyWAReport('Harian')}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 transition flex items-center justify-between"
                      >
                        <span>☀️ Harian (Hari Ini)</span>
                      </button>
                      <button 
                        onClick={() => handleCopyWAReport('Mingguan')}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 transition flex items-center justify-between"
                      >
                        <span>📅 Mingguan (7 Hari)</span>
                      </button>
                      <button 
                        onClick={() => handleCopyWAReport('Bulanan')}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 transition flex items-center justify-between"
                      >
                        <span>📆 Bulanan (Bulan Ini)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-xl text-sm transition"
              >
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-red-950/60 p-5 rounded-2xl border border-red-900/60 shadow-lg">
              <p className="text-xs text-red-300 font-medium uppercase tracking-wider">Loan Anda</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                Rp {userNetLoan.toLocaleString()}
              </h3>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 font-medium uppercase">Total Saldo</p>
              <h3 className="text-2xl font-bold text-white mt-1">Rp {saldoUtama.toLocaleString()}</h3>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 font-medium uppercase">Total Inbound</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">Rp {totalInbound.toLocaleString()}</h3>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 font-medium uppercase">Total Outbound</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">Rp {totalOutbound.toLocaleString()}</h3>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 font-medium uppercase">Total Pengeluaran</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1">Rp {totalPengeluaran.toLocaleString()}</h3>
            </div>
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 font-medium uppercase">Total Loan</p>
              <h3 className="text-2xl font-bold text-orange-400 mt-1">Rp {netLoan.toLocaleString()}</h3>
            </div>
          </div>

          {/* Grafik Statistik Keuangan Per Transaksi */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <BarChart2 size={20} className="text-emerald-400" />
              <span>Grafik Riwayat Transaksi</span>
            </h2>
            <div className="w-full overflow-x-auto overflow-y-hidden">
              {chartData.length === 0 ? (
                <div className="flex h-80 items-center justify-center text-slate-400 text-sm">
                  Belum ada data transaksi untuk ditampilkan pada grafik.
                </div>
              ) : (
                <div style={{ minWidth: Math.max(chartData.length * 60, 600), height: 320 }}>
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="tanggalOnly" stroke="#94a3b8" fontSize={11} interval={0} angle={-25} textAnchor="end" height={45} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `Rp ${(val / 1000).toLocaleString()}rb`} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                        formatter={(value: any, name: any, item: any) => [
                          `Rp ${Math.abs(Number(value)).toLocaleString()}`, 
                          `${name} (${item.payload.keterangan})`
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="Inbound" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Outbound" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Loan" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kolom Kiri: Form Input (Admin), Rekap Loan, & Log Aktivitas Hapus */}
            <div className="space-y-6">
              {/* Form Input Transaksi (Hanya Admin) */}
              {isAdmin && (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <PlusCircle size={20} className="text-emerald-400" />
                    <span>Tambah Transaksi</span>
                  </h2>
                  <form onSubmit={handleAddTransaction} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Jenis Transaksi</label>
                      <select 
                        value={jenis} 
                        onChange={(e) => setJenis(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                      >
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                        <option value="Pengeluaran">Pengeluaran</option>
                        <option value="Loan">Loan</option>
                      </select>
                    </div>

                    {jenis === 'Inbound' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Sub Kategori</label>
                        <select 
                          value={subKategori} 
                          onChange={(e) => setSubKategori(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                        >
                          <option value="Atas">Atas</option>
                          <option value="Bawah">Bawah</option>
                          <option value="Pallet">Pallet</option>
                        </select>
                      </div>
                    )}

                    {jenis === 'Loan' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Nama Anggota</label>
                          <select 
                            value={anggotaLoan} 
                            onChange={(e) => setAnggotaLoan(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                          >
                            {ANGGOTA_LIST.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Aksi Loan</label>
                          <select 
                            value={aksiLoan} 
                            onChange={(e) => setAksiLoan(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                          >
                            <option value="Peminjaman">Peminjaman</option>
                            <option value="Pengembalian">Pengembalian</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah (Rp)</label>
                      <input 
                        type="number"
                        placeholder="Contoh: 50000"
                        value={jumlah}
                        onChange={(e) => setJumlah(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Keterangan {jenis === 'Pengeluaran' ? <span className="text-red-400 font-bold">* Wajib</span> : <span className="text-slate-500 font-normal">(Opsional)</span>}
                      </label>
                      <input 
                        type="text"
                        placeholder={jenis === 'Pengeluaran' ? "Wajib diisi keterangan pengeluaran" : "Keterangan transaksi"}
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {submitting && <Loader2 size={16} className="animate-spin" />}
                      <span>{submitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Tabel Rekap Loan Masing-Masing Anggota */}
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <Users size={20} className="text-orange-400" />
                  <span>Rekap Loan Anggota</span>
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ANGGOTA_LIST.map(nama => {
                    const pinjam = transactions
                      .filter(t => t.jenis === 'Loan' && t.anggotaLoan === nama && t.aksiLoan === 'Peminjaman')
                      .reduce((acc, curr) => acc + curr.jumlah, 0);
                    const kembali = transactions
                      .filter(t => t.jenis === 'Loan' && t.anggotaLoan === nama && t.aksiLoan === 'Pengembalian')
                      .reduce((acc, curr) => acc + curr.jumlah, 0);
                    const sisaLoan = pinjam - kembali;

                    return (
                      <div key={nama} className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-700/50 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-200">{nama}</span>
                        <span className={`font-bold ${sisaLoan > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          Rp {sisaLoan.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Log Aktivitas Penghapusan (Audit Trail) */}
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <ShieldAlert size={20} className="text-red-400" />
                  <span>Log Aktivitas Hapus</span>
                </h2>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {logs.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-4">Belum ada aktivitas penghapusan.</p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="bg-slate-900 p-3 rounded-xl border border-slate-700/50 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span className="text-red-400 font-semibold">{log.deletedBy}</span>
                          <span>{log.tanggal} {log.jam}</span>
                        </div>
                        <p className="text-slate-200 font-medium">{log.detailTx}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Riwayat Transaksi */}
            <div className={`bg-slate-800 p-6 rounded-2xl border border-slate-700 ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
                
                {/* Area Filter */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Filter Tanggal */}
                  <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                    <Calendar size={14} className="text-slate-400" />
                    <input 
                      type="date"
                      value={filterTanggal}
                      onChange={(e) => setFilterTanggal(e.target.value)}
                      className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                    />
                    {filterTanggal && (
                      <button 
                        onClick={() => setFilterTanggal('')}
                        className="text-slate-400 hover:text-white text-xs ml-1 font-bold"
                        title="Reset Tanggal"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Filter Kategori / Jenis */}
                  <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      value={filterJenis}
                      onChange={(e) => setFilterJenis(e.target.value)}
                      className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="Semua" className="bg-slate-900">Semua Kategori</option>
                      <option value="Inbound" className="bg-slate-900">Inbound</option>
                      <option value="Outbound" className="bg-slate-900">Outbound</option>
                      <option value="Pengeluaran" className="bg-slate-900">Pengeluaran</option>
                      <option value="Loan" className="bg-slate-900">Loan</option>
                    </select>
                  </div>
                </div>
              </div>

              {loadingData ? (
                <div className="flex justify-center items-center py-12 text-slate-400 space-x-2">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="text-sm">Memuat data dari database...</span>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Tidak ada transaksi ditemukan.</p>
              ) : (
                <>
                  <div className="space-y-3 overflow-x-auto">
                    {currentTransactions.map(t => (
                      <div key={t.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              t.jenis === 'Inbound' ? 'bg-emerald-500/10 text-emerald-400' :
                              t.jenis === 'Outbound' ? 'bg-blue-500/10 text-blue-400' :
                              t.jenis === 'Pengeluaran' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {t.jenis} {t.subKategori !== '-' ? `(${t.subKategori})` : ''} {t.aksiLoan !== '-' ? `(${t.aksiLoan})` : ''}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center space-x-1">
                              <Calendar size={12} className="inline mr-0.5" /> {t.tanggal} 
                              {t.jam && (
                                <>
                                  <Clock size={12} className="inline ml-1.5 mr-0.5" /> <span className="text-slate-300 font-medium">{t.jam}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white">{t.keterangan} {t.anggotaLoan !== '-' ? `- ${t.anggotaLoan}` : ''}</p>
                          <p className="text-xs text-slate-500">Oleh: {t.inputBy}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`font-bold text-sm ${
                            t.jenis === 'Inbound' || t.jenis === 'Outbound' || (t.jenis === 'Loan' && t.aksiLoan === 'Pengembalian') ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {t.jenis === 'Pengeluaran' || (t.jenis === 'Loan' && t.aksiLoan === 'Peminjaman') ? '-' : '+'} Rp {t.jumlah.toLocaleString()}
                          </span>
                          {isAdmin && (
                            <button onClick={() => handleDelete(t)} className="text-slate-500 hover:text-red-400 transition" title="Hapus Transaksi">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Navigasi Paginasi */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50 text-xs">
                      <span className="text-slate-400">
                        Halaman <span className="text-white font-medium">{currentPage}</span> dari <span className="text-white font-medium">{totalPages}</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center space-x-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft size={14} />
                          <span>Sebelumnya</span>
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center space-x-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <span>Berikutnya</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-800 mt-12">
        Made with ❤️ fr AMS
      </footer>
    </div>
  );
}