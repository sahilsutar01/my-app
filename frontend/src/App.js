import React, { useState, useEffect } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

function App() {
  const [name, setName] = useState("");
  const [walletData, setWalletData] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("bnb");
  const [txHash, setTxHash] = useState("");
  const [verifyData, setVerifyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);


  const createWallet = async () => {
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/create", { name });
      setWalletData(res.data);
      alert("✅ Wallet Created");
    } catch (err) {
      alert(`❌ Error creating wallet: ${err.response?.data?.error || err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      setLoading(true);
      setShowQRCode(false);
      setShowHistory(false);
      setTransactionHistory([]);

      const res = await axios.get(`http://localhost:5000/api/fetch/${name}`);
      setWalletData(res.data);

      const balRes = await axios.post("http://localhost:5000/api/balance", {
        address: res.data.address,
      });
      setBalances(balRes.data);
    } catch (err) {
      alert(`❌ Wallet not found or error fetching balance: ${err.response?.data?.error || err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendTokens = async () => {
    try {
      if (!walletData?.privateKey) return alert("❌ Wallet not loaded");
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/send", {
        privateKey: walletData.privateKey,
        to: recipient,
        amount,
        token,
      });
      setTxHash(res.data.txHash);
      alert(`✅ Sent! TX Hash:\n${res.data.txHash}`);
      if (showHistory) {
        fetchHistory(walletData.address);
      }
    } catch (err) {
      alert(`❌ Error sending tokens: ${err.response?.data?.error || err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyTx = async () => {
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/verify", { txHash });
      setVerifyData(res.data);
      if (showHistory) {
        fetchHistory(walletData.address);
      }
    } catch (err) {
      alert(`❌ Invalid TX hash: ${err.response?.data?.error || err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (address) => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/history/${address}`);
      setTransactionHistory(res.data);
      setShowHistory(true);
    } catch (err) {
      alert(`❌ Could not fetch transaction history: ${err.response?.data?.error || err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={backgroundStyle}>
      {loading && (
        <div style={loaderOverlayStyle}>
          <div style={spinnerContainerStyle}>
            <div style={spinnerStyle}></div>
            <p style={loadingTextStyle}>Processing...</p>
          </div>
        </div>
      )}
      <div style={containerStyle}>
        <h2 style={titleStyle}>🧠 Wallet Manager</h2>

        <div style={flexRow}>
          <input
            placeholder="Enter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <button onClick={createWallet} disabled={loading} style={buttonStyle}>
            Create
          </button>
          <button onClick={fetchWallet} disabled={loading} style={buttonStyle}>
            Fetch
          </button>
        </div>

        {walletData && (
          <div style={cardStyle}>
            <p><strong>Address:</strong> {walletData.address}</p>
            <p><strong>Private Key:</strong> {walletData.privateKey}</p>
            <p><strong>Mnemonic:</strong> {walletData.mnemonic}</p>

            <button
              onClick={() => setShowQRCode(!showQRCode)}
              style={{ ...buttonStyle, marginTop: 10 }}
              disabled={loading}
            >
              {showQRCode ? "Hide QR" : "Show QR"}
            </button>

            <button
              onClick={() => showHistory ? setShowHistory(false) : fetchHistory(walletData.address)}
              style={{ ...buttonStyle, marginTop: 10 }}
              disabled={loading}
            >
              {showHistory ? "Hide History" : "Show History"}
            </button>

            {showQRCode && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <QRCodeCanvas value={walletData.address} size={150} />
                <p style={{ marginTop: 10, fontSize: 12, color: "#666" }}>Scan to copy wallet</p>
              </div>
            )}

            {balances && (
              <div style={{ marginTop: 10 }}>
                <p><strong>BNB:</strong> {balances.bnb}</p>
                <p><strong>USDT:</strong> {balances.usdt}</p>
                <p><strong>USDC:</strong> {balances.usdc}</p>
              </div>
            )}
          </div>
        )}

        {showHistory && (
          <>
            <h3 style={sectionHeader}>📜 Transaction History</h3>
            {transactionHistory.length > 0 ? (
              transactionHistory.map((tx) => {
                const isSent = tx.from.toLowerCase() === walletData.address.toLowerCase();
                return (
                  // ✅ FIX: Use tx._id for a guaranteed unique key
                  <div key={tx._id} style={{...cardStyle, marginBottom: 15, background: isSent ? '#fff5f5' : '#f0fff4'}}>
                     <p>
                        <strong>{isSent ? "Sent to:" : "Received from:"}</strong> {isSent ? tx.to : tx.from}
                     </p>
                     <p><strong>Amount:</strong> {tx.value} {tx.token.toUpperCase()}</p>
                     <p><strong>Status:</strong> {tx.status}</p>
                     <p>
                      <strong>Hash:</strong>{" "}
                      <a href={`https://testnet.bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline", wordBreak: 'break-all' }}>
                        {tx.txHash.substring(0, 10)}...
                      </a>
                    </p>
                    <p><strong>Date:</strong> {new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                )
              })
            ) : (
              <p style={{textAlign: 'center', marginTop: '20px'}}>No transaction history found for this wallet.</p>
            )}
          </>
        )}


        <h3 style={sectionHeader}>💸 Send Tokens</h3>
        <input
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{ ...inputStyle, width: "100%" }}
        />

        <div style={flexRow}>
          <input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="bnb">BNB</option>
            <option value="usdt">USDT</option>
            <option value="usdc">USDC</option>
          </select>
          <button onClick={sendTokens} disabled={loading} style={buttonStyle}>
            Send
          </button>
        </div>

        {txHash && (
          <div style={{ ...cardStyle, background: "#f0fff4" }}>
            <p>
              <strong>Last TX Hash:</strong>{" "}
              <a
                href={`https://testnet.bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "underline" }}
              >
                {txHash}
              </a>
            </p>
          </div>
        )}

        <h3 style={sectionHeader}>🔍 Verify Transaction</h3>
        <div style={flexRow}>
          <input
            placeholder="Transaction Hash"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            style={{ ...inputStyle, flex: 2 }}
          />
          <button onClick={verifyTx} disabled={loading} style={buttonStyle}>
            Verify
          </button>
        </div>

        {verifyData && (
          <div style={{ ...cardStyle, background: "#ecfdf5" }}>
            <p><strong>From:</strong> {verifyData.from}</p>
            <p><strong>To:</strong> {verifyData.to}</p>
            <p><strong>Amount:</strong> {verifyData.value}</p>
            <p><strong>Token:</strong> {verifyData.token}</p>
            <p><strong>Status:</strong> {verifyData.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// === Styles ===
const backgroundStyle = { minHeight: "100vh", padding: 30, background: "linear-gradient(-45deg, #6ee7b7, #3b82f6, #9333ea, #f43f5e)", backgroundSize: "400% 400%", animation: "gradient 15s ease infinite", fontFamily: "Poppins, sans-serif", };
const containerStyle = { maxWidth: 800, margin: "auto", padding: 30, borderRadius: 20, background: "rgba(255, 255, 255, 0.85)", boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.2)", backdropFilter: "blur(8px)", color: "#333", };
const inputStyle = { padding: 12, borderRadius: 10, border: "1px solid #ccc", marginBottom: 10, flex: 1, fontSize: 14, };
const buttonStyle = { background: "linear-gradient(90deg, #10b981, #06b6d4)", color: "white", padding: "10px 18px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold", transition: "all 0.3s", marginLeft: 8, };
const cardStyle = { background: "#fefefe", padding: 20, borderRadius: 12, marginTop: 20, border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", };
const flexRow = { display: "flex", gap: 10, marginBottom: 15, alignItems: "center", };
const titleStyle = { textAlign: "center", fontSize: 28, marginBottom: 25, color: "#1f2937", };
const sectionHeader = { fontSize: 20, marginTop: 30, marginBottom: 10, };
const loaderOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(255, 255, 255, 0.2)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, animation: "fadeIn 0.3s ease-in-out", };
const spinnerContainerStyle = { textAlign: "center", transform: "scale(1)", animation: "zoomIn 0.3s ease-in-out", };
const spinnerStyle = { width: 90, height: 90, borderRadius: "50%", border: "8px solid transparent", borderTop: "8px solid transparent", background: "conic-gradient(#3b82f6, #9333ea, #f43f5e, #10b981, #3b82f6)", animation: "spin 1s linear infinite, glow 1.5s ease-in-out infinite alternate", };
const loadingTextStyle = { marginTop: 12, color: "#1f2937", fontWeight: "bold", fontSize: 16, };
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes glow { 0% { filter: drop-shadow(0 0 5px #3b82f6); } 100% { filter: drop-shadow(0 0 20px #9333ea); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes zoomIn { from { transform: scale(0.8); } to { transform: scale(1); } }`;
document.head.appendChild(styleSheet);

export default App;