import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { changeToNetwork } from "./utils";
import { Toaster, toast } from 'sonner';

import MANAGER_ABI from "./assets/PredictoAccessManagerABI.json";
import PREDICTOTOKEN_ABI from "./assets/PredictoTokenABI.json";
import QUESTION_MANAGER_ABI from "./assets/QuestionManagerABI.json";
import USER_MANAGER_ABI from "./assets/UserManagerABI.json";
import PREDICTODAO_ABI from "./assets/PredictoDaoABI.json";
import dummyData from "./assets/dummyData.json";

import QuestionCard from "./components/QuestionCard";
import NavBar from "./components/NavBar";
import QuestionManagerTab from "./components/QuestionManagerTab";
import NoWalletDetected from "./components/NoWalletDetected";
import AdminDashboard from "./components/AdminDashboard";

const HARDHAT_NETWORK_ID = '0x7A69' // 31337
const SEPOLIA_NETWORK_ID = '0xAA36A7' // 11155111

const SUDO_ADMIN = import.meta.env.VITE_SUDO_ADMIN;
const MANAGER_ADDRESS = import.meta.env.VITE_MANAGER_ADDRESS;
const PREDICTOTOKEN_ADDRESS = import.meta.env.VITE_PREDICTOTOKEN_ADDRESS;
const QUESTION_MANAGER_ADDRESS = import.meta.env.VITE_QUESTION_MANAGER_ADDRESS;
const USER_MANAGER_ADDRESS = import.meta.env.VITE_USER_MANAGER_ADDRESS;
const PREDICTODAO_ADDRESS = import.meta.env.VITE_PREDICTODAO_ADDRESS;

export default function App() {
  const [provider, setProvider] = useState(null);
  const [walletDetected, setWalletDetected] = useState(true);
  const [signer, setSigner] = useState();
  const [manager, setManager] = useState(null);
  const [token, setToken] = useState(null);
  const [questionManager, setQuestionManager] = useState(null);
  const [userManager, setUserManager] = useState(null);
  const [predictoDao, setPredictoDao] = useState(null);
  const [page, setPage] = useState("home");

  async function connectProvider() {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        changeToNetwork(HARDHAT_NETWORK_ID);
        const network = provider.getNetwork();
        network.then((val) => {
          setProvider(provider);
          console.log("Metamask Network", val)
        }).catch((error) => {
          throw error;
        });
      } else {
        const provider = new ethers.JsonRpcProvider(ALCHEMY_ENDPOINT_PREFIX + import.meta.env.VITE_ALCHEMY_API_KEY);

        const network = provider.getNetwork();
        network.then((val) => {
          setProvider(provider);
          // setNetwork({ name: val.name, chainId: val.chainId })
          console.log("Node Provider Network:", val)
        }).catch((error) => {
          throw error;
        });
      }
    } catch (error) {
      throw error;
    }

    return true; // always true bcoz anything problematic should raise an error
  }

  async function contractDeployed(contractAddr) {
    if (!provider) {
      console.error("Error getting code: Provider not assigned")
      return;
    }

    try {
      const code = await provider.getCode(contractAddr);
      if (code !== '0x') return true;
      else return false;
    } catch (error) {
      console.error("Error getting contract code:", error);
    }
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

    contractDeployed(MANAGER_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Manager not deployed");
        return;
      }

      const manager = new ethers.Contract(MANAGER_ADDRESS, MANAGER_ABI, provider);
      setManager(manager);
      console.log("Manager set.");
    });

    contractDeployed(PREDICTOTOKEN_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Manager not deployed");
        return;
      }

      const token = new ethers.Contract(PREDICTOTOKEN_ADDRESS, PREDICTOTOKEN_ABI, provider);
      setToken(token);
      console.log("Token set.");
    });

    contractDeployed(QUESTION_MANAGER_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Manager not deployed");
        return;
      }

      const questionManager = new ethers.Contract(QUESTION_MANAGER_ADDRESS, QUESTION_MANAGER_ABI, provider);
      setQuestionManager(questionManager);
      console.log("Question manager set.");
    });

    contractDeployed(USER_MANAGER_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Manager not deployed");
        return;
      }

      const userManager = new ethers.Contract(USER_MANAGER_ADDRESS, USER_MANAGER_ABI, provider);
      setUserManager(userManager);
      console.log("User manager set.");
    });

    contractDeployed(PREDICTODAO_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Manager not deployed");
        return;
      }

      const predictoDao = new ethers.Contract(PREDICTODAO_ADDRESS, PREDICTODAO_ABI, provider);
      setPredictoDao(predictoDao);
      console.log("PredictoDao set.");
    });
  }, [provider]);

  return (
    <div className="pt-20">
      <NavBar setPage={setPage} signer={signer} setSigner={setSigner} />
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
      {page === "new question" && <QuestionManagerTab />}
      {page === "admins" && <AdminDashboard managerContract={manager} signer={signer} provider={provider} />}
      {page === "profile" && <div>Profile Page</div>}
      {page === "about" && <div>About Page</div>}
      {page === "contract" && <div>Contract Details</div>}
      <Toaster />
    </div>
  );
}
