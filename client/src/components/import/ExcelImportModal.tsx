import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Download,
  ArrowRight,
  Image,
} from 'lucide-react';
import { api } from '../../utils/api';
import { Category, Player } from '../../types';
import { parseExcelFile, ParsedExcelPlayer, getParseValidationSummary } from '../../utils/excelParser';
import { downloadExcelTemplate } from './ExcelTemplateGenerator';
import { formatCompactIndian } from '../../utils/formatters';

interface ExcelImportModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

const CHUNK_SIZE = 100;

export default function ExcelImportModal({ categories, onClose, onSuccess }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelPlayer[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: Array<{ row: number; name: string; error: string }>;
  } | null>(null);
  const [existingPlayers, setExistingPlayers] = useState<Player[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [saveImagesToSupabase, setSaveImagesToSupabase] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing players for upsert matching
  useEffect(() => {
    const loadExistingPlayers = async () => {
      try {
        const players = await api.getPlayers() as Player[];
        setExistingPlayers(players);
      } catch (err) {
        console.error('Failed to load existing players:', err);
      }
    };
    loadExistingPlayers();
  }, []);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadExcelTemplate(categories);
    } catch (err: any) {
      setError(err.message || 'Failed to generate template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const parseFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setImportResult(null);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseExcelFile(
        buffer,
        categories,
        existingPlayers.map(p => ({
          id: p.id,
          name: p.name,
          jersey_number: p.jersey_number,
        }))
      );
      setParsedData(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Excel file');
      setParsedData([]);
    } finally {
      setParsing(false);
    }
  }, [categories, existingPlayers]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await parseFile(selectedFile);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Check file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '.xlsx',
        '.xls',
      ];
      const isValid = validTypes.some(type =>
        droppedFile.type === type || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')
      );

      if (!isValid) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }

      await parseFile(droppedFile);
    }
  }, [parseFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    const validPlayers = parsedData.filter(p => p.isValid);
    if (validPlayers.length === 0) {
      setError('No valid players to import');
      return;
    }

    setImporting(true);
    setError(null);
    setProgress(0);

    // Create a map to store updated photo URLs
    const photoUrlMap = new Map<string, string>();

    // Step 1: Upload images to Supabase if enabled
    if (saveImagesToSupabase) {
      const playersWithPhotos = validPlayers.filter(p => p.photo_url && !p.photo_url.includes('supabase.co'));

      if (playersWithPhotos.length > 0) {
        setUploadingImages(true);
        setImageUploadProgress(0);

        try {
          // Process in batches of 10 for image uploads
          const IMAGE_BATCH_SIZE = 10;
          for (let i = 0; i < playersWithPhotos.length; i += IMAGE_BATCH_SIZE) {
            const batch = playersWithPhotos.slice(i, i + IMAGE_BATCH_SIZE);
            const imagesToUpload = batch.map(p => ({
              url: p.photo_url!,
              filename: p.name.replace(/[^a-zA-Z0-9]/g, '_'),
            }));

            const uploadResult = await api.uploadImagesFromUrls(imagesToUpload);

            // Map original URLs to new Supabase URLs
            for (const result of uploadResult.results) {
              if (result.newUrl) {
                photoUrlMap.set(result.originalUrl, result.newUrl);
              }
            }

            setImageUploadProgress(Math.round(((i + batch.length) / playersWithPhotos.length) * 100));
          }
        } catch (err: any) {
          console.error('Image upload error:', err);
          // Continue with import even if some images fail
        } finally {
          setUploadingImages(false);
        }
      }
    }

    const allResults = {
      created: [] as any[],
      updated: [] as any[],
      errors: [] as Array<{ row: number; name: string; error: string }>,
    };

    try {
      // Step 2: Import players
      const totalChunks = Math.ceil(validPlayers.length / CHUNK_SIZE);

      for (let i = 0; i < validPlayers.length; i += CHUNK_SIZE) {
        const chunk = validPlayers.slice(i, i + CHUNK_SIZE);

        const playersToImport = chunk.map(p => {
          // Use Supabase URL if available, otherwise use original
          const finalPhotoUrl = p.photo_url
            ? (photoUrlMap.get(p.photo_url) || p.photo_url)
            : undefined;

          return {
            name: p.name,
            jersey_number: p.jersey_number,
            category_id: p.category_id!,
            base_price: p.base_price,
            photo_url: finalPhotoUrl,
            stats: {
              ...(p.role ? { role: p.role } : {}),
              ...(p.city ? { city: p.city } : {}),
              ...(p.age ? { age: p.age } : {}),
              ...(p.batting_style ? { batting_style: p.batting_style } : {}),
              ...(p.bowling_style ? { bowling_style: p.bowling_style } : {}),
            },
            rowNumber: p.rowNumber,
          };
        });

        const result = await api.createPlayersBulkUpsert(playersToImport);

        allResults.created.push(...result.created);
        allResults.updated.push(...result.updated);
        allResults.errors.push(...result.errors);

        // Update progress
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
        setProgress(Math.round((currentChunk / totalChunks) * 100));
      }

      setImportResult({
        created: allResults.created.length,
        updated: allResults.updated.length,
        errors: allResults.errors,
      });

      // Call success callback after a delay
      if (allResults.errors.length === 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import players');
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  const summary = parsedData.length > 0 ? getParseValidationSummary(parsedData) : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-950 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-green-600/10 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 p-5 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 shadow-glow-sm">
              <FileSpreadsheet size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Import Players from Excel</h2>
              <p className="text-sm text-slate-400">Upload an Excel file to bulk import or update players</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-all border border-slate-600/50"
            >
              {downloadingTemplate ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Download Template
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-auto p-5">
          {/* File Upload Area */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-600 hover:border-emerald-500/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 flex items-center justify-center">
                  <Upload size={40} className="text-emerald-400" />
                </div>
                <p className="text-white font-semibold text-lg mb-2">
                  {isDragging ? 'Drop your file here' : 'Drag & drop Excel file here'}
                </p>
                <p className="text-slate-400 mb-4">or click to browse</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 text-sm">
                  <FileSpreadsheet size={16} />
                  Accepts .xlsx and .xls files
                </div>
              </label>
            </div>
          )}

          {/* Parsing Indicator */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 flex items-center justify-center mb-4">
                <Loader2 size={32} className="text-emerald-400 animate-spin" />
              </div>
              <p className="text-white font-medium">Parsing Excel file...</p>
              <p className="text-slate-400 text-sm mt-1">Validating rows and matching existing players</p>
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

          {/* Image Upload Progress */}
          {uploadingImages && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <Image size={14} className="text-blue-400" />
                  Uploading images to Supabase...
                </span>
                <span className="text-sm font-medium text-blue-400">{imageUploadProgress}%</span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${imageUploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && !uploadingImages && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Importing players...</span>
                <span className="text-sm font-medium text-emerald-400">{progress}%</span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`rounded-xl p-5 mb-4 ${
              importResult.errors.length === 0
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-amber-500/10 border border-amber-500/30'
            }`}>
              <div className="flex items-start gap-4">
                {importResult.errors.length === 0 ? (
                  <CheckCircle size={24} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle size={24} className="text-amber-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold text-lg ${
                    importResult.errors.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    Import {importResult.errors.length === 0 ? 'Successful!' : 'Completed with Errors'}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {importResult.created > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-white">{importResult.created} created</span>
                      </div>
                    )}
                    {importResult.updated > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-white">{importResult.updated} updated</span>
                      </div>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-white">{importResult.errors.length} errors</span>
                      </div>
                    )}
                  </div>

                  {/* Error Details */}
                  {importResult.errors.length > 0 && (
                    <div className="mt-4 max-h-32 overflow-auto">
                      <p className="text-xs text-slate-400 mb-2">Error details:</p>
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <p key={idx} className="text-sm text-red-300">
                          Row {err.row}: {err.name} - {err.error}
                        </p>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-sm text-slate-400 mt-1">
                          ... and {importResult.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {file && parsedData.length > 0 && !importing && !importResult && (
            <>
              {/* File & Summary Info */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600/50">
                  <FileSpreadsheet size={16} className="text-slate-400" />
                  <span className="text-sm text-white font-medium">{file.name}</span>
                </div>

                {summary && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700/50">
                      <span className="text-sm text-slate-400">Total:</span>
                      <span className="text-sm text-white font-medium">{summary.total}</span>
                    </div>

                    {summary.newPlayers > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-emerald-400">{summary.newPlayers} new</span>
                      </div>
                    )}

                    {summary.updates > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm text-blue-400">{summary.updates} updates</span>
                      </div>
                    )}

                    {summary.invalid > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20">
                        <AlertCircle size={14} className="text-red-400" />
                        <span className="text-sm text-red-400">{summary.invalid} errors</span>
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={() => {
                    setFile(null);
                    setParsedData([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-sm text-slate-400 hover:text-white ml-auto flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  Choose different file
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50" />
                  <span className="text-slate-400">New player</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/50" />
                  <span className="text-slate-400">Update existing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50" />
                  <span className="text-slate-400">Error</span>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/80 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase w-16">Row</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase w-14">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Name</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Jersey</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Category</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Base Price</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Role</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {parsedData.map((player, idx) => (
                        <tr
                          key={idx}
                          className={
                            !player.isValid
                              ? 'bg-red-500/5'
                              : player.isUpdate
                              ? 'bg-blue-500/5 hover:bg-blue-500/10'
                              : 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          }
                        >
                          <td className="px-3 py-2.5 text-slate-500 text-sm font-mono">{player.rowNumber}</td>
                          <td className="px-3 py-2.5">
                            {player.isValid ? (
                              player.isUpdate ? (
                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <RefreshCw size={14} className="text-blue-400" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                  <CheckCircle size={14} className="text-emerald-400" />
                                </div>
                              )
                            ) : (
                              <div className="group relative">
                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                  <AlertCircle size={14} className="text-red-400" />
                                </div>
                                <div className="absolute left-8 top-0 hidden group-hover:block z-20 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-red-300 whitespace-nowrap shadow-lg">
                                  {player.errors.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-white font-medium">
                            {player.name || <span className="text-red-400">Missing</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">{player.jersey_number || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-300">{player.category_name || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {player.base_price ? formatCompactIndian(player.base_price) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300 text-sm">{player.role || '-'}</td>
                          <td className="px-3 py-2.5">
                            {player.isValid && (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                player.isUpdate
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {player.isUpdate ? (
                                  <>
                                    <RefreshCw size={10} />
                                    Update
                                  </>
                                ) : (
                                  <>
                                    <ArrowRight size={10} />
                                    Create
                                  </>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parsedData.length > 50 && (
                <p className="text-sm text-slate-500 mt-2 text-center">
                  Showing all {parsedData.length} rows
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {file && parsedData.length > 0 && !importResult && (
          <div className="relative z-10 p-5 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
            {/* Save images option */}
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={saveImagesToSupabase}
                    onChange={(e) => setSaveImagesToSupabase(e.target.checked)}
                    disabled={importing}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded border-2 border-slate-500 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center">
                    {saveImagesToSupabase && (
                      <CheckCircle size={14} className="text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-white font-medium group-hover:text-emerald-400 transition-colors">
                    Save images to Supabase
                  </span>
                  <p className="text-xs text-slate-500">Download images and store them permanently (recommended)</p>
                </div>
              </label>
              <div className="text-sm text-slate-400">
                {summary && summary.valid > 0 && (
                  <span>
                    Ready to import <span className="text-white font-medium">{summary.valid}</span> players
                    {summary.updates > 0 && (
                      <span className="text-blue-400"> ({summary.updates} updates)</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={importing}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || (summary?.valid || 0) === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-success"
              >
                {importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {uploadingImages ? 'Uploading Images...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Import {summary?.valid || 0} Players
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Close button for result screen */}
        {importResult && (
          <div className="relative z-10 p-5 border-t border-slate-700/50 flex justify-end">
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-medium transition-all hover:scale-105"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
