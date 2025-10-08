import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Pricing from './pages/Pricing';
import AnnotationImport from './pages/AnnotationImport';
import AnnotationEditor from './pages/AnnotationEditor';
import Discussion from './pages/Discussion';
import ReportPage from './pages/ReportPage';
import './pdfWorkerLoader';
import './styles.css';

function LayoutWithSidebar({ children }) {
  return (
    <div className="chatgpt-workspace-layout full-height-container">
      <aside className="main-sidebar">
        <div className="logo">KABS</div>
        <nav className="nav-menu">
          <Link to="/pricing" className="nav-btn" title="Projects">P</Link>
          <Link to="/annotation" className="nav-btn" title="Annotation Workspace">A</Link>
          <Link to="/discussion" className="nav-btn" title="AI Discussion">D</Link>
          <Link to="/report" className="nav-btn" title="Reports">R</Link>
        </nav>
      </aside>
      <main className="content-area">{children}</main>
    </div>
  );
}

function LayoutWithoutSidebar({ children }) {
  return (
    <div className="full-height-container" style={{ padding: '20px' }}>
      {children}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LayoutWithSidebar><Pricing /></LayoutWithSidebar>} />
        <Route path="/pricing" element={<LayoutWithSidebar><Pricing /></LayoutWithSidebar>} />
        <Route path="/annotation" element={<LayoutWithSidebar><AnnotationImport /></LayoutWithSidebar>} />
        <Route path="/annotation_editor" element={<LayoutWithoutSidebar><AnnotationEditor /></LayoutWithoutSidebar>} />
        <Route path="/discussion" element={<LayoutWithSidebar><Discussion /></LayoutWithSidebar>} />
        <Route path="/report" element={<LayoutWithSidebar><ReportPage /></LayoutWithSidebar>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;