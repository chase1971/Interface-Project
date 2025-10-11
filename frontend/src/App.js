import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import D2LInterface from "./pages/D2LInterface";
import MakeupExamInterface from "./pages/MakeupExamInterface";
import QuizGrader from "./pages/QuizGrader";
import FileExtractor from "./pages/FileExtractor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/d2l" element={<D2LInterface />} />
        <Route path="/makeup" element={<MakeupExamInterface />} />
        <Route path="/quiz-grader" element={<QuizGrader />} />
        <Route path="/file-extractor" element={<FileExtractor />} />
      </Routes>
    </Router>
  );
}

export default App;

