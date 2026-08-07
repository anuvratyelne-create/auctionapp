import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saApi } from '../utils/saApi';

interface FinancialRecord {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  payment_status: string;
  payment_method: string;
  transaction_id: string;
  notes: string;
  created_at: string;
  tournament?: { name: string };
  user?: { name: string; email: string };
  collector?: { name: string; email: string };
}

interface Summary {
  totalRevenue: number;
  totalTransactions: number;
  byType: Record<string, number>;
  byMonth: Record<string, number>;
}

export default function FinancialReports() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    amount: '',
    payment_type: 'tournament_fee',
    payment_method: 'upi',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recordsData, summaryData] = await Promise.all([
        saApi.getFinancialRecords(),
        saApi.getFinancialSummary(),
      ]);
      setRecords(recordsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.amount) return;
    try {
      await saApi.addFinancialRecord({
        amount: parseFloat(newRecord.amount),
        payment_type: newRecord.payment_type,
        payment_method: newRecord.payment_method,
        payment_status: 'completed',
        notes: newRecord.notes,
      });
      setShowAddModal(false);
      setNewRecord({ amount: '', payment_type: 'tournament_fee', payment_method: 'upi', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to add record:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading financial data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">Financial Reports</h1>
            <p className="text-gray-500 text-sm">Complete payment and revenue tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              Add Record
            </button>
            <Link to="/system-health/dashboard" className="text-gray-400 hover:text-white text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-green-400 mt-2">
              {formatCurrency(summary?.totalRevenue || 0)}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Transactions</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{summary?.totalTransactions || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Average Transaction</p>
            <p className="text-3xl font-bold text-purple-400 mt-2">
              {summary?.totalTransactions
                ? formatCurrency((summary?.totalRevenue || 0) / summary.totalTransactions)
                : formatCurrency(0)}
            </p>
          </div>
        </div>

        {/* Revenue by Type */}
        {summary?.byType && Object.keys(summary.byType).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Revenue by Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary.byType).map(([type, amount]) => (
                <div key={type} className="bg-gray-700/50 rounded p-4">
                  <p className="text-gray-400 text-sm capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-white mt-1">{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Revenue */}
        {summary?.byMonth && Object.keys(summary.byMonth).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Monthly Revenue</h2>
            <div className="space-y-2">
              {Object.entries(summary.byMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 6)
                .map(([month, amount]) => (
                  <div key={month} className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400">{month}</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300">Transaction History</h2>
          </div>
          {records.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No financial records found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-400 text-sm">Date</th>
                  <th className="text-left px-6 py-3 text-gray-400 text-sm">Type</th>
                  <th className="text-left px-6 py-3 text-gray-400 text-sm">Method</th>
                  <th className="text-left px-6 py-3 text-gray-400 text-sm">Tournament</th>
                  <th className="text-left px-6 py-3 text-gray-400 text-sm">Status</th>
                  <th className="text-right px-6 py-3 text-gray-400 text-sm">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(record.created_at)}</td>
                    <td className="px-6 py-4 text-white capitalize">{record.payment_type?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-gray-400 uppercase text-sm">{record.payment_method}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{record.tournament?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          record.payment_status === 'completed'
                            ? 'bg-green-900/50 text-green-400'
                            : record.payment_status === 'pending'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {record.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-green-400 font-semibold">
                      {formatCurrency(record.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Add Financial Record</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Amount (INR)</label>
                <input
                  type="number"
                  value={newRecord.amount}
                  onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Type</label>
                <select
                  value={newRecord.payment_type}
                  onChange={(e) => setNewRecord({ ...newRecord, payment_type: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                >
                  <option value="tournament_fee">Tournament Fee</option>
                  <option value="subscription">Subscription</option>
                  <option value="premium">Premium</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Payment Method</label>
                <select
                  value={newRecord.payment_method}
                  onChange={(e) => setNewRecord({ ...newRecord, payment_method: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                >
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Notes</label>
                <textarea
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
