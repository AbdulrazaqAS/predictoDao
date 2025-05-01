import React, { useState, useEffect } from "react";
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

import RolesSelector from "./RolesSelector";

import PREDICTOTOKEN_ABI from "../assets/PredictoTokenABI.json";
import QUESTION_MANAGER_ABI from "../assets/QuestionManagerABI.json";
import { ROLES } from "../utils";

const PREDICTOTOKEN_ADDRESS = import.meta.env.VITE_PREDICTOTOKEN_ADDRESS;
const QUESTION_MANAGER_ADDRESS = import.meta.env.VITE_QUESTION_MANAGER_ADDRESS;

export default function AccessManagerDashboard({ accessManagerContract, signer, signerRoles }) {
    const [grantAddress, setGrantAddress] = useState("");
    const [revokeAddress, setRevokeAddress] = useState("");
    const [roleToGrant, setRoleToGrant] = useState("");
    const [roleToRevoke, setRoleToRevoke] = useState("");
    const [callTarget, setCallTarget] = useState("");
    const [callData, setCallData] = useState("");

    const [contractToGetFuncRole, setContractToGetFuncRole] = useState({});
    const [contractToGetFuncRoleName, setContractToGetFuncRoleName] = useState("");
    const [functionToGetRole, setFunctionToGetRole] = useState("");
    const [functionRole, setFunctionRole] = useState("");

    const [contractToSetFuncsRole, setContractToSetFuncsRole] = useState({});
    const [contractToSetFuncsRoleName, setContractToSetFuncsRoleName] = useState("");
    const [functionsToSetRole, setFunctionsToSetRole] = useState([]);
    const [roleToSetToFuncs, setRoleToSetToFuncs] = useState("");

    const [contractToSetAdminDelay, setContractToSetAdminDelay] = useState({});
    const [adminDelay, setAdminDelay] = useState(0);
    const [newAdminDelay, setNewAdminDelay] = useState(0);

    const [contractToClose, setContractToClose] = useState({});
    const [isClosed, setIsClosed] = useState(false);

    const [contractToSetAuthority, setContractToSetAuthority] = useState({});
    const [newAuthority, setNewAuthority] = useState("");

    const requiredRoles = [ROLES.ADMIN_ROLE];
    
    const targets = [
        { address: PREDICTOTOKEN_ADDRESS, name: "PredictoToken", functions: getTargetFunctions(PREDICTOTOKEN_ABI) },
        { address: QUESTION_MANAGER_ADDRESS, name: "QuestionManager", functions: getTargetFunctions(QUESTION_MANAGER_ABI) }
    ];

    // TODO: Get only restricted functions
    function getTargetFunctions(targetABI) {
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

        return externalFuncs;
    }

    function hasRequiredRole() {
        hasRole = false;
        for (const role of requiredRoles) {
            if (signerRoles.includes(role)) {
                hasRole = true;
                break;
            }
        }

        if (!hasRole) {
            toast.error("You don't have permission to perform this action.");
            return false;
        }

        return true;
    }

    async function handleGrantRole() {
        // if (!window.ethereum) {  // TODO: Use error bar
        //     toast.error("No wallet detected");
        //     return;
        // }

        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!hasRequiredRole()) return;

        if (!grantAddress || grantAddress.length != 42) {  // 42 = 20 bytes + Ox
            toast.error("Invalid Address");
            console.error("Invalid address")
            return;
        }

        if (!roleToGrant) {
            toast.error("No role selected");
            console.error("No role selected")
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);

            // TODO: Add a delay input and use it
            const tx = await accessManagerContract.connect(signer).grantRole(BigInt(roleToGrant), grantAddress, 0);
            await tx.wait();
            toast.success("Role granted!");
        } catch (err) {
            toast.error("Failed to grant role");
            console.error(err);
        }
    }

    async function handleRevokeRole() {
        // if (!window.ethereum) {
        //     toast.error("No wallet detected");
        //     return;
        // }

        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!hasRequiredRole()) return;

        if (!revokeAddress || revokeAddress.length != 42) {  // 42 = 20 bytes + Ox
            toast.error("Invalid Address");
            console.error("Invalid address")
            return;
        }

        if (!roleToRevoke) {
            toast.error("No role selected");
            console.error("No role selected")
            return;
        }

        // TODO: Chech whether the revoke addr hasRole

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);

            const tx = await accessManagerContract.connect(signer).revokeRole(roleToRevoke, revokeAddress);
            await tx.wait();
            toast.success("Role revoked!");
        } catch (err) {
            toast.error("Failed to revoke role");
            console.error(err);
        }
    }

    async function fetchFunctionRole() {
        if (!contractToGetFuncRoleName){
            toast.error("No contract selected");
            return;
        }

        if (!functionToGetRole){
            toast.error("No function selected");
            return;
        }

        try {
            const roleId = await accessManagerContract.getTargetFunctionRole(contractToGetFuncRole.address, functionToGetRole);
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

    async function fetchAdminDelay() {
        if (!signer || !contractToSetAdminDelay.address) {
            return;
        }

        try {
            const delay = await accessManagerContract.getTargetAdminDelay(contractToSetAdminDelay.address);
            setAdminDelay(delay.toString());
            console.log(contractToSetAdminDelay.name, "admin delay", delay);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch admin delay");
        }
    }

    async function fetchIsClosed() {
        try {
            const closed = await accessManagerContract.isTargetClosed(contractToClose.address);
            setIsClosed(closed);
        } catch (err) {
            console.error("Failed to fetch isClosed status:", err);
        }
    }

    async function handleSetFunctionsRole() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!contractToSetFuncsRoleName) {
            toast.error("No contract selected");
            return;
        }

        if (!functionsToSetRole || functionsToSetRole.length == 0) {
            toast.error("No function selected");
            return;
        }

        if (!roleToSetToFuncs) {
            toast.error("No role selected");
            return;
        }

        console.log("Setting functions role", contractToSetFuncsRole.address, functionsToSetRole, roleToSetToFuncs);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            const tx = await accessManagerContract.connect(signer).setTargetFunctionRole(
                contractToSetFuncsRole.address,
                functionsToSetRole,
                roleToSetToFuncs
            );
            await tx.wait();
            toast.success("Functions role updated");
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

        if (!contractToSetAdminDelay.name) {
            toast.error("No contract selected");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            const tx = await accessManagerContract.connect(signer).setTargetAdminDelay(contractToSetAdminDelay.address, newAdminDelay);
            await tx.wait();
            // console.log("Tx:", tx, "\n\nR", r);
            console.log(contractToSetAdminDelay.name, "admin delay set to", BigInt(newAdminDelay));
            toast.success("Admin delay updated");
            fetchAdminDelay();
        } catch (err) {
            console.error(err);
            toast.error("Failed to set admin delay");
        }
    }

    async function handleSetClosed() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            console.log("Updating closed status for,")
            const tx = await accessManagerContract.connect(signer).setTargetClosed(contractToClose.address, !isClosed);
            await tx.wait();
            toast.success("Target closed state updated");
            fetchIsClosed();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update target closed state");
        }
    }

    async function handleUpdateAuthority() {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!contractToSetAuthority.name) {
            toast.error("No contract selected");
            return;
        }

        if (newAuthority.length != 42 || newAuthority.substring(0, 2) !== "0x"){
            toast.error("Invalid Address");
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);
            console.log("Updating authority for", contractToSetAuthority.name);
            const tx = await accessManagerContract.connect(signer).updateAuthority(contractToSetAuthority.address, newAuthority);
            await tx.wait();
            toast.success("Authority updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update authority");
        }
    }

    // async function handleExecuteCall() {
    //     if (!window.ethereum) {
    //         toast.error("No wallet detected");
    //         return;
    //     }

    //     if (!hasRequiredRole()) return;

    //     try {
    //         const tx = await accessManagerContract.connect(signer).execute(callTarget, callData);
    //         await tx.wait();
    //         toast.success("Call executed!");
    //     } catch (err) {
    //         toast.error("Call execution failed");
    //         console.error(err);
    //     }
    // }

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

    // useEffect(() => {
    //     fetchAdminDelay();
    // }, [accessManagerContract]);

    return (
        <div className="grid gap-6 p-4 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold">Access Manager Contract Settings</h1>
            <Card className="py-4">
                <CardContent className="px-4">
                    <h2 className="text-xl font-bold mb-2">Grant Role</h2>
                    <Input
                        placeholder="Address to grant role"
                        value={grantAddress}
                        onChange={(e) => setGrantAddress(e.target.value)}
                    />
                    <RolesSelector selected={roleToGrant} onSelected={setRoleToGrant} />
                    <Button className="mt-2" onClick={handleGrantRole}>Grant</Button>
                </CardContent>
            </Card>

            <Card className="py-4">
                <CardContent className="px-4">
                    <h2 className="text-xl font-bold mb-2">Revoke Role</h2>
                    <Input
                        placeholder="Address to revoke role"
                        value={revokeAddress}
                        onChange={(e) => setRevokeAddress(e.target.value)}
                    />
                    <RolesSelector selected={roleToRevoke} onSelected={setRoleToRevoke} />
                    <Button className="mt-2" onClick={handleRevokeRole}>Revoke</Button>
                </CardContent>
            </Card>

            {/* <Card>
                <CardContent className="p-4">
                    <h2 className="text-xl font-bold mb-2">Execute Call</h2>
                    <Input
                        placeholder="Target contract address"
                        value={callTarget}
                        onChange={(e) => setCallTarget(e.target.value)}
                    />
                    <Input
                        placeholder="Calldata (0x...)"
                        value={callData}
                        onChange={(e) => setCallData(e.target.value)}
                        className="mt-2"
                    />
                    <Button className="mt-2" onClick={handleExecuteCall}>Execute</Button>
                </CardContent>
            </Card> */}

            <Card className="py-4">
                <CardHeader className="px-4">
                    <CardTitle>Get Function's Role</CardTitle>
                </CardHeader>

                <CardContent className="flex space-x-4 px-4">
                    {/* Contract dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Contract</label>
                        <Select value={contractToGetFuncRoleName} onValueChange={(val) => {
                            setContractToGetFuncRole(targets.find(t => t.name === val));
                            setContractToGetFuncRoleName(val);
                            setFunctionToGetRole(""); // Reset function when contract changes
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select contract" />
                            </SelectTrigger>
                            <SelectContent>
                                {targets.map((t) => (
                                    <SelectItem key={t.name} value={t.name}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Function dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Function</label>
                        <Select value={functionToGetRole} onValueChange={setFunctionToGetRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select function" />
                            </SelectTrigger>
                            <SelectContent>
                                {(contractToGetFuncRole.functions || []).map((fn) => (
                                    <SelectItem key={fn.name} value={fn.selector}>
                                        {fn.signature}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>

                <CardContent className="px-4 space-y-4">
                    <Button className="block" onClick={fetchFunctionRole}>Get Role</Button>
                    {functionRole && <p>Current Role: {functionRole}</p>}
                </CardContent>
            </Card>
            
            {/* Set Functions Role Card */}
            <Card className="py-4">
                <CardHeader className="px-4">
                    <CardTitle>Set Functions Role</CardTitle>
                </CardHeader>

                <CardContent className="flex space-x-4 px-4">
                    {/* Contract dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Contract</label>
                        <Select value={contractToSetFuncsRoleName} onValueChange={(val) => {
                            setContractToSetFuncsRole(targets.find(t => t.name === val));
                            setContractToSetFuncsRoleName(val);
                            setFunctionsToSetRole([]); // Reset functions when contract changes
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select contract" />
                            </SelectTrigger>
                            <SelectContent>
                                {targets.map((t) => (
                                    <SelectItem key={t.name} value={t.name}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Role dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <Select value={roleToSetToFuncs} onValueChange={setRoleToSetToFuncs}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(ROLES).map((role) => (
                                    <SelectItem key={role} value={ROLES[role].toString()}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>

                {/* Functions list */}
                <CardContent className="space-y-4">
                    <label className="block text-sm font-medium mb-1">Functions</label>
                    <div className="flex flex-wrap text-sm gap-2 mt-2">
                        {(contractToSetFuncsRole.functions || []).map((func, idx) => (
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
                </CardContent>
                <CardContent className="px-4">
                    <Button className="block" onClick={handleSetFunctionsRole}>Set Role</Button>
                </CardContent>
            </Card>
            
            {/* Set admin delay */}
            <Card className="py-4">
                <CardHeader className="text-xl font-semibold">
                    <CardTitle>Set Admin Delay</CardTitle>
                </CardHeader>

                <CardContent className="flex space-x-4 px-4">
                    {/* Contract dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Contract</label>
                        <Select value={contractToSetAdminDelay.name} onValueChange={(val) => {
                            setContractToSetAdminDelay(targets.find(t => t.name === val));
                            fetchAdminDelay();
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select contract" />
                            </SelectTrigger>
                            <SelectContent>
                                {targets.map((t) => (
                                    <SelectItem key={t.name} value={t.name}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Delay input */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Delay (secs)</label>
                        <Input
                            placeholder="New delay"
                            type="number"
                            value={newAdminDelay}
                            min="0"
                            onChange={(e) => setNewAdminDelay(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardContent className="px-4 space-y-4">
                    <Button className="block" onClick={handleSetAdminDelay}>Update Delay</Button>
                    <p className="text-sm">Current Delay: {adminDelay} seconds</p>
                </CardContent>
            </Card>

            {/* Contract closed status */}
            <Card className="py-4">
                <CardHeader className="text-xl font-semibold">
                    <CardTitle>Close Contract</CardTitle>
                </CardHeader>

                <CardContent className="px-4">
                    {/* Contract dropdown */}
                    <label className="block text-sm font-medium mb-1">Contract</label>
                    <Select value={contractToClose.name} onValueChange={(val) => {
                        setContractToClose(targets.find(t => t.name === val));
                        fetchIsClosed();
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select contract" />
                        </SelectTrigger>
                        <SelectContent>
                            {targets.map((t) => (
                                <SelectItem key={t.name} value={t.name}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>

                <CardContent className="px-4">
                    <Button className="block" onClick={handleSetClosed}>{isClosed ? "Open" : "Close"}</Button>
                </CardContent>
            </Card>

            {/* Update authority */}
            <Card className="py-4">
                <CardHeader className="text-xl font-semibold">
                    <CardTitle>Update Authority</CardTitle>
                </CardHeader>

                <CardContent className="flex space-x-4 px-4">
                    {/* Contract dropdown */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Contract</label>
                        <Select value={contractToSetAuthority.name} onValueChange={(val) => {
                            setContractToSetAuthority(targets.find(t => t.name === val));
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select contract" />
                            </SelectTrigger>
                            <SelectContent>
                                {targets.map((t) => (
                                    <SelectItem key={t.name} value={t.name}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* New Authority */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Authority</label>
                        <Input
                            placeholder="New authority"
                            value={newAuthority}
                            min="42"
                            max="42"
                            onChange={(e) => setNewAuthority(e.target.value)}
                        />
                    </div>
                </CardContent>

                <CardContent className="px-4 space-y-4">
                    <Button className="block" onClick={handleUpdateAuthority}>Update</Button>
                </CardContent>
            </Card>
        </div>
    );
}
