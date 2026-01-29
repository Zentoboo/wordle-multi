import Header from "./Header";
import { Outlet } from "react-router-dom";

function Layout() {

    return (
        <>
            <Header />
            <main className="page">
                <Outlet />
            </main>
        </>
    );
}

export default Layout;