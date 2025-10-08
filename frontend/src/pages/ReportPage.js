import React from 'react';

function ReportPage() {
  return (
    <div className="single-workspace-tile chatgpt-main-box full-height-panel">
      <div className="page-title">
        <h1>📊 Project Reports and Analysis</h1>
        <p>View generated reports, cost breakdowns, and structural analysis documents here.</p>
      </div>

      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', flexGrow: 1, overflowY: 'auto' }}>
        <h3>Report List</h3>
        <p style={{ marginTop: '10px', color: '#666' }}>
          {/* FIX APPLIED HERE: <pid> is replaced with &lt;pid&gt; */}
          This section would fetch a list of reports from your database (using a new Flask API route like `/api/projects/&lt;pid&gt;/reports`).
        </p>
        <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
            <li style={{ padding: '10px 0', borderBottom: '1px dotted #eee' }}>
                <i className="fas fa-file-pdf"></i> Project A - Cost Summary (2025-10-01)
            </li>
            <li style={{ padding: '10px 0', borderBottom: '1px dotted #eee' }}>
                <i className="fas fa-file-pdf"></i> Project B - Material Analysis (2025-09-28)
            </li>
        </ul>
      </div>
    </div>
  );
}

export default ReportPage;