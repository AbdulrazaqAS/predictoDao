import { useEffect, useState } from "react";

export default function NoWalletDetected({setWalletDetected, scrollToNavBar}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/android|iphone|ipad|ipod/i.test(userAgent)) {
        setIsMobile(true);
      }
    };
    checkIfMobile();
    if (scrollToNavBar) scrollToNavBar();
  }, []);

  return (
    <div className="bg-red-600 p-1 flex justify-between">
      {!isMobile ? (
        <>
          <p>
            No Ethereum wallet was detected.
            Please install{" "}
            <a className="text-blue-700 underline" href="http://metamask.io" target="_blank" rel="noopener noreferrer">
                MetaMask
            </a>
            . Reload page if already installed.
          </p>
          <button className="rounded-full border bg-white px-2 text-red-900 hover:bg-red-200" onClick={() => setWalletDetected(true)}>
            <span>&times;</span>
          </button>
        </>
        ) : (
          <>
            <p>
              No Ethereum wallet was detected.
              Please install{" "}
              <a className="text-blue-700 underline" href="http://metamask.io" target="_blank" rel="noopener noreferrer">
                  MetaMask
              </a>
              {" "}and visit this website from the app.
            </p>
            <button className="rounded-full border bg-white px-2 text-red-900 hover:bg-red-200" onClick={() => setWalletDetected(true)}>
              <span>&times;</span>
            </button>
          </>
        )
      }
    </div>
  );
}
