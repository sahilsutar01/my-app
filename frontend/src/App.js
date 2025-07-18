import React, { useState } from "react";
import { ethers } from "ethers";

const RPC_URL = "https://bsc-testnet-dataseed.bnbchain.org";
const USDT_CONTRACT_ADDRESS = "0x787A697324dbA4AB965C58CD33c13ff5eeA6295F";
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

function App() {
  const [walletData, setWalletData] = useState(null);
  const [walletName, setWalletName] = useState("");
  const [searchName, setSearchName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [loadingBNB, setLoadingBNB] = useState(false);
  const [loadingUSDT, setLoadingUSDT] = useState(false);

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  const styles = {
    container: {
      fontFamily: "'Segoe UI', sans-serif",
      background: "#f0f4f8",
      minHeight: "100vh",
      padding: "40px 20px",
      color: "#1f2937",
      maxWidth: "750px",
      margin: "auto",
    },
    section: {
      background: "#ffffff",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      marginBottom: "24px",
    },
    heading: {
      fontSize: "28px",
      marginBottom: "20px",
      color: "#111827",
    },
    label: {
      fontWeight: "500",
      marginBottom: "6px",
      display: "block",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      fontSize: "15px",
      marginBottom: "16px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f9fafb",
    },
    button: {
      padding: "10px 20px",
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      cursor: "pointer",
      marginRight: "10px",
    },
    detail: {
      background: "#f9fafb",
      padding: "10px",
      borderRadius: "8px",
      marginBottom: "12px",
      fontSize: "15px",
    },
    smallTitle: {
      fontSize: "18px",
      marginTop: "20px",
      marginBottom: "12px",
      color: "#374151",
    },
  };

  const generateAndSaveWallet = async () => {
    if (!walletName.trim()) return alert("Please enter a name for the wallet.");

    const wallet = ethers.Wallet.createRandom();
    const newWallet = {
      name: walletName,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
    };

    try {
      const res = await fetch("http://localhost:5000/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWallet),
      });

      res.ok ? alert("✅ Wallet saved!") : alert("❌ Failed to save wallet.");
      setWalletName("");
    } catch {
      alert("❌ Something went wrong.");
    }
  };

  const fetchWalletByName = async () => {
    if (!searchName.trim()) return alert("Please enter a wallet name.");

    try {
      const res = await fetch(`http://localhost:5000/api/wallet/${searchName}`);
      const data = await res.json();

      if (data.error) {
        alert("❌ Wallet not found.");
        setWalletData(null);
        setBalance(null);
        setUsdtBalance(null);
      } else {
        setWalletData(data);
        fetchBalance(data.privateKey);
        getUSDTBalance(data.address);
      }
    } catch {
      alert("❌ Error fetching wallet.");
    }
  };

  const fetchBalance = async (privateKey) => {
    const wallet = new ethers.Wallet(privateKey, provider);
    const bal = await provider.getBalance(wallet.address);
    setBalance(ethers.utils.formatEther(bal));
  };

  const getUSDTBalance = async (address) => {
    const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
    const rawBalance = await usdt.balanceOf(address);
    const decimals = await usdt.decimals();
    setUsdtBalance((Number(rawBalance) / 10 ** decimals).toFixed(4));
  };

  const sendBNB = async () => {
    if (!walletData?.privateKey) return alert("Please load a wallet.");
    if (!ethers.utils.isAddress(recipient)) return alert("Invalid address.");
    if (!amount || isNaN(amount)) return alert("Invalid amount.");

    try {
      setLoadingBNB(true);
      const wallet = new ethers.Wallet(walletData.privateKey, provider);
      const tx = await wallet.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });
      await tx.wait();
      alert(`✅ BNB sent!\nHash: ${tx.hash}`);
      fetchBalance(walletData.privateKey);
      setAmount("");
    } catch {
      alert("❌ BNB transfer failed.");
    } finally {
      setLoadingBNB(false);
    }
  };

  const transferUSDT = async () => {
    if (!walletData?.privateKey) return alert("Please load a wallet.");
    if (!ethers.utils.isAddress(recipient)) return alert("Invalid address.");
    if (!amount || isNaN(amount)) return alert("Invalid amount.");

    try {
      setLoadingUSDT(true);
      const wallet = new ethers.Wallet(walletData.privateKey, provider);
      const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, wallet);
      const decimals = await usdt.decimals();
      const parsed = ethers.utils.parseUnits(amount, decimals);
      const tx = await usdt.transfer(recipient, parsed);
      await tx.wait();
      alert("✅ USDT sent!");
      getUSDTBalance(wallet.address);
      setAmount("");
    } catch {
      alert("❌ USDT transfer failed.");
    } finally {
      setLoadingUSDT(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}> Wallet Manager</h1>

      <div style={styles.section}>
        <label style={styles.label}>Create New Wallet</label>
        <input
          style={styles.input}
          placeholder="Enter wallet name"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
        />
        <button style={styles.button} onClick={generateAndSaveWallet}>Generate & Save</button>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Fetch Existing Wallet</label>
        <input
          style={styles.input}
          placeholder="Enter wallet name to fetch"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <button style={styles.button} onClick={fetchWalletByName}>Fetch Wallet</button>
      </div>

      {walletData && (
        <div style={styles.section}>
          <h3 style={styles.smallTitle}>🔐 Wallet Info</h3>
          <div style={styles.detail}><strong>Name:</strong> {walletData.name}</div>
          <div style={styles.detail}><strong>Address:</strong> {walletData.address}</div>
          <div style={styles.detail}><strong>Private Key:</strong> {walletData.privateKey}</div>
          <div style={styles.detail}><strong>Mnemonic:</strong> {walletData.mnemonic}</div>
          <div style={styles.detail}><strong>BNB Balance:</strong> {balance ?? "..."} BNB</div>
          <div style={styles.detail}><strong>USDT Balance:</strong> {usdtBalance ?? "..."} USDT</div>

          <h4 style={styles.smallTitle}>📤 Send Tokens</h4>
          <input
            style={styles.input}
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            style={styles.button}
            onClick={sendBNB}
            disabled={loadingBNB}
          >
            {loadingBNB ? "Sending BNB..." : "Send BNB"}
          </button>
          <button
            style={styles.button}
            onClick={transferUSDT}
            disabled={loadingUSDT}
          >
            {loadingUSDT ? "Sending USDT..." : "Send USDT"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
