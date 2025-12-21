const fs = require('fs');

const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Specific size limits
    const fileSize = req.file.size;
    const mimetype = req.file.mimetype;

    // 10MB limit for Images and Documents
    const startImage = mimetype.startsWith('image/');
    const startApp = mimetype.startsWith('application/') || mimetype.startsWith('text/');

    if ((startImage || startApp) && fileSize > 10 * 1024 * 1024) {
        // Delete the file if it violates the limit
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
            message: 'File too large. Images and documents must be under 10MB.'
        });
    }

    // Return URL accessible by frontend
    const url = `/uploads/${req.file.filename}`;

    res.json({
        url: url,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
    });
};

module.exports = {
    uploadFile,
};
