import { useState } from "react";
import axios from "axios";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function NewQuestionDashboard() {
    const [question, setQuestion] = useState("");
    const [answers, setAnswers] = useState([""]);
    const [image, setImage] = useState(null);
    const [deadline, setDeadline] = useState("");
    const [hasPrize, setHasPrize] = useState(false);
    const [prize, setPrize] = useState("");
    const [focusedAnswer, setFocusedAnswer] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const MAX_QUESTION_LEN = 32;
    const MAX_ANSWER_LEN = 32;

    const handleAnswerChange = (index, value) => {
        const updated = [...answers];
        updated[index] = value;
        setAnswers(updated);
    };

    const addAnswerField = () => {
        setAnswers([...answers, ""]);
    };

    const handleImageChange = (e) => {
        if (e.target.files.length > 0) {
            setImage(e.target.files[0]);
        }
    };

    const uploadToIPFS = async () => {
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.set("image", image);

            const isDev = import.meta.env.DEV; // true in dev, false in build
            const endpoint = isDev
                ? "http://localhost:5000/api/uploadToIPFS"
                : "/api/uploadToIPFS";
            console.log("Endpoint:", endpoint);

            const response = await axios.post(endpoint, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("Response:", response);
            const result = response.data;

            if (response.statusText === "OK" || response.status === 200) {
                return result.ipfsHash;
            } else {
                throw new Error(result.error || "Unknown error");
            }
        } catch (error) {
            console.error("Error uploading to IPFS:", error);
            alert("Uploading to IPFS failed.");
            return "";
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const ipfsHash = await uploadToIPFS();
        if (!ipfsHash) return;

        setIsCreating(true);

        const payload = {
            question,
            answers: answers.filter(a => a.trim() !== ""),
            ipfsHash,
            deadline,
            prize: hasPrize ? prize : 0
        };
        try {
            console.log("Submitting:", payload);
        } catch (error) {
            console.error("Error creating question:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Card className="py-4 bg-white rounded-2xl w-full md:w-3/5">
            <CardContent className="px-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <h2 className="text-xl font-semibold text-gray-800">Create New Question</h2>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block border rounded p-2 w-full"
                            required
                        />
                    </div>

                    {/* Question */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question ({question.length}/{MAX_QUESTION_LEN})</label>
                        <input
                            type="text"
                            value={question}
                            maxLength={MAX_QUESTION_LEN}
                            onChange={(e) => setQuestion(e.target.value)}
                            required
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    {/* Answers */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Answers ({answers[focusedAnswer].length}/{MAX_ANSWER_LEN})</label>
                        {answers.map((answer, idx) => (
                            <input
                                key={idx}
                                type="text"
                                value={answer}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                onFocus={() => setFocusedAnswer(idx)}
                                maxLength={MAX_ANSWER_LEN}
                                required
                                className="w-full mb-2 p-2 border rounded"
                                placeholder={`Answer ${idx + 1}`}
                            />
                        ))}
                        <button
                            type="button"
                            onClick={addAnswerField}
                            className="text-sm text-blue-600 hover:underline mt-1"
                        >
                            + Add Another Answer
                        </button>
                    </div>

                    {/* Deadline */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            required
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    {/* Optional Prize */}
                    <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700">Prize?</label>
                        <input
                            type="checkbox"
                            checked={hasPrize}
                            onChange={() => setHasPrize(!hasPrize)}
                            className="h-4 w-4"
                        />
                    </div>
                    {hasPrize && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prize Amount (ETH)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={prize}
                                onChange={(e) => setPrize(e.target.value)}
                                required
                                className="w-full p-2 border rounded"
                            />
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full hover:bg-gray-800 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
                        disabled={isUploading || isCreating}
                    >
                        {isUploading ? "Uploading to IPFS" : isCreating ? "Creating..." : "Submit Question"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
