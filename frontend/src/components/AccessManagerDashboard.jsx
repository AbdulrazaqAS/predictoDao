import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ethers } from "ethers";

import TargetSettingsPage from "./TargetSettingsPage";
import RolesSelector from "./RolesSelector";

import PREDICTOTOKEN_ABI from "../assets/PredictoTokenABI.json";
import QUESTION_MANAGER_ABI from "../assets/QuestionManagerABI.json";
import USER_MANAGER_ABI from "../assets/UserManagerABI.json";
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
    const [targets, setTargets] = useState([]);

    const requiredRoles = [ROLES.ADMIN_ROLE];

    useEffect(() => {
        if (!accessManagerContract) return;

        const targets = [
            {address: PREDICTOTOKEN_ADDRESS, name: "Predicto Token", abi: PREDICTOTOKEN_ABI},
            {address: QUESTION_MANAGER_ADDRESS, name: "Question Manager", abi: QUESTION_MANAGER_ABI}
        ];

        setTargets(targets);
    }, [accessManagerContract]);

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
        if (!window.ethereum) {  // TODO: Use error bar
            toast.error("No wallet detected");
            return;
        }
        
        if (!hasRequiredRole()) return;

        if (!grantAddress || grantAddress.length != 42) {  // 42 = 20 bytes + Ox
            toast.error("Invalid Address");
            console.error("Invalid address")
            return;
        }
        
        if (!roleToGrant){
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
        if (!window.ethereum) {
            toast.error("No wallet detected");
            return;
        }
        
        if (!hasRequiredRole()) return;

        if (!revokeAddress || revokeAddress.length != 42) {  // 42 = 20 bytes + Ox
            toast.error("Invalid Address");
            console.error("Invalid address")
            return;
        }
        
        if (!roleToRevoke){
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

    async function handleExecuteCall() {
        if (!window.ethereum) {
            toast.error("No wallet detected");
            return;
        }
        
        if (!hasRequiredRole()) return;

        try {
            const tx = await accessManagerContract.connect(signer).execute(callTarget, callData);
            await tx.wait();
            toast.success("Call executed!");
        } catch (err) {
            toast.error("Call execution failed");
            console.error(err);
        }
    }

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
                    {/* <div className="flex flex-wrap text-sm gap-2 mt-2">
                        {Object.keys(ROLES).map((role, idx) => (
                            <label key={idx}>
                                <input
                                    type="radio"
                                    className="mr-1"
                                    name="grantRoles"
                                    checked={roleToGrant == ROLES[role]}
                                    value={ROLES[role]}
                                    onChange={e => setRoleToGrant(e.target.value)}
                                />
                                {role}
                            </label>
                        ))}
                    </div> */}
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
                    {/* <div className="flex flex-wrap text-sm gap-2 mt-2">
                        {Object.keys(ROLES).map((role, idx) => (
                            <label key={idx}>
                                <input
                                    type="radio"
                                    className="mr-1"
                                    name="revokeRoles"
                                    checked={roleToRevoke == ROLES[role]}
                                    value={ROLES[role]}
                                    onChange={e => setRoleToRevoke(e.target.value)}
                                />
                                {role}
                            </label>
                        ))}
                    </div> */}
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

            {targets.map((target, idx) => (
                <TargetSettingsPage
                    key={idx}
                    accessManagerContract={accessManagerContract}
                    targetAddress={target.address}
                    targetName={target.name}
                    targetABI={target.abi}
                    signer={signer}
                />
            ))}
        </div>
    );
}
