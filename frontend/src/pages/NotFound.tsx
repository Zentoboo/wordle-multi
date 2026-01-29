import { NavLink } from "react-router-dom";

function NotFound() {
    return (
        <>
            <div className="card">
                <h1> 404 - NotFound </h1>
                <NavLink to="/">
                    Home
                </NavLink>
            </div>
        </>
    );
}
export default NotFound;