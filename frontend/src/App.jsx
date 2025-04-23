import { useState, useEffect } from "react";
import {ethers} from  "ethers";
import { changeToNetwork } from "./utils";

import QuestionCard from "./components/QuestionCard";
import NavBar from "./components/NavBar";
import NewQuestionTab from "./components/NewQuestionTab";
import NoWalletDetected from "./components/NoWalletDetected";

const HARDHAT_NETWORK_ID = '0x7A69' // 31337
const SEPOLIA_NETWORK_ID = '0xAA36A7' // 11155111
const CONTRACT_ADDRESS = '0xE8C2e71f6f890aA8ed568200B46dE613dBd29CF8';

export default function App() {
  const [provider, setProvider] = useState(null);
  const [walletDetected, setWalletDetected] = useState(false);
  const [predictoDao, setPredictoDao] = useState(null);
  const [page, setPage] = useState("home");

  const dummyData = [
    {
      question: "Will Bitcoin reach $100k by 2025?",
      answers: ["Yes", "No", "Not Sure"],
      votes: [120, 80, 30],
      image: "https://source.unsplash.com/400x300/?bitcoin",
      deadline: "2025-12-31T23:59:59Z",
      prizePool: 3.5,
    },
    {
      question: "Will AI surpass human intelligence by 2040?",
      answers: ["Absolutely", "No", "Too early to tell"],
      votes: [150, 50, 70],
      image: "https://source.unsplash.com/400x300/?ai,robot",
      deadline: "2040-01-01T00:00:00Z",
      prizePool: 5,
    },
    {
      question: "Will SpaceX land humans on Mars by 2030?",
      answers: ["Yes", "No"],
      votes: [90, 110],
      image: "https://source.unsplash.com/400x300/?mars,spacex",
      deadline: "2030-12-31T23:59:59Z",
      prizePool: 4.2,
    },
  ];

  async function connectProvider() {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        changeToNetwork(HARDHAT_NETWORK_ID);
        const network = provider.getNetwork();
        network.then((val) => {
          setProvider(provider);
          console.log("Network", val)
        }).catch((error) => {
          throw error;
        });
      } else {
        const provider = new ethers.JsonRpcProvider(ALCHEMY_ENDPOINT_PREFIX + import.meta.env.VITE_ALCHEMY_API_KEY);

        const network = provider.getNetwork();
        network.then((val) => {
          setProvider(provider);
          // setNetwork({ name: val.name, chainId: val.chainId })
          console.log("Provider Network:", val)
        }).catch((error) => {
          throw error;
        });
      }
    } catch (error) {
      throw error;
    }

    return true; // true bcoz anything problematic will raise error
  }

  useEffect(() => {
    try {
      connectProvider();
    } catch (error) {
      // setInitError(error.message);
      console.error("Error connecting to provider:", error);

      const reload = setInterval(async () => {
        let providerConnected = null;
        try {
          providerConnected = connectProvider();
        } catch (error) {
          // setInitError(error.message);
          console.error("Error connecting to provider (retrying...):", error);
        } finally {
          if (providerConnected) clearInterval(reload);
        }
      }, 10000);

      return () => clearInterval(reload);
    }
  }, [])

  useEffect(() => {
    if (!provider) return;

    const code = provider.getCode(CONTRACT_ADDRESS);
    code.then((val) => {
      try {
        if (val !== '0x') {
          const predictoDao = new ethers.Contract(CONTRACT_ADDRESS, predictoDaoArtifact.abi, provider);
          setPredictoDao(predictoDao);
        } else {
          throw new Error(`No contract deployed at ${CONTRACT_ADDRESS}. Reconnecting...`);
        }
      } catch (error) {
        console.error("Error getting contract:", error);
        setInitError(error.message);
        const reload = setInterval(() => {
          console.log("Retrying to connect to contract...");
          const code = provider.getCode(CONTRACT_ADDRESS);
          code.then((val) => {
            if (val !== '0x') {
              const predictoDao = new ethers.Contract(CONTRACT_ADDRESS, predictoDaoArtifact.abi, provider);
              setPredictoDao(predictoDao);
              // setInitError(null);
              clearInterval(reload);
            } else {
              setInitError(error.message);
            }
          });
        }, 10000);
      }
    });
  }, [provider]);

  return (
    <div className="pt-20">
      <NavBar setPage={setPage} />
      {!walletDetected && <NoWalletDetected setWalletDetected={setWalletDetected} />}
      {page === "home" &&
        <div className="px-4 py-2">
          <h1 className="text-2xl font-bold mb-6">🔥 Trending Predictions</h1>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {dummyData.map((q, idx) => (
              <QuestionCard key={idx} {...q} />
            ))}
          </div>
        </div>
      }
      {page === "new question" && <NewQuestionTab />}
      {page === "admins" && <div>Admins Section</div>}
      {page === "profile" && <div>Profile Page</div>}
      {page === "about" && <div>About Page</div>}
      {page === "contract" && <div>Contract Details</div>}
    </div>
  );
}
