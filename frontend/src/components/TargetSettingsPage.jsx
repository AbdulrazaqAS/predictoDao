import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ethers } from "ethers";
import { ROLES } from "../utils";
import RolesSelector from "./RolesSelector";

export default function TargetSettingsPage({ accessManagerContract, targetAddress, targetName, targetABI, signer }) {
    const [isClosed, setIsClosed] = useState(false);
    const [adminDelay, setAdminDelay] = useState("");
    const [functionToGetRole, setFunctionToGetRole] = useState("");
    const [functionsToSetRole, setFunctionsToSetRole] = useState("");
    const [targetFunctions, setTargetFunctions] = useState([]);
    const [functionRole, setFunctionRole] = useState("");
    const [roleIdToSetToFuncs, setRoleIdToSetToFuncs] = useState("");
    const [newAdminDelay, setNewAdminDelay] = useState("");
    const [closeTarget, setCloseTarget] = useState(false);
    const [cancelCaller, setCancelCaller] = useState("");
    const [cancelData, setCancelData] = useState("");
    const [newAuthority, setNewAuthority] = useState("");

    useEffect(() => {
        fetchTargetInfo();
        fetchFunctions();
    }, []);

    async function fetchFunctions() {
        const externalFuncs = targetABI
            .filter(item => item.type === "function" && item.stateMutability !== "view" && item.stateMutability !== "pure")
            .map(item => {
                return ({
                    name: item.name,
                    signature: `${item.name}(${item.inputs.map(i => i.type).join(",")})`
                });
            }).map(item => {
                const selector = ethers.id(item.signature).substring(0, 10);
                return { ...item, selector }
            });

        setTargetFunctions(externalFuncs);
    }

    async function signerCanCall(funcName) {
        const funcObj = targetFunctions.find(func => func.name === funcName);
        if (Object.keys(funcObj).length === 0) {
            console.error("Invalid function name:", funcName);
            return false;
        }

        const funcSelector = funcObj.selector;
        const canCall = await accessManagerContract.canCall(signer, targetAddress, funcSelector);
        return canCall;
    }

    async function fetchTargetInfo() {
        try {
            const closed = await accessManagerContract.isTargetClosed(targetAddress);
            const delay = await accessManagerContract.getTargetAdminDelay(targetAddress);  // Why is this not working?

            setIsClosed(closed);
            setAdminDelay(delay.toString());
            console.log("Delay", delay)
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch target info");
        }
    }

    async function fetchFunctionRole() {
        if (!functionToGetRole){
            toast.error("No function selected");
            return;
        }

        try {
            const roleId = await accessManagerContract.getTargetFunctionRole(targetAddress, functionToGetRole);
            // TODO: use labelRole
            const rolesId = Object.values(ROLES);
            const roles = Object.keys(ROLES);
            const role = roles[rolesId.indexOf(roleId)]
            setFunctionRole(role);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch function role");
        }
    }

    async function handleSetFunctionRole() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            const tx = await accessManagerContract.connect(signer).setTargetFunctionRole(
                targetAddress,
                functionsToSetRole,
                roleIdToSetToFuncs
            );
            await tx.wait();
            toast.success("Function role updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to set function role");
        }
    }

    async function handleSetAdminDelay() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            const tx = await accessManagerContract.connect(signer).setTargetAdminDelay(targetAddress, BigInt(newAdminDelay));
            const r = await tx.wait();
            console.log("Tx:", tx, "\n\nR", r);
            console.log("Admin delay set to", BigInt(newAdminDelay));
            toast.success("Admin delay updated");
            fetchTargetInfo();
        } catch (err) {
            console.error(err);
            toast.error("Failed to set admin delay");
        }
    }

    async function handleSetTargetClosed() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            const tx = await accessManagerContract.connect(signer).setTargetClosed(targetAddress, closeTarget);
            await tx.wait();
            toast.success("Target closed state updated");
            fetchTargetInfo();
        } catch (err) {
            console.error(err);
            toast.error("Failed to set target closed state");
        }
    }

    // async function handleCancelOperation() {
    //     try {
    //         const provider = new ethers.BrowserProvider(window.ethereum);
    //         const signer = await provider.getSigner(0);
    //         const tx = await accessManagerContract.connect(signer).cancel(cancelCaller, targetAddress, cancelData);
    //         await tx.wait();
    //         toast.success("Operation cancelled");
    //     } catch (err) {
    //         console.error(err);
    //         toast.error("Failed to cancel operation");
    //     }
    // }

    // async function handleHashOperation() {
    //     try {
    //         const hash = await accessManagerContract.hashOperation(cancelCaller, targetAddress, cancelData);
    //         toast.success(`Operation Hash: ${hash}`);
    //     } catch (err) {
    //         console.error(err);
    //         toast.error("Failed to hash operation");
    //     }
    // }

    async function handleUpdateAuthority() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            const tx = await accessManagerContract.connect(signer).updateAuthority(targetAddress, newAuthority);
            await tx.wait();
            toast.success("Authority updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update authority");
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{targetName} Contract Settings</h1>

            <Card className="py-4">
                <CardContent className="space-y-3 px-4">
                    <h2 className="text-xl font-semibold">Get Function Role</h2>
                    <Input
                        placeholder="Function selector (bytes4)"
                        value={functionToGetRole}
                        onChange={(e) => setFunctionToGetRole(e.target.value)}
                    />
                    <div className="flex flex-wrap text-sm gap-2 mt-2">
                        {targetFunctions.map((func, idx) => (
                            <label key={idx}>
                                <input
                                    type="radio"
                                    className="mr-1"
                                    name="funcRole"
                                    checked={functionToGetRole === func.selector}
                                    value={func.selector}
                                    onChange={e => setFunctionToGetRole(e.target.value)}
                                />
                                {func.signature}
                            </label>
                        ))}
                    </div>
                    <Button className="block" onClick={fetchFunctionRole}>Get Role</Button>
                    {functionRole && <p>Current Role: {functionRole}</p>}
                </CardContent>
            </Card>

            <Card className="py-4">
                <CardContent className="space-y-3 px-4">
                    <h2 className="text-xl font-semibold">Set Functions Role</h2>
                    <h2 className="text-md font-semibold">Role</h2>
                    <RolesSelector selected={roleIdToSetToFuncs} onSelected={setRoleIdToSetToFuncs} />
                    <h2 className="text-md font-semibold">Functions</h2>
                    <div className="flex flex-wrap text-sm gap-2 mt-2">
                        {targetFunctions.map((func, idx) => (
                            <label key={idx}>
                                <input
                                    type="checkbox"
                                    className="mr-1"
                                    name="funcRole"
                                    checked={functionsToSetRole.includes(func.selector)}
                                    value={func.selector}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        const value = e.target.value;
                                        setFunctionsToSetRole(prev => {
                                            return checked ? [...prev, e.target.value] : prev.filter(f => f != value)
                                        })
                                    }}
                                />
                                {func.signature}
                            </label>
                        ))}
                    </div>
                    <Button onClick={handleSetFunctionRole}>Set Role</Button>
                </CardContent>
            </Card>

            <Card className="py-4">
                <CardContent className="space-y-3 px-4">
                    <h2 className="text-xl font-semibold">Set Admin Delay</h2>
                    <Input
                        placeholder="New delay (seconds)"
                        type="number"
                        value={newAdminDelay}
                        min="0"
                        onChange={(e) => setNewAdminDelay(e.target.value)}
                    />
                    <Button onClick={handleSetAdminDelay}>Update Delay</Button>
                    <p className="text-sm">Current Delay: {adminDelay} seconds</p>
                </CardContent>
            </Card>
            
            {/* TODO: Disable all buttons when closed */}
            <Card className="py-4">
                <CardContent className="space-y-3 px-4">
                    <h2 className="text-xl font-semibold">Close or Open Target</h2>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={closeTarget}
                            onChange={(e) => setCloseTarget(e.target.checked)}
                        />
                        <span>Close Target?</span>
                    </label>
                    <Button onClick={handleSetTargetClosed}>Update Status</Button>
                    <p className="text-sm">Is Closed: {isClosed ? "Yes" : "No"}</p>
                </CardContent>
            </Card>

            {/* <Card>
                <CardContent className="space-y-3 px-4">
                    <h2 className="text-xl font-semibold">Cancel Operation</h2>
                    <Input
                        placeholder="Caller address"
                        value={cancelCaller}
                        onChange={(e) => setCancelCaller(e.target.value)}
                    />
                    <Input
                        placeholder="Data (hex)"
                        value={cancelData}
                        onChange={(e) => setCancelData(e.target.value)}
                    />
                    <div className="space-x-3">
                        <Button onClick={handleCancelOperation}>Cancel</Button>
                        <Button onClick={handleHashOperation}>Hash Operation</Button>
                    </div>
                </CardContent>
            </Card> */}

            <Card className="py-4">
                <CardContent className="space-y-3 px-4">
                    <h2 className="text-xl font-semibold">Update Authority</h2>
                    <Input
                        placeholder="New Authority Address"
                        value={newAuthority}
                        onChange={(e) => setNewAuthority(e.target.value)}
                    />
                    <Button onClick={handleUpdateAuthority}>Update Authority</Button>
                </CardContent>
            </Card>
        </div>
    );
}
