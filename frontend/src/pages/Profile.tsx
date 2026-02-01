import { useAuth } from "../contexts";
import ProtectedRoute from "../components/ProtectedRoute";

function Profile() {
    const { user, logout } = useAuth();

    if (!user) {
        return <div>Loading user data...</div>;
    }

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="card">
            <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: 'space-between' }}>
                <h2>Profile</h2>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'none',
                        border: '1px solid',
                        cursor: 'pointer',
                        padding: '0.8rem 0.8rem',
                        margin: '0',
                        width: '100px'
                    }}
                >
                    Logout
                </button>
            </div>
            <div style={{ width: "80%", display: "flex", flexDirection: "column", gap: "1.6rem" }}>
                <div>
                    <h1>User Information</h1>
                    <div>
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
                        <p><strong>User ID:</strong> {user.id}</p>
                    </div>
                </div>

                <div>
                    <h1>Game Statistics</h1>
                    <div>
                        <p>Game statistics will be implemented here.</p>
                        <p>Features coming soon:</p>
                        <ul>
                            <li>Games played</li>
                            <li>Win rate</li>
                            <li>Current streak</li>
                            <li>Best streak</li>
                            <li>Guess distribution</li>
                        </ul>
                    </div>
                </div>

                <div>
                    <h1>Account Settings</h1>
                    <div>
                        <p>Account settings will be implemented here.</p>
                        <p>Features coming soon:</p>
                        <ul>
                            <li>Change password</li>
                            <li>Update email</li>
                            <li>Delete account</li>
                            <li>Privacy settings</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap the Profile component with ProtectedRoute
export default function ProtectedProfile() {
    return (
        <ProtectedRoute>
            <Profile />
        </ProtectedRoute>
    );
}