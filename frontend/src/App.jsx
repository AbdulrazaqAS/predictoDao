import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ROLES } from "./utils";
import { Toaster, toast } from 'sonner';

import MANAGER_ABI from "./assets/PredictoAccessManagerABI.json";
import PREDICTOTOKEN_ABI from "./assets/PredictoTokenABI.json";
import QUESTION_MANAGER_ABI from "./assets/QuestionManagerABI.json";
import USER_MANAGER_ABI from "./assets/UserManagerABI.json";
import PREDICTODAO_ABI from "./assets/PredictoDaoABI.json";
import dummyData from "./assets/dummyData.json";

import QuestionCard from "./components/QuestionCard";
import NavBar from "./components/NavBar";
import NoWalletDetected from "./components/NoWalletDetected";
import ContractsPage from "./components/ContractsPage";

const HARDHAT_NETWORK_ID = '0x7A69' // 31337
const SEPOLIA_NETWORK_ID = '0xAA36A7' // 11155111
const isHardhat = false;

const ALCHEMY_ENDPOINT_PREFIX = 'https://eth-sepolia.g.alchemy.com/v2/';

const MANAGER_ADDRESS = import.meta.env.VITE_MANAGER_ADDRESS;
const PREDICTOTOKEN_ADDRESS = import.meta.env.VITE_PREDICTOTOKEN_ADDRESS;
const QUESTION_MANAGER_ADDRESS = import.meta.env.VITE_QUESTION_MANAGER_ADDRESS;
const USER_MANAGER_ADDRESS = import.meta.env.VITE_USER_MANAGER_ADDRESS;
const PREDICTODAO_ADDRESS = import.meta.env.VITE_PREDICTODAO_ADDRESS;

export default function App() {
  const [provider, setProvider] = useState(null);
  const [walletDetected, setWalletDetected] = useState(true);
  const [signer, setSigner] = useState();
  const [accessManagerContract, setAccessManagerContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [questionManagerContract, setQuestionManagerContract] = useState(null);
  const [userManagerContract, setUserManagerContract] = useState(null);
  const [daoContract, setDaoContract] = useState(null);
  const [page, setPage] = useState("home");
  const [signerRoles, setSignerRoles] = useState([]);

  async function connectProvider() {
    try {
      if (isHardhat) {  // Hardhat Network
        if (!window.ethereum) {
          setWalletDetected(false);
          throw new Error("No wallet detected");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = provider.getNetwork();
        network.then((val) => {
          setProvider(provider);
          console.log("Metamask Hardhat Network", val)
        }).catch((error) => {
          throw error;
        });
      } else {  // Sepolia Network
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

  async function getSignerRoles() {
    const roles = [];
    const rolesList = Object.values(ROLES);

    for (const roleId of rolesList) {
      const hasRole = await accessManagerContract.hasRole(roleId, signer);
      if (hasRole[0]) {
        roles.push(roleId);
      }
    }

    return roles;
  }

  useEffect(() => {
    if (!signer) return;
    getSignerRoles(signer).then(roles => {
      setSignerRoles(roles);
      const allRoles = Object.keys(ROLES);
      const userRoles = allRoles.filter((value) => {  // Getting the readable roles names just to print them
        return roles.includes(ROLES[value])
      });
      console.log("Signer roles:", userRoles);
    }).catch(e => console.error("Error getting roles:", e));
  }, [signer]);

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
        console.error("Manager contract not deployed");
        return;
      }

      const accessManagerContract = new ethers.Contract(MANAGER_ADDRESS, MANAGER_ABI, provider);
      setAccessManagerContract(accessManagerContract);
      console.log("Manager contract set.");
    });

    contractDeployed(PREDICTOTOKEN_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Token contract not deployed");
        return;
      }

      const tokenContract = new ethers.Contract(PREDICTOTOKEN_ADDRESS, PREDICTOTOKEN_ABI, provider);
      setTokenContract(tokenContract);
      console.log("Token contract set.");
    });

    contractDeployed(QUESTION_MANAGER_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("Question manager contract not deployed");
        return;
      }

      const questionManagerContract = new ethers.Contract(QUESTION_MANAGER_ADDRESS, QUESTION_MANAGER_ABI, provider);
      setQuestionManagerContract(questionManagerContract);
      console.log("Question manager set.");
    });

    contractDeployed(USER_MANAGER_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("User manager not deployed");
        return;
      }

      const userManagerContract = new ethers.Contract(USER_MANAGER_ADDRESS, USER_MANAGER_ABI, provider);
      setUserManagerContract(userManagerContract);
      console.log("User manager set.");
    });

    contractDeployed(PREDICTODAO_ADDRESS).then(deployed => {
      if (!deployed) {
        console.error("PredictoDao contract not deployed");
        return;
      }

      const daoContract = new ethers.Contract(PREDICTODAO_ADDRESS, PREDICTODAO_ABI, provider);
      setDaoContract(daoContract);
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
      {page === "profile" && <div>Profile Page</div>}
      {page === "about" && <div>About Page</div>}
      {page === "contracts" &&
        <ContractsPage
          accessManagerContract={accessManagerContract}
          questionManagerContract={questionManagerContract}
          signer={signer}
          signerRoles={signerRoles}
        />
      }
      <Toaster />
    </div>
  );
}
