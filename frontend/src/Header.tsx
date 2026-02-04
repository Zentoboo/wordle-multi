import { Link } from "react-router-dom";
import { useAuth } from "./contexts";
import { useSignalRConnection } from "./contexts/SignalRContext";

export default function Header() {
    const { isAuthenticated, isLoading} = useAuth();
    const { connectionState } = useSignalRConnection();

    const getConnectionIndicator = () => {
        const stateStyles = {
            connected: { backgroundColor: '#538d4e', text: 'Live' },
            connecting: { backgroundColor: '#b59f3b', text: 'Connecting...' },
            reconnecting: { backgroundColor: '#b59f3b', text: 'Reconnecting...' },
            error: { backgroundColor: '#e74c3c', text: 'Error' },
            disconnected: { backgroundColor: '#e74c3c', text: 'Offline' }
        };

        const style = stateStyles[connectionState];
        return (
            <div style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                backgroundColor: style.backgroundColor,
                color: 'white',
                marginLeft: '1rem'
            }}>
                {style.text}
            </div>
        );
    };

    if (isLoading) {
        return (
            <header className="header">
                <div className="header-title">
                    <h1>wordle-multi</h1>
                </div>
                <nav>
                    <div className="nav-links">
                        <div>Loading...</div>
                    </div>
                </nav>
            </header>
        );
    }

    return (
        <header className="header">
            <div className="header-title">
                <h1>wordle-multi</h1>
            </div>
            <nav>
                <div className="nav-links">
                    <Link className="header-nav-link" to="/">Home</Link>
                    <Link className="header-nav-link" to="/about">About</Link>
                    {isAuthenticated ? (
                        <>
                            <Link className="header-nav-link" to="/lobby">Multiplayer</Link>
                            <Link className="header-nav-link" to="/profile">Profile</Link>
                            {getConnectionIndicator()}
                        </>
                    ) : (
                        <Link className="header-nav-link" to="/auth">Login</Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
