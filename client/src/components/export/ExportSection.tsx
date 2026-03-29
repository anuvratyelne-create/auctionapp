import { useState } from 'react';
import { api } from '../../utils/api';
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

export default function ExportSection() {
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    setExporting('json');
    try {
      const data = await api.getExportSummary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadFile(blob, `tournament-export-${new Date().toISOString().split('T')[0]}.json`);
    } catch (error: any) {
      alert(error.message || 'Failed to export JSON');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPlayersCSV = async () => {
    setExporting('players-csv');
    try {
      const blob = await api.exportPlayersCSV();
      downloadFile(blob, `players-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error: any) {
      alert(error.message || 'Failed to export players CSV');
    } finally {
      setExporting(null);
    }
  };

  const handleExportTeamsCSV = async () => {
    setExporting('teams-csv');
    try {
      const blob = await api.exportTeamsCSV();
      downloadFile(blob, `teams-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error: any) {
      alert(error.message || 'Failed to export teams CSV');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const data = await api.getPDFData() as any;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${data.tournament.name} - Tournament Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a2e;
              background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
              min-height: 100vh;
            }
            .header {
              background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
              color: white;
              padding: 30px;
              border-radius: 16px;
              margin-bottom: 30px;
            }
            h1 { font-size: 28px; margin-bottom: 8px; }
            .subtitle { color: #a0a0b0; font-size: 14px; }
            .share-code {
              display: inline-block;
              background: rgba(255,255,255,0.1);
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              margin-top: 10px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 30px;
            }
            .stat-box {
              background: white;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
              box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            }
            .stat-value { font-size: 28px; font-weight: 700; color: #4f46e5; }
            .stat-label { color: #666; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              margin: 30px 0 16px;
              color: #1a1a2e;
            }
            .team-card {
              background: white;
              border-radius: 12px;
              margin-bottom: 20px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            }
            .team-header {
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: white;
              padding: 16px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .team-name { font-weight: 600; font-size: 16px; }
            .team-stats { font-size: 12px; opacity: 0.9; }
            .budget-row {
              padding: 12px 20px;
              background: #f8f9fa;
              font-size: 13px;
              color: #666;
            }
            .budget-row strong { color: #1a1a2e; }
            table { width: 100%; border-collapse: collapse; }
            th {
              text-align: left;
              padding: 12px 20px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #888;
              border-bottom: 1px solid #eee;
            }
            td {
              padding: 12px 20px;
              font-size: 14px;
              border-bottom: 1px solid #f0f0f0;
            }
            tr:hover td { background: #f8f9fa; }
            .price { color: #10b981; font-weight: 600; }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #999;
              font-size: 11px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
            @media print {
              body { padding: 20px; background: white; }
              .team-card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.tournament.name}</h1>
            <p class="subtitle">Tournament Report - ${data.tournament.date}</p>
            <span class="share-code">Code: ${data.tournament.share_code}</span>
          </div>

          <div class="summary">
            <div class="stat-box">
              <div class="stat-value">${data.summary.total_players}</div>
              <div class="stat-label">Total Players</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.summary.sold_players}</div>
              <div class="stat-label">Players Sold</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.summary.total_value.toLocaleString('en-IN')}</div>
              <div class="stat-label">Total Value</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.summary.avg_price.toLocaleString('en-IN')}</div>
              <div class="stat-label">Avg Price</div>
            </div>
          </div>

          <h2 class="section-title">Team Rosters</h2>
          ${data.teams.map((team: any) => `
            <div class="team-card">
              <div class="team-header">
                <span class="team-name">${team.name} (${team.short_name})</span>
                <span class="team-stats">${team.players.length} players</span>
              </div>
              <div class="budget-row">
                <strong>Budget:</strong> ${team.budget.toLocaleString('en-IN')} |
                <strong>Spent:</strong> ${team.spent.toLocaleString('en-IN')} |
                <strong>Remaining:</strong> ${team.remaining.toLocaleString('en-IN')}
              </div>
              ${team.players.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Jersey</th>
                      <th>Category</th>
                      <th style="text-align: right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${team.players.map((p: any) => `
                      <tr>
                        <td>${p.name}</td>
                        <td>${p.jersey || '-'}</td>
                        <td>${p.category || '-'}</td>
                        <td style="text-align: right" class="price">${p.price.toLocaleString('en-IN')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<div style="padding: 20px; text-align: center; color: #999;">No players in squad</div>'}
            </div>
          `).join('')}

          <div class="footer">
            Generated by Auction App on ${new Date().toLocaleString()}
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error: any) {
      alert(error.message || 'Failed to generate PDF');
    } finally {
      setExporting(null);
    }
  };

  const exportButtons = [
    {
      key: 'json',
      label: 'Export JSON',
      description: 'Full tournament data',
      icon: FileJson,
      gradient: 'from-blue-500 to-blue-700',
      onClick: handleExportJSON,
    },
    {
      key: 'players-csv',
      label: 'Players CSV',
      description: 'All players spreadsheet',
      icon: FileSpreadsheet,
      gradient: 'from-emerald-500 to-emerald-700',
      onClick: handleExportPlayersCSV,
    },
    {
      key: 'teams-csv',
      label: 'Teams CSV',
      description: 'Team rosters spreadsheet',
      icon: FileSpreadsheet,
      gradient: 'from-cyan-500 to-cyan-700',
      onClick: handleExportTeamsCSV,
    },
    {
      key: 'pdf',
      label: 'Print Report',
      description: 'Printable tournament report',
      icon: FileText,
      gradient: 'from-amber-500 to-orange-600',
      onClick: handleExportPDF,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="p-5 border-b border-slate-700/50">
          <h3 className="font-semibold text-white text-lg flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary-600 to-purple-700">
              <Download size={18} className="text-white" />
            </div>
            Export Data
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Download tournament data in various formats
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          {exportButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={btn.onClick}
              disabled={exporting !== null}
              className={`
                relative overflow-hidden rounded-xl p-5 text-left
                bg-gradient-to-br from-slate-800/60 to-slate-900/60
                border border-slate-700/50
                hover:border-slate-600 hover:shadow-lg
                transition-all duration-300 hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                group
              `}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative z-10">
                {exporting === btn.key ? (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${btn.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <Loader2 size={20} className="text-white animate-spin" />
                  </div>
                ) : (
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${btn.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <btn.icon size={20} className="text-white" />
                  </div>
                )}
                <p className="font-semibold text-white">{btn.label}</p>
                <p className="text-xs text-slate-400 mt-1">{btn.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
