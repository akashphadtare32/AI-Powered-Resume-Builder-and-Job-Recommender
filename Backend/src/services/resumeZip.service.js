const path = require("path")
const yauzl = require("yauzl")

const MAX_ARCHIVE_ENTRIES = 500
const MAX_RESUMES = 50
const MAX_RESUME_SIZE = 5 * 1024 * 1024
const MAX_TOTAL_UNCOMPRESSED_SIZE = 50 * 1024 * 1024
const supportedResume = /\.(pdf|docx|txt)$/i

function archiveError(message, status = 400) {
    const error = new Error(message)
    error.status = status
    return error
}

function readResumeFilesFromZip(buffer) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true, decodeStrings: true }, (openError, zipFile) => {
            if (openError) return reject(archiveError("The uploaded file is not a valid ZIP archive."))

            const files = []
            let entryCount = 0
            let resumeCount = 0
            let declaredTotalSize = 0
            let actualTotalSize = 0
            let settled = false

            const fail = (error) => {
                if (settled) return
                settled = true
                zipFile.close()
                reject(error)
            }

            zipFile.on("error", () => fail(archiveError("The ZIP archive could not be read.")))
            zipFile.on("end", () => {
                if (settled) return
                settled = true
                resolve(files)
            })
            zipFile.on("entry", (entry) => {
                entryCount += 1
                if (entryCount > MAX_ARCHIVE_ENTRIES) {
                    return fail(archiveError("The ZIP contains too many files. Limit it to 500 entries.", 413))
                }

                const fileName = entry.fileName
                if (fileName.endsWith("/") || !supportedResume.test(fileName)) {
                    return zipFile.readEntry()
                }

                resumeCount += 1
                if (resumeCount > MAX_RESUMES) {
                    return fail(archiveError("A ZIP can contain up to 50 PDF, DOCX, or TXT resumes.", 413))
                }
                if (entry.uncompressedSize > MAX_RESUME_SIZE) {
                    return fail(archiveError(`${path.basename(fileName)} exceeds the 5 MB per-resume limit.`, 413))
                }

                declaredTotalSize += entry.uncompressedSize
                if (declaredTotalSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
                    return fail(archiveError("The total uncompressed resume size must not exceed 50 MB.", 413))
                }

                zipFile.openReadStream(entry, (streamError, stream) => {
                    if (streamError) return fail(archiveError(`${path.basename(fileName)} could not be extracted.`))

                    const chunks = []
                    let actualSize = 0
                    stream.on("data", (chunk) => {
                        actualSize += chunk.length
                        actualTotalSize += chunk.length
                        if (actualSize > MAX_RESUME_SIZE) {
                            stream.destroy(archiveError("Resume exceeds the per-file limit.", 413))
                            return
                        }
                        if (actualTotalSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
                            stream.destroy(archiveError("The total uncompressed resume size must not exceed 50 MB.", 413))
                            return
                        }
                        chunks.push(chunk)
                    })
                    stream.on("error", (error) => fail(error.status
                        ? error
                        : archiveError(`${path.basename(fileName)} could not be extracted safely.`)))
                    stream.on("end", () => {
                        if (settled) return
                        files.push({
                            fileName: path.basename(fileName.replace(/[\\/]/g, path.sep)),
                            buffer: Buffer.concat(chunks, actualSize)
                        })
                        zipFile.readEntry()
                    })
                })
            })

            zipFile.readEntry()
        })
    })
}

module.exports = { readResumeFilesFromZip }
