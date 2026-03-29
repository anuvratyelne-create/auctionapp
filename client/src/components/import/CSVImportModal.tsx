import { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { Category } from '../../types';

interface CSVImportModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedPlayer {
  name: string;
  jersey_number?: string;
  category_name?: string;
  category_id?: string;
  base_price?: number;
  photo_url?: string;
  role?: string;
  isValid: boolean;
  errors: string[];
}

export default function CSVImportModal({ categories, onClose, onSuccess }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPlayer[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const parseCSV = useCallback((text: string): ParsedPlayer[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Find column indices
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'player name' || h === 'player');
    const jerseyIdx = headers.findIndex(h => h === 'jersey' || h === 'jersey number' || h === 'jersey_number' || h === 'number');
    const categoryIdx = headers.findIndex(h => h === 'category' || h === 'category name' || h === 'category_name');
    const priceIdx = headers.findIndex(h => h === 'price' || h === 'base price' || h === 'base_price');
    const photoIdx = headers.findIndex(h => h === 'photo' || h === 'photo url' || h === 'photo_url' || h === 'image');
    const roleIdx = headers.findIndex(h => h === 'role' || h === 'position' || h === 'type');

    if (nameIdx === -1) {
      throw new Error('CSV must have a "Name" column');
    }

    const players: ParsedPlayer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted values)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const name = values[nameIdx]?.replace(/['"]/g, '').trim();
      const jerseyNumber = jerseyIdx >= 0 ? values[jerseyIdx]?.replace(/['"]/g, '').trim() : undefined;
      const categoryName = categoryIdx >= 0 ? values[categoryIdx]?.replace(/['"]/g, '').trim() : undefined;
      const basePriceStr = priceIdx >= 0 ? values[priceIdx]?.replace(/['"]/g, '').trim() : undefined;
      const photoUrl = photoIdx >= 0 ? values[photoIdx]?.replace(/['"]/g, '').trim() : undefined;
      const role = roleIdx >= 0 ? values[roleIdx]?.replace(/['"]/g, '').trim() : undefined;

      const errors: string[] = [];
      let categoryId: string | undefined;

      // Validate name
      if (!name) {
        errors.push('Name is required');
      }

      // Match category
      if (categoryName) {
        const matchedCategory = categories.find(
          c => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        } else {
          errors.push(`Category "${categoryName}" not found`);
        }
      } else if (categories.length > 0) {
        // Default to first category
        categoryId = categories[0].id;
      } else {
        errors.push('No category available');
      }

      // Parse base price
      let basePrice: number | undefined;
      if (basePriceStr) {
        basePrice = parseInt(basePriceStr.replace(/[^0-9]/g, ''), 10);
        if (isNaN(basePrice)) {
          errors.push('Invalid base price');
          basePrice = undefined;
        }
      }

      players.push({
        name: name || '',
        jersey_number: jerseyNumber,
        category_name: categoryName,
        category_id: categoryId,
        base_price: basePrice,
        photo_url: photoUrl,
        role,
        isValid: errors.length === 0 && !!name && !!categoryId,
        errors
      });
    }

    return players;
  }, [categories]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setImportResult(null);
    setParsing(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV');
      setParsedData([]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const validPlayers = parsedData.filter(p => p.isValid);
    if (validPlayers.length === 0) {
      setError('No valid players to import');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const playersToImport = validPlayers.map(p => ({
        name: p.name,
        jersey_number: p.jersey_number,
        category_id: p.category_id!,
        base_price: p.base_price,
        photo_url: p.photo_url,
        stats: p.role ? { role: p.role } : undefined
      }));

      await api.createPlayersBulk(playersToImport);

      setImportResult({
        success: validPlayers.length,
        failed: parsedData.length - validPlayers.length
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to import players');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.filter(p => p.isValid).length;
  const invalidCount = parsedData.filter(p => !p.isValid).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-950 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-purple-600/10 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 p-5 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 shadow-glow-sm">
              <FileSpreadsheet size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Import Players from CSV</h2>
              <p className="text-sm text-slate-400">Upload a CSV file to bulk import players</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-auto p-5">
          {/* File Upload */}
          {!file && (
            <div className="border-2 border-dashed border-slate-600 rounded-2xl p-10 text-center hover:border-primary-500/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                <p className="text-white font-semibold mb-2">Drop CSV file here or click to upload</p>
                <p className="text-sm text-slate-400">
                  Required columns: Name | Optional: Jersey, Category, Price, Photo, Role
                </p>
              </label>
            </div>
          )}

          {/* Parsing Indicator */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
              <p className="text-slate-400">Parsing CSV file...</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-semibold">Import Successful!</p>
                <p className="text-emerald-300 text-sm">
                  {importResult.success} players imported
                  {importResult.failed > 0 && `, ${importResult.failed} skipped`}
                </p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {file && parsedData.length > 0 && !importing && !importResult && (
            <>
              {/* Summary */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/50">
                  <span className="text-sm text-slate-400">File:</span>
                  <span className="text-sm text-white font-medium">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-sm text-emerald-400">{validCount} valid</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20">
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-sm text-red-400">{invalidCount} errors</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                  }}
                  className="text-sm text-slate-400 hover:text-white ml-auto"
                >
                  Choose different file
                </button>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Jersey</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Base Price</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {parsedData.map((player, idx) => (
                        <tr
                          key={idx}
                          className={player.isValid ? 'hover:bg-white/5' : 'bg-red-500/5'}
                        >
                          <td className="px-4 py-3">
                            {player.isValid ? (
                              <CheckCircle size={18} className="text-emerald-400" />
                            ) : (
                              <div className="group relative">
                                <AlertCircle size={18} className="text-red-400" />
                                <div className="absolute left-6 top-0 hidden group-hover:block z-10 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-red-300 whitespace-nowrap">
                                  {player.errors.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white font-medium">{player.name || '-'}</td>
                          <td className="px-4 py-3 text-slate-300">{player.jersey_number || '-'}</td>
                          <td className="px-4 py-3 text-slate-300">{player.category_name || '-'}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {player.base_price ? player.base_price.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{player.role || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {file && parsedData.length > 0 && !importResult && (
          <div className="relative z-10 p-5 border-t border-slate-700/50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import {validCount} Players
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
