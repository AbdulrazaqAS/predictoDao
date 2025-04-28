import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ROLES } from "../utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import ManagerDashboard from "./ManagerDashboard";

const SUDO_ADMIN = import.meta.env.VITE_SUDO_ADMIN;

export default function AdminDashboard({ managerContract, signer, provider }) {
    const [signerRoles, setSignerRoles] = useState([]);

    async function getAddressRoles(address) {
        const roles = [];
        const rolesList = Object.values(ROLES);

        for (const roleId of rolesList) {
            const hasRole = await managerContract.hasRole(roleId, address);
            if (hasRole[0]) {
                roles.push(roleId);
            }
        }

        return roles;
    }

    useEffect(() => {
        if (!signer) return;
        getAddressRoles(signer).then(roles => {
            setSignerRoles(roles);
            const allRoles = Object.keys(ROLES);
            const userRoles = allRoles.filter((value) => {
                return roles.includes(ROLES[value])
            });
            console.log("Signer roles:", userRoles);
        }).catch(e => console.error("Error getting roles:", e));
    }, [signer]);

    return (
        <div>
            {signerRoles.includes(ROLES.ADMIN_ROLE) && <ManagerDashboard managerContract={managerContract} signer={signer} provider={provider}/>}
            
        </div>
    );
}
