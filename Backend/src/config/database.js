const mongoose = require("mongoose")

async function connectToDB() {
    const mongoUri = (process.env.MONGO_URI || "").trim()
    const fallbackUri = "mongodb://localhost:27017/interviewdb"
    const resolvedMongoUri = mongoUri || fallbackUri

    if (!mongoUri) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("MONGO_URI must be configured in production.")
        }
        console.warn("MONGO_URI is not set. Falling back to localhost MongoDB at mongodb://localhost:27017/interviewdb")
    }

    if (mongoUri && mongoUri.includes("<db_password>")) {
        throw new Error("MONGO_URI still contains a placeholder password. Replace <db_password> with the real MongoDB password before starting the server.")
    }

    try {
        await mongoose.connect(resolvedMongoUri)
        console.log("Connected to Database")
        return mongoose
    }
    catch (err) {
        console.error("Database connection failed. Check your MONGO_URI and make sure MongoDB is running.", err)
        throw err
    }
}

module.exports = connectToDB