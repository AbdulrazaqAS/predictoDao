import { useEffect, useState } from "react";

import AccessManagerDashboard from "./AccessManagerDashboard";
import QuestionManagerDashboard from "./QuestionManagerDashboard";

export default function ContractsPage({ accessManagerContract, questionManagerContract, signer, signerRoles }) {
    const [activeContract, setActiveContract] = useState({});
    const [contracts, setContracts] = useState([]);
    
    useEffect(() => {
        const contracts = [
            { name: "AccessManager", component: AccessManagerDashboard, props: {
                    accessManagerContract: accessManagerContract, signer: signer, signerRoles: signerRoles
                }
            },
            { name: "QuestionManager", component: QuestionManagerDashboard, props: {
                    questionManagerContract: questionManagerContract, signer, signerRoles
                }
            },
        ];

        setContracts(contracts);

        const prevActiveContract = contracts.find((contract) => contract.name === activeContract.name);
        setActiveContract(prevActiveContract || contracts[0]);
    }, [accessManagerContract, questionManagerContract, signer, signerRoles]);

    return (
        <div className="w-full p-4">
            <div className="flex gap-4 border-b pb-2 mb-4">
                {contracts.map((contract) => (
                    <button
                        key={contract.name}
                        className={`text-sm font-medium pb-1 ${activeContract.name === contract.name
                                ? "border-b-2 border-blue-500 text-blue-600"
                                : "text-gray-500 hover:text-blue-500"
                            }`}
                        onClick={() => setActiveContract(contract)}
                    >
                        {contract.name}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {/*  */}
                {activeContract.name && <activeContract.component {...activeContract.props} />}
            </div>
        </div>
    );
}
