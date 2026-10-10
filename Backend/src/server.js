const path = require("path")

require("dotenv").config({ path: path.resolve(__dirname, ".env") })
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") })

const app = require("./app")
const connectToDB = require("./config/database")

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    console.error("JWT_SECRET must be configured in production.")
    process.exit(1)
}

connectToDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`)
        })
    })
    .catch((error) => {
        console.error("Failed to start server:", error)
        process.exit(1)
    })
