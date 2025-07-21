import React, { useState } from "react";
import axios from "axios";

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

  const createWallet = async () => {
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/create", { name });
      setWalletData(res.data);
      alert("✅ Wallet Created");
    } catch (err) {
      alert("❌ Error creating wallet");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/fetch/${name}`);
      setWalletData(res.data);

      const balRes = await axios.post("http://localhost:5000/api/balance", {
        address: res.data.address,
      });
      setBalances(balRes.data);
    } catch (err) {
      alert("❌ Wallet not found or error fetching balance");
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
    } catch (err) {
      alert("❌ Error sending tokens");
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
    } catch (err) {
      alert("❌ Invalid TX hash");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial", maxWidth: 800, margin: "auto" }}>
      <h2>🧠 Wallet Manager</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <button onClick={createWallet} disabled={loading}>Create Wallet</button>
        <button onClick={fetchWallet} disabled={loading} style={{ marginLeft: 5 }}>
          Fetch Wallet
        </button>
      </div>

      {walletData && (
        <div style={{ background: "#f0f0f0", padding: 10, borderRadius: 8 }}>
          <p><strong>Address:</strong> {walletData.address}</p>
          <p><strong>Private Key:</strong> {walletData.privateKey}</p>
          <p><strong>Mnemonic:</strong> {walletData.mnemonic}</p>

          {balances && (
            <div style={{ marginTop: 10 }}>
              <p><strong>BNB:</strong> {balances.bnb}</p>
              <p><strong>USDT:</strong> {balances.usdt}</p>
              <p><strong>USDC:</strong> {balances.usdc}</p>
            </div>
          )}
        </div>
      )}

      <hr />

      <h3>💸 Send Tokens</h3>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{ padding: 5, width: "60%" }}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: 5 }}
        />
        <select
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ padding: 5, marginLeft: 10 }}
        >
          <option value="bnb">BNB</option>
          <option value="usdt">USDT</option>
          <option value="usdc">USDC</option>
        </select>
        <button onClick={sendTokens} disabled={loading} style={{ marginLeft: 10 }}>
          Send
        </button>
      </div>

      {txHash && (
        <div style={{ background: "#f9f9f9", padding: 10, borderRadius: 8 }}>
          <p><strong>TX Hash:</strong> {txHash}</p>
        </div>
      )}

      <hr />

      <h3>🔍 Verify Transaction</h3>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Transaction Hash"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          style={{ padding: 5, width: "60%" }}
        />
        <button onClick={verifyTx} disabled={loading} style={{ marginLeft: 10 }}>
          Verify
        </button>
      </div>

      {verifyData && (
        <div style={{ background: "#e8f4ea", padding: 10, borderRadius: 8 }}>
          <p><strong>From:</strong> {verifyData.from}</p>
          <p><strong>To:</strong> {verifyData.to}</p>
          <p><strong>Amount:</strong> {verifyData.value}</p>
          <p><strong>Token:</strong> {verifyData.token}</p>
          <p><strong>Status:</strong> {verifyData.status}</p>
        </div>
      )}

      {loading && <p>⏳ Please wait...</p>}
    </div>
  );
}

export default App;