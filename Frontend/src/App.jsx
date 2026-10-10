import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "./features/auth/hooks/useAuth"
import Login from "./features/auth/pages/Login.jsx"
import Register from "./features/auth/pages/Register.jsx"
import Protected from "./features/auth/components/Protected.jsx"
import ChooseWorkspace from "./features/auth/pages/ChooseWorkspace.jsx"
import Jobs from "./features/ats/pages/Jobs.jsx"
import RecruiterDashboard from "./features/ats/pages/RecruiterDashboard.jsx"
import Home from "./features/interview/pages/Home.jsx"
import Interview from "./features/interview/pages/Interview.jsx"

function DashboardRedirect() {
    const { user } = useAuth()
    return <Navigate to={user?.role === "recruiter" ? "/recruiter" : "/jobs"} replace />
}

export default function App() {
    return (
        <Routes>
            <Route path="/choose-workspace" element={<ChooseWorkspace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Protected><Home /></Protected>} />
            <Route path="/jobs" element={<Protected role="user"><Jobs /></Protected>} />
            <Route path="/recruiter" element={<Protected role="recruiter"><RecruiterDashboard /></Protected>} />
            <Route path="/interview/:interviewId" element={<Protected role="user"><Interview /></Protected>} />
            <Route path="*" element={<Protected><DashboardRedirect /></Protected>} />
        </Routes>
    )
}
