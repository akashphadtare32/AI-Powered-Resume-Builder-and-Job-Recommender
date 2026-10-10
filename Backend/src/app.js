const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const mongoose = require("mongoose")

const app = express()
const allowedLocalOrigins = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
const configuredOrigins = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || configuredOrigins.includes(origin) || allowedLocalOrigins.some((pattern) => pattern.test(origin))) {
            return callback(null, true)
        }

        return callback(new Error("Not allowed by CORS"))
    },
    credentials: true
}))

app.get("/api/health", (req, res) => {
    const databaseReady = mongoose.connection.readyState === 1
    return res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? "ok" : "unavailable",
        database: databaseReady ? "connected" : "disconnected"
    })
})

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
const atsRouter = require("./routes/ats.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/ats", atsRouter)

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error)
    }

    console.error(`Request failed: ${req.method} ${req.path}`, error)

    const isUploadTooLarge = error.code === "LIMIT_FILE_SIZE"
    const status = isUploadTooLarge
        ? 413
        : Number.isInteger(error.status) && error.status >= 400 && error.status < 600
            ? error.status
            : 500
    const message = status < 500
        ? error.message
        : "The server could not complete this request. Please try again."

    return res.status(status).json({ message })
})


module.exports = app