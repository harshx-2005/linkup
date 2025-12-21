const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // With Cloudinary Storage, req.file.path IS the secure URL
    res.json({
        url: req.file.path,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
    });
};

module.exports = {
    uploadFile,
};
