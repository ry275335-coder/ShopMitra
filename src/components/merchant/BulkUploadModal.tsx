// ==============================================================================
// src/components/merchant/BulkUploadModal.tsx
// CSV/Excel-Style Bulk Inventory Importer with Downloadable Error Reports (Step 11)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/common/AppContext';
import { bulkUploadProductsAction } from '@/server/actions/merchant.actions';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function BulkUploadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { activeMerchantShopId } = useApp();
  const { showToast } = useToast();

  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    successfulCount: number;
    failedCount: number;
    failedRows: { row: number; data: any; reason: string }[];
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'name,brand,category,variant,sellingprice,mrp,stockcount,sku\n' +
      'Samsung 25W Type-C Super Fast Charger,Samsung,electronics,White,699,1299,25,SAM-25W-WHT\n' +
      'Crucial P3 1TB NVMe M.2 SSD,Crucial,computers,1TB NVMe,5299,7500,10,CRU-1TB-NVME\n' +
      'SanDisk Ultra 128GB MicroSD Card,SanDisk,electronics,128GB Class 10,799,1499,30,SND-128G-MSD\n' +
      'boAt Bassheads 100 Wired Earphones,boAt,electronics,Black,349,999,50,BOAT-BH-100\n' +
      'Aashirvaad Shudh Chakki Atta 5kg,Aashirvaad,groceries,5kg Bag,235,275,40,ASH-ATTA-5KG\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ShopMitra_Inventory_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample CSV template!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showToast('CSV file is empty or invalid', 'error');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(',');
      if (currentline.length === headers.length) {
        const obj: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentline[j].trim();
        }
        rows.push(obj);
      }
    }

    setParsedRows(rows);
    showToast(`Loaded ${rows.length} rows for validation.`);
  };

  const handlePublish = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
      const res = await bulkUploadProductsAction(parsedRows, activeMerchantShopId);
      if (res.success) {
        const successCount = res.successfulCount ?? 0;
        const failCount = res.failedCount ?? 0;
        const failedList = res.failedRows ?? [];

        setUploadResult({
          successfulCount: successCount,
          failedCount: failCount,
          failedRows: failedList,
        });

        if (failCount === 0) {
          showToast(`Successfully published all ${successCount} products!`);
          setTimeout(onClose, 1500);
        } else {
          showToast(`Imported ${successCount} products. ${failCount} rows had errors.`, 'error');
        }
      }
    } catch {
      showToast('Error executing bulk upload', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!uploadResult || uploadResult.failedRows.length === 0) return;

    let csv = 'data:text/csv;charset=utf-8,row_number,product_name,failure_reason\n';
    uploadResult.failedRows.forEach(f => {
      csv += `${f.row},"${f.data.name || 'Unknown'}","${f.reason}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ShopMitra_Import_Errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-merchant-100 text-merchant-700 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Bulk Product & Rates Importer</h3>
              <p className="text-xs text-slate-500">Upload 500+ items at once via CSV or Excel format</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {/* Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-merchant-500 rounded-3xl p-6 sm:p-8 text-center bg-white transition-colors">
            <UploadCloud className="w-10 h-10 mx-auto text-merchant-500 mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              {fileName ? `File Selected: ${fileName}` : 'Drop your inventory CSV file here'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Required headers: <code className="text-merchant-700 font-bold">name, brand, sellingprice, mrp, stockcount</code>
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <label className="bg-merchant-600 hover:bg-merchant-700 text-white text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors">
                <span>Select CSV File</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample Template</span>
              </button>
            </div>
          </div>

          {/* Validation & Error Report Banner */}
          {uploadResult && (
            <div className={`p-4 rounded-2xl border text-xs ${
              uploadResult.failedCount > 0 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span>
                  ✓ {uploadResult.successfulCount} rows imported successfully.
                  {uploadResult.failedCount > 0 && ` ⚠️ ${uploadResult.failedCount} rows failed.`}
                </span>
                {uploadResult.failedCount > 0 && (
                  <button
                    onClick={handleDownloadErrorReport}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-xs font-black flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Error Report</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Pre-flight Preview ({parsedRows.length} Items Detected)
                </span>
                <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded">
                  Validated
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b">
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Brand</th>
                      <th className="p-2.5">Selling Price</th>
                      <th className="p-2.5">MRP</th>
                      <th className="p-2.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 font-medium">
                        <td className="p-2.5 font-bold text-slate-900 truncate max-w-xs">{row.name}</td>
                        <td className="p-2.5 text-slate-500">{row.brand}</td>
                        <td className="p-2.5 font-black text-merchant-600">₹{row.sellingprice || row.price}</td>
                        <td className="p-2.5 text-slate-400">₹{row.mrp}</td>
                        <td className="p-2.5 text-emerald-700 font-bold">{row.stockcount || 10}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-800">
            Cancel
          </button>

          <button
            onClick={handlePublish}
            disabled={parsedRows.length === 0 || isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md ${
              parsedRows.length > 0 && !isProcessing
                ? 'bg-merchant-600 hover:bg-merchant-700 text-white shadow-merchant-600/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing & Syncing...</span>
              </>
            ) : (
              <>
                <span>Publish {parsedRows.length} Items Live</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
