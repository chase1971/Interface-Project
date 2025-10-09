import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import mavericksLogo from "../assets/mavericks-logo.png";

function Home() {
  const navigate = useNavigate();

  const handleD2LClick = () => {
    navigate('/d2l');
  };

  return (
    <div className="home-container">
      <header className="header">
        <img src={mavericksLogo} alt="Mavericks Logo" className="logo" />
        <h1 className="title">Lone Star Mavericks Control Panel</h1>
      </header>

      <main className="split-container">
        {/* LEFT SIDE - MACROS */}
        <section className="split left-panel">
          <div className="panel-header">
            <h2>Automation Scripts</h2>
          </div>
          <button className="menu-button blue" onClick={handleD2LClick}>D2L Macro</button>
        </section>

        {/* RIGHT SIDE - DATABASE */}
        <section className="split right-panel">
          <div className="panel-header">
            <h2>Student Database</h2>
          </div>
          <button className="menu-button red">Database Access</button>
        </section>
      </main>

      <footer className="footer">
        © 2025 Lone Star College Montgomery
      </footer>
    </div>
  );
}

export default Home;
