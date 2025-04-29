import { useEffect, useState } from "react";
import axios from "axios";
import {ROLES} from "../utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import NewQuestionDashboard from "./NewQuestionDashboard";

export default function QuestionManagerDashboard({ questionManagerContract, signer, signerRoles }) {
    const [minStringLength, setMinStringLength] = useState(0);
    const [minDuration, setMinDuration] = useState(0);
    const [newMinStringLength, setNewMinStringLength] = useState(0);
    const [newMinDuration, setNewMinDuration] = useState(0);
    

    const requiredRoles = [ROLES.ADMIN_ROLE];

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

    async function handleSetMinStringLength() {
        if (!window.ethereum) {
            toast.error("No wallet detected");
            return;
        }

        if (!hasRequiredRole()) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);

            const tx = await questionManagerContract.connect(signer).setMinStringBytes(newMinStringLenght);
            await tx.wait();
            toast.success("Minimum string length updated successfully");
        } catch (err) {
            toast.error("Failed to update minimum string length");
            console.error(err);
        }
    }

    async function handleSetMinDuration() {
        if (!window.ethereum) {
            toast.error("No wallet detected");
            return;
        }

        if (!hasRequiredRole()) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(0);

            const tx = await questionManagerContract.connect(signer).setMinDuration(newMinDuration);
            await tx.wait();
            toast.success("Minimum duration updated successfully");
        } catch (err) {
            toast.error("Failed to update minimum duration");
            console.error(err);
        }
    }

    async function fetchMinStringLength() {
        try {
            const length = await questionManagerContract.minStringBytes();
            setMinStringLength(length.toString());
        } catch (err) {
            console.error("Error fetching minimum string length:", err);
        }
    }

    async function fetchMinDuration() {
        try {
            const duration = await questionManagerContract.minDuration();
            setMinDuration(duration.toString());
        } catch (err) {
            console.error("Error fetching minimum duration:", err);
        }
    }

    useEffect(() => {
        if (!questionManagerContract) return;

        fetchMinStringLength();
        fetchMinDuration();
    }, [questionManagerContract]);

    return (
        <div className="flex flex-col space-y-4 p-4 md:space-x-4 items-first justify-around md:space-y-0 md:flex-row">
            <NewQuestionDashboard />
            <div className="flex flex-col space-y-4 w-full md:w-2/5">
                <Card className="py-4">
                    <CardContent className="space-y-3 px-4">
                        <h2 className="text-xl font-semibold">Set Minimum String Length</h2>
                        <Input
                            placeholder="New length"
                            type="number"
                            value={newMinStringLength}
                            min="0"
                            onChange={(e) => setNewMinStringLength(e.target.value)}
                        />
                        <Button onClick={handleSetMinStringLength}>Update Length</Button>
                        <p className="text-sm">Current Length: {minStringLength} characters</p>
                    </CardContent>
                </Card>

                <Card className="py-4">
                    <CardContent className="space-y-3 px-4">
                        <h2 className="text-xl font-semibold">Set Minimum Duration</h2>
                        <Input
                            placeholder="New duration (seconds)"
                            type="number"
                            value={newMinDuration}
                            min="0"
                            onChange={(e) => setNewMinDuration(e.target.value)}
                        />
                        <Button onClick={handleSetMinDuration}>Update Duration</Button>
                        <p className="text-sm">Current Duration: {minDuration} seconds</p>
                    </CardContent>
                </Card >
            </div>
        </div>
    );
}
