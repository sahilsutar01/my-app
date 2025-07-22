const express = require("express");
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Atlas URI
const MONGODB_URI = "mongodb+srv://sahilsutar200412:password1234@cluster0.blclafw.mongodb.net/Web3";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(console.error);

// Wallet schema
const Wallet = mongoose.model("Wallet", new mongoose.Schema({
  name: String,
  address: String,
  privateKey: String,
  mnemonic: String,
}));

// BSC Testnet RPC
const provider = new ethers.providers.JsonRpcProvider("https://bsc-testnet.drpc.org");

// Token addresses
const USDT_ADDRESS = "0x787A697324dbA4AB965C58CD33c13ff5eeA6295F";
const USDC_ADDRESS = "0x342e3aA1248AB77E319e3331C6fD3f1F2d4B36B1";

// ERC20 ABI
const ERC20_ABI = [
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint)",
];

// API: Create Wallet
app.post("/api/create", async (req, res) => {
  try {
    const wallet = ethers.Wallet.createRandom();
    const newWallet = new Wallet({
      name: req.body.name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
    });
    await newWallet.save();
    res.json(newWallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Fetch Wallet
app.get("/api/fetch/:name", async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ name: req.params.name });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get Balances
app.post("/api/balance", async (req, res) => {
  try {
    const { address } = req.body;
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    const bnbBalance = await provider.getBalance(address);
    const usdtBalance = await usdt.balanceOf(address);
    const usdcBalance = await usdc.balanceOf(address);

    const usdtDecimals = await usdt.decimals();
    const usdcDecimals = await usdc.decimals();

    res.json({
      bnb: ethers.utils.formatEther(bnbBalance),
      usdt: ethers.utils.formatUnits(usdtBalance, usdtDecimals),
      usdc: ethers.utils.formatUnits(usdcBalance, usdcDecimals),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ FIXED: Send Tokens
app.post("/api/send", async (req, res) => {
  try {
    const { privateKey, to, amount, token } = req.body;
    const wallet = new ethers.Wallet(privateKey, provider);

    if (token === "bnb") {
      const tx = await wallet.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount),
      });
      await tx.wait();
      return res.json({ txHash: tx.hash });
    }

    const tokenAddress = token === "usdt" ? USDT_ADDRESS : USDC_ADDRESS;
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const decimals = await contract.decimals(); // ✅ Use actual token decimals
    const value = ethers.utils.parseUnits(amount, decimals);

    const tx = await contract.transfer(to, value);
    await tx.wait();
    res.json({ txHash: tx.hash });
  } catch (err) {
    console.error("❌ Send Token Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Verify Transaction


app.post("/api/verify", async (req, res) => {
  try {
    const { txHash } = req.body;
    const tx = await provider.getTransaction(txHash);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    const receipt = await provider.getTransactionReceipt(txHash);
    let token = "bnb";
    let value = tx.value ? ethers.utils.formatEther(tx.value) : "0";

    if (tx.data && tx.data.startsWith("0xa9059cbb")) {
      const tokenAddress = tx.to.toLowerCase();

      // Create contract instance to get decimals dynamically
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const decimals = await tokenContract.decimals();

      const decoded = ethers.utils.defaultAbiCoder.decode(
        ["address", "uint256"],
        `0x${tx.data.slice(10)}`
      );
      value = ethers.utils.formatUnits(decoded[1], decimals);

      if (tokenAddress === USDT_ADDRESS.toLowerCase()) token = "usdt";
      else if (tokenAddress === USDC_ADDRESS.toLowerCase()) token = "usdc";
      else token = "erc20";
    }

    res.json({
      from: tx.from,
      to: tx.to,
      value,
      token,
      status: receipt.status === 1 ? "Success" : "Failed",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
