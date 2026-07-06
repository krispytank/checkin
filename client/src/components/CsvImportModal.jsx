import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FileText, Upload, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { cn } from '../lib/utils.js';

export default function CsvImportModal({
  isOpen,
  onClose,
  title,
  description,
  requiredColumns,
  optionalColumns,
  sampleRows,
  apiMethod,
  queryKey,
  onUploadSuccess,
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return apiMethod(formData);
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey });
      if (onUploadSuccess) onUploadSuccess(data);
    },
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !selectedFile.name.endsWith('.csv')) return;
    
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;
      
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).slice(0, 5).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {});
      });
      
      setPreview({ headers, rows, total: lines.length - 1 });
    };
    reader.readAsText(selectedFile);
    e.target.value = '';
  };

  const handleUpload = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const allColumns = [...requiredColumns, ...optionalColumns];
    const header = allColumns.join(',');
    const example = sampleRows?.[0] || requiredColumns.map(() => 'example').join(',');
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title?.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border/50 p-6 shadow-xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File info or upload */}
        {!file && !results && (
          <div className="space-y-4">
            {/* Column info */}
            <div className="rounded-xl bg-muted/30 p-4 border border-border/30">
              <p className="text-sm font-semibold mb-2">CSV Format</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Required</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredColumns.map(col => (
                      <span key={col} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Optional</p>
                  <div className="flex flex-wrap gap-1.5">
                    {optionalColumns.map(col => (
                      <span key={col} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload area */}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/30 hover:bg-muted/20 transition-all duration-200">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-semibold">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv files only</p>
              </div>
            </div>

            {/* Template download */}
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download CSV template
            </button>
          </div>
        )}

        {/* Preview */}
        {file && preview && !results && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
              <FileText className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-muted-foreground">{preview.total} row(s) found</p>
              </div>
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Change file
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto border border-border/30 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30">
                    {preview.headers.map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/20 last:border-0">
                      {preview.headers.map(h => (
                        <td key={h} className="px-3 py-2.5 text-xs">
                          {row[h] || <span className="text-muted-foreground">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.total > 5 && (
                <p className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border/20">
                  ...and {preview.total - 5} more row(s)
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-border/50 px-4 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import {preview.total} Row(s)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className={cn(
              "p-4 rounded-xl border",
              results.failed > 0
                ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                : "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {results.failed > 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <p className="text-sm font-semibold">
                  {results.failed > 0 ? 'Import completed with errors' : 'Import successful'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">{results.imported || results.created || 0}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Imported</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">{results.skipped || 0}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Skipped</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{results.failed || 0}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Failed</p>
                </div>
              </div>
            </div>

            {results.errors?.length > 0 && (
              <div className="overflow-x-auto border border-border/30 rounded-xl max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="border-b border-border/30">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.errors.map((err, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0">
                        <td className="px-3 py-2 text-xs">{err.row || '-'}</td>
                        <td className="px-3 py-2 text-xs text-red-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full rounded-xl border border-border/50 px-4 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
