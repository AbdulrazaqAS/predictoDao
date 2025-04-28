import { useEffect, useState } from "react";

export default function NavBar({ setPage, signer, setSigner }) {
  const [connected, setConnected] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setSigner(accounts[0]);
      setConnected(true);
    } else {
      alert("MetaMask not detected");
    }
  };

  useEffect(() => {
    if (!signer) return;

    setConnected(true);
  }, [signer]);

  const navs = ["Home", "New Question", "Admins", "Profile", "About", "Contract"];

  return (
    <nav className="flex justify-between items-center p-4 shadow-md bg-white fixed top-0 w-full z-10">
      {/* Logo */}
      <div className="text-xl font-bold text-blue-600">PredictoDAO</div>

      {/* Navigation Links */}
      <ul className="flex gap-6 text-gray-700 font-medium">
        {navs.map((nav) => (
          <li
            key={nav}
            onClick={() => setPage(nav.toLowerCase())}
            className="cursor-pointer hover:text-blue-600 transition"
          >
            {nav}
          </li>
        ))}
      </ul>

      {/* Connect Wallet */}
      <div>
        {connected ? (
          <span className="text-sm text-green-600 font-mono truncate max-w-[150px]">{signer}</span>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
