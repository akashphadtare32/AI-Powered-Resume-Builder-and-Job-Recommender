const multer = require("multer")

const uploadZip = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
}).single("candidateZip")

function zipUploadMiddleware(req, res, next) {
    uploadZip(req, res, (error) => {
        if (!error) return next()

        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "ZIP uploads must be 10 MB or smaller." })
        }
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: "Upload one ZIP file at a time." })
        }
        return next(error)
    })
}

module.exports = zipUploadMiddleware
