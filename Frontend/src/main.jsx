import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import { AuthProvider } from "./features/auth/auth.context.jsx"
import { InterviewProvider } from "./features/interview/interview.contex.jsx"
import "./style.css"

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <InterviewProvider>
                    <App />
                </InterviewProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)
