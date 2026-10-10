const { PDFParse } = require("pdf-parse")
const mammoth = require("mammoth")

async function extractResumeText(file) {
    if (!file?.buffer) {
        return ""
    }

    const filename = (file.originalname || "").toLowerCase()
    const mimeType = (file.mimetype || "").toLowerCase()
    const buffer = file.buffer

    if (filename.endsWith(".pdf") || mimeType.includes("pdf")) {
        const parser = new PDFParse({ data: buffer })
        const parsed = await parser.getText()
        return parsed?.text?.trim() || ""
    }

    if (filename.endsWith(".docx") || mimeType.includes("officedocument.wordprocessingml.document")) {
        const result = await mammoth.extractRawText({ buffer })
        return result.value?.trim() || ""
    }

    if (mimeType.startsWith("text/") || filename.endsWith(".txt")) {
        return buffer.toString("utf8").trim()
    }

    return buffer.toString("utf8").trim()
}

module.exports = { extractResumeText }
