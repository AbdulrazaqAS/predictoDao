import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import formidable from 'formidable';
import fs from "fs";
import FormData from "form-data";

dotenv.config({path : "./.env.local"});
const app = express();
const PORT = 5000;
app.use(cors());

app.post("/api/uploadToIPFS", (req, res) => {
    const form = formidable({ keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: "Form parsing error" });

        if (Object.keys(files).length === 0) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        try {
            const image = files.image[0];

            const fileStream = fs.createReadStream(image.filepath);
            const formData = new FormData();  // using imported not built-in FormData to properly handle filestream. Built-in FormData doesn't support filestream.
            formData.append("file", fileStream, {
                filename: image.originalFilename,
                contentType: image.mimetype,
            });

            const pinataJwt = process.env.PINATA_API_JWT;
            const imgResponse = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        Authorization: `Bearer ${pinataJwt}`,
                    },
                }
            );

            console.log("IpfsHash:", imgResponse.data.IpfsHash);
            return res.status(200).json({ ipfsHash: imgResponse.data.IpfsHash });
        } catch (error) {
            console.error("Upload error:", error);
            return res.status(500).json({ error: "Failed to upload" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Local server running on http://localhost:${PORT}`);
});
