import { useState } from "react";
import axios from "axios";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import NewQuestionTab from "./NewQuestionTab";

export default function QuestionManagerTab() {
    const [minStringLength, setMinStringLength] = useState(0);
    const [minDuration, setMinDuration] = useState(0);

    async function handleSetMinStringLength() {}
    async function handleSetMinDuration() {}

    return (
        <div className="flex flex-col space-y-4 p-4 md:space-x-4 items-first justify-around md:space-y-0 md:flex-row">
            <NewQuestionTab />
            <div className="flex flex-col space-y-4 w-full md:w-2/5">
                <Card className="py-4">
                    <CardContent className="space-y-3 px-4">
                        <h2 className="text-xl font-semibold">Set Minimum String Length</h2>
                        <Input
                            placeholder="New length"
                            type="number"
                            value={minStringLength}
                            min="0"
                            onChange={(e) => setMinStringLength(e.target.value)}
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
                            value={minDuration}
                            min="0"
                            onChange={(e) => setMinDuration(e.target.value)}
                        />
                        <Button onClick={handleSetMinDuration}>Update Duration</Button>
                        <p className="text-sm">Current Duration: {minDuration} seconds</p>
                    </CardContent>
                </Card >
            </div>
        </div>
    );
}
