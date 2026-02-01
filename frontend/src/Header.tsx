import { Link } from "react-router-dom";
import { useAuth } from "./contexts";

export default function Header() {
    const { isAuthenticated, isLoading} = useAuth();

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
                            <Link className="header-nav-link" to="/profile">Profile</Link>
                            
                        </>
                    ) : (
                        <Link className="header-nav-link" to="/auth">Login</Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
