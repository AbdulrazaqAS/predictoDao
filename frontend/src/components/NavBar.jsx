import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export default function NavBar({ setPage, signer, setSigner }) {
  const [connected, setConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navs = ["Home", "Contracts", "Profile", "About"];

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
    if (signer) setConnected(true);
  }, [signer]);

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
      <div className="flex items-center justify-between px-4 py-3 md:py-4">
        <div className="text-xl font-bold text-blue-600">PredictoDAO</div>

        {/* Desktop Nav */}
        <ul className="hidden md:flex gap-6 text-gray-700 font-medium">
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

        <div className="flex items-center gap-4">
          {/* Button/text for md and lg screens */}
          {connected ? (
            <span className="text-sm text-green-600 font-mono truncate max-w-[150px] hidden md:block">{signer}</span>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition hidden md:block"
            >
              Connect Wallet
            </button>
          )}

          {/* Hamburger for Mobile */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 bg-white border-t">
          <ul className="flex flex-col gap-3 text-gray-700">
            {navs.map((nav) => (
              <li
                key={nav}
                onClick={() => {
                  setPage(nav.toLowerCase());
                  setMenuOpen(false);
                }}
                className="cursor-pointer hover:text-blue-600 transition"
              >
                {nav}
              </li>
            ))}
          </ul>

          <div className="mt-4">
            {connected ? (
              <span className="text-sm text-green-600 font-mono truncate block">{signer}</span>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
