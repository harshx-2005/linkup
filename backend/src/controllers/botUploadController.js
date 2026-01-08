const cloudinary = require('../config/cloudinary');
const stream = require('stream');

const uploadBotFile = async (req, res) => {
    try {
        if (!req.file) {
            console.error("Bot Upload: No file received");
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        console.log(`Bot Upload: Received file ${req.file.originalname} (${req.file.size} bytes)`);

        // Upload to Cloudinary using a stream from the buffer
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'linkup_bot_uploads',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Error:", error);
                    return res.status(500).json({ message: 'Cloudinary upload failed', error: error.message });
                }

                console.log("Bot Upload Success:", result.secure_url);
                res.json({
                    url: result.secure_url,
                    filename: result.original_filename,
                    mimetype: result.format
                });
            }
        );

        // Pipe buffer to Cloudinary
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(uploadStream);

    } catch (error) {
        console.error("Bot Upload Critical Error:", error);
        res.status(500).json({ message: 'Server error during upload', error: error.message });
    }
};

module.exports = { uploadBotFile };
