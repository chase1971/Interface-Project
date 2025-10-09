import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import D2LInterface from "./pages/D2LInterface";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/d2l" element={<D2LInterface />} />
      </Routes>
    </Router>
  );
}

export default App;

