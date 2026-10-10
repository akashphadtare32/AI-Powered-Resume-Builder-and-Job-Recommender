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

app.get("/", (req, res) => {
    const frontendUrl = (configuredOrigins[0] || "http://localhost:5173")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    return res.type("html").send(`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#101526">
    <title>ResumeAI | Backend</title>
    <style>
        :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #101526; color: #edf1fb; }
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: radial-gradient(ellipse at 12% 8%, #28264e 0, transparent 40%), radial-gradient(ellipse at 90% 85%, #123c43 0, transparent 32%), #101526; }
        a { color: inherit; }
        .page { width: min(100% - 40px, 1020px); margin: 0 auto; padding: 34px 0 52px; }
        header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 58px; }
        .brand { display: flex; align-items: center; gap: 11px; font-weight: 700; letter-spacing: .01em; }
        .brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: linear-gradient(135deg, #8c7bff, #4fd6c4); color: #101526; font-size: 19px; }
        .tag { border: 1px solid #343b52; border-radius: 999px; padding: 8px 12px; color: #b8c1d7; font-size: 12px; }
        .hero { max-width: 700px; }
        .eyebrow { color: #83e0d2; font-size: 12px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }
        h1 { margin: 14px 0; font-size: clamp(36px, 7vw, 62px); line-height: 1.04; letter-spacing: -.045em; }
        .intro { max-width: 590px; margin: 0; color: #aeb8ce; font-size: 17px; line-height: 1.7; }
        .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
        .button { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; border: 1px solid #414a63; border-radius: 12px; padding: 0 17px; text-decoration: none; font-size: 14px; font-weight: 650; transition: transform .15s ease, border-color .15s ease; }
        .button:hover { transform: translateY(-2px); border-color: #83e0d2; }
        .button.primary { border-color: transparent; background: linear-gradient(110deg, #9282ff, #65dcca); color: #111526; }
        .section-title { margin: 58px 0 16px; color: #e6eaf5; font-size: 15px; }
        .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .card { min-width: 0; border: 1px solid #303850; border-radius: 18px; padding: 22px; background: rgb(23 30 49 / 83%); box-shadow: 0 16px 50px rgb(0 0 0 / 12%); }
        .card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .card h2 { margin: 0; font-size: 15px; }
        .status { display: inline-flex; align-items: center; gap: 7px; color: #aeb8ce; font-size: 12px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #8290a9; }
        .status.ok { color: #82e4b1; }
        .status.ok .dot { background: #5bdfa0; box-shadow: 0 0 12px #5bdfa080; }
        .status.error { color: #ff9696; }
        .status.error .dot { background: #ff7777; }
        .card p { margin: 14px 0 0; color: #aeb8ce; font-size: 13px; line-height: 1.65; }
        .card-link { display: inline-block; margin-top: 14px; color: #8ce4d6; font-size: 13px; text-decoration: none; overflow-wrap: anywhere; }
        .card-link:hover { text-decoration: underline; }
        footer { margin-top: 28px; color: #79849c; font-size: 12px; }
        @media (max-width: 600px) {
            .page { width: min(100% - 28px, 1020px); padding-top: 20px; }
            header { padding-bottom: 42px; }
            .tag { padding: 7px 9px; font-size: 11px; }
            .intro { font-size: 15px; }
            .section-title { margin-top: 44px; }
            .cards { grid-template-columns: 1fr; }
            .card { padding: 19px; }
            .actions { display: grid; grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }
    </style>
</head>
<body>
    <main class="page">
        <header>
            <div class="brand"><span class="brand-mark" aria-hidden="true">R</span><span>ResumeAI</span></div>
            <span class="tag">Backend service</span>
        </header>
        <section class="hero" aria-labelledby="page-title">
            <span class="eyebrow">Service dashboard</span>
            <h1 id="page-title">Your backend is up and running.</h1>
            <p class="intro">This service powers resume matching, ATS tools, and recruiter workflows. Use the application link to open the interactive frontend, or check the API health below.</p>
            <div class="actions">
                <a class="button primary" href="${frontendUrl}">Open ResumeAI app <span aria-hidden="true">&nbsp;↗</span></a>
                <a class="button" href="/api/health">View health response</a>
            </div>
        </section>
        <h2 class="section-title">Service status</h2>
        <section class="cards" aria-label="Service status">
            <article class="card">
                <div class="card-top">
                    <h2>Backend API</h2>
                    <span class="status" id="api-status" role="status" aria-live="polite"><span class="dot"></span><span>Checking…</span></span>
                </div>
                <p>API routes for authentication, interview preparation, and ATS features.</p>
                <a class="card-link" href="/api/health">/api/health</a>
            </article>
            <article class="card">
                <div class="card-top">
                    <h2>Web application</h2>
                    <span class="status ok"><span class="dot"></span><span>Available</span></span>
                </div>
                <p>Open the responsive frontend to sign in, explore jobs, and use recruiter tools.</p>
                <a class="card-link" href="${frontendUrl}">${frontendUrl}</a>
            </article>
        </section>
        <footer>ResumeAI backend · Local API: http://localhost:3000</footer>
    </main>
    <script>
        fetch("/api/health")
            .then((response) => {
                if (!response.ok) throw new Error("Health check failed");
                return response.json();
            })
            .then((health) => {
                const status = document.getElementById("api-status");
                const connected = health.status === "ok";
                status.className = "status " + (connected ? "ok" : "error");
                status.lastElementChild.textContent = connected ? "Online · database " + health.database : "Unavailable · database " + health.database;
            })
            .catch(() => {
                const status = document.getElementById("api-status");
                status.className = "status error";
                status.lastElementChild.textContent = "Health check failed";
            });
    </script>
</body>
</html>`)
})

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