'use client';

import React from 'react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

/**
 * NotaDapur Component
 * 
 * This component provides 4 different templates for printing kitchen receipts (Nota Dapur).
 * It uses CSS @media print to ensure only the receipt is printed and everything else is hidden.
 */

const PrintStyles = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
            body * {
                visibility: hidden;
            }
            #print-area, #print-area * {
                visibility: visible;
            }
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .page-break {
                page-break-after: always;
            }
            @page {
                size: portrait;
                margin: 1cm;
            }
            .no-break {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
        .nota-container {
            font-family: 'Courier New', Courier, monospace;
            color: black;
            background: white;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.08;
            width: 80%;
            z-index: -1;
            pointer-events: none;
        }
        .nota-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .nota-table th, .nota-table td {
            border: 1px solid black;
            padding: 4px 8px;
            text-align: left;
            font-size: 16px;
        }
        .nota-table th {
            background-color: #f2f2f2;
            text-transform: uppercase;
        }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .font-bold { font-weight: bold; }
        .font-calibri { font-family: 'Calibri', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; }
        .font-times { font-family: 'Times New Roman', Times, serif !important; }
        .font-trebuchet { 
            font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif !important; 
            font-size: 12pt !important;
        }
        .font-arial { 
            font-family: Arial, Helvetica, sans-serif !important; 
            font-size: 12pt !important;
        }
        .no-repeat-header thead {
            display: table-row-group !important;
        }
    `}} />
);

// Template 1: UD. EMPAT SAUDARA CEMERLANG (ESC)
const TemplateESC = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-calibri text-black bg-white">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
                <img src="/logo esc.png" alt="ESC Logo" className="h-16 w-auto" />
                <div>
                    <div className="font-bold text-lg uppercase">UD. EMPAT SAUDARA CEMERLANG</div>
                    <div className="text-sm font-bold">LOMBOK - NTB</div>
                </div>
            </div>
            <div className="border-2 border-black p-2 min-w-[250px]">
                <div className="text-sm">Mataram, {formatDate(data.tanggal)}</div>
                <div className="text-sm">Kepada Yth. <span className="font-bold">{data.dapur_id?.nama_dapur || 'Dapur'}</span></div>
                <div className="text-sm">Di -</div>
                <div className="text-sm font-bold">{data.dapur_id?.alamat || 'Pagutan Mataram'}</div>
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="w-10">No.</th>
                    <th>Nama Pesanan</th>
                    <th className="text-center w-16">Qty.</th>
                    <th className="text-center w-16">Sat.</th>
                    <th className="text-right w-24">Harga</th>
                    <th className="text-right w-32">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-right">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {/* Empty rows to fill space similar to reference (up to 10 rows) */}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6">&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-right font-bold border-t-2">SUB TOTAL</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
                <tr>
                    <td colSpan="5" className="text-right font-bold">DISCOUNT</td>
                    <td className="text-right font-bold">-</td>
                </tr>
                <tr>
                    <td colSpan="5" className="text-right font-bold">TOTAL</td>
                    <td className="text-right font-bold">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-12 no-break">
            <div className="text-center">
                <div>Penerima,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
            <div className="text-center">
                <div>Hormat Kami,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
        </div>
    </div>
);

// Template 2: UD PILAR PANGAN MANDIRI
const TemplatePilarPangan = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-times text-black bg-white">
        {/* Watermark Logo */}
        <img src="/logo pilar pangan.jpg" alt="Watermark" className="watermark" />

        <div className="flex justify-between items-start mb-4">
            <div className="w-1/3 pt-4">
                <div className="text-sm">Mataram, {formatDate(data.tanggal)}</div>
                <div className="text-sm font-bold">Tuan/Toko : <span className="font-bold">{data.dapur_id?.nama_dapur || 'Dapur'}</span></div>
                <div className="text-sm">Di -</div>
                <div className="text-sm font-bold uppercase">{data.dapur_id?.alamat || 'Pagutan Kota Mataram'}</div>
            </div>
            <div className="w-1/3 text-center pt-2">
                <div className="font-bold text-xl uppercase">UD PILAR PANGAN MANDIRI</div>
                <div className="text-sm font-bold">LOMBOK NTB</div>
            </div>
            <div className="w-1/3 flex justify-end">
                <img src="/logo pilar pangan.jpg" alt="Pilar Pangan Logo" className="h-24 w-auto" />
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="text-center w-20">JUMLAH</th>
                    <th className="text-center w-20">SATUAN</th>
                    <th>NAMA BARANG</th>
                    <th className="text-right w-32">HARGA</th>
                    <th className="text-right w-32">JUMLAH</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-right">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6">&nbsp;</td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="4" className="text-right font-bold border-t-2">JUMLAH TOTAL (RP)</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-12 no-break">
            <div className="text-center">
                <div className="uppercase">PENERIMA,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
            <div className="text-center">
                <div className="uppercase">PENGIRIM,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
        </div>
    </div>
);

// Template 3: UD. AMANAH SUMBER MAKMUR (ASM)
const TemplateASM = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-trebuchet text-black bg-white">
        <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col items-center flex-1">
                <img src="/logo asm.png" alt="ASM Logo" className="h-16 w-auto" />
                <div className="text-[12px] font-bold text-center mt-1">
                    UD. AMANAH SUMBER MAKMUR<br />
                    SELAPARANG KOTA MATARAM
                </div>
            </div>
            <div className="border border-black">
                <table className="text-sm">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="px-2 py-1 font-bold border-r border-black">Tgl.</td>
                            <td className="px-2 py-1">{formatDate(data.tanggal)}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="px-2 py-1 font-bold border-r border-black">Kepada</td>
                            <td className="px-2 py-1">{data.dapur_id?.nama_dapur}</td>
                        </tr>
                        <tr>
                            <td className="px-2 py-1 font-bold border-r border-black">Alamat</td>
                            <td className="px-2 py-1">{data.dapur_id?.alamat}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="w-10">No.</th>
                    <th>Nama Pesanan</th>
                    <th className="text-center w-16">Qty.</th>
                    <th className="text-center w-16">Sat.</th>
                    <th className="text-right w-24">Harga</th>
                    <th className="text-right w-32">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-right">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6">&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-right font-bold border-t-2">TOTAL (Rp.)</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-12 no-break">
            <div className="text-center">
                <div>Penerima,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
            <div className="text-center">
                <div>Hormat Kami,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
        </div>
    </div>
);

// Template 4: UD. BANYU MAS
const TemplateBanyuMas = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-arial text-black bg-white">
        <div className="flex justify-between items-start mb-4">
            <div className="border border-black">
                <table className="text-sm">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="px-2 py-1 font-bold border-r border-black">Tgl.</td>
                            <td className="px-2 py-1">{formatDate(data.tanggal)}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="px-2 py-1 font-bold border-r border-black">Kepada</td>
                            <td className="px-2 py-1">: {data.dapur_id?.nama_dapur}</td>
                        </tr>
                        <tr>
                            <td className="px-2 py-1 font-bold border-r border-black">Alamat</td>
                            <td className="px-2 py-1">: {data.dapur_id?.alamat}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="flex flex-col items-center flex-1">
                <img src="/logo banyumas.png" alt="Banyu Mas Logo" className="h-16 w-auto mb-1" />
                <div className="text-[12px] font-bold text-center">
                    UD. BANYU MAS<br />
                    SELAPARANG - KOTA MATARAM
                </div>
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="w-10">No.</th>
                    <th>Nama Barang</th>
                    <th className="text-center w-16">Jml</th>
                    <th className="text-center w-16">Sat</th>
                    <th className="text-right w-24">Harga Satuan</th>
                    <th className="text-right w-32">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-right">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6">&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-right font-bold border-t-2">TOTAL (Rp.)</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-12 no-break">
            <div className="text-center">
                <div>Penerima,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
            <div className="text-center">
                <div className="mb-0">Pengirim,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
        </div>
    </div>
);

// Template 5: UD BOGA FOOD RAYA
const TemplateBogaFood = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-arial text-black bg-white">
        <div className="flex justify-between items-center mb-4">
            <div className="w-1/3 text-center">
                <div className="font-bold text-lg">UD BOGA FOOD RAYA</div>
                <div className="font-bold">LOMBOK NTB</div>
            </div>
            <div className="w-1/3 flex justify-center">
                <img src="/LOGO BOGA FOOD RAYA.jpeg" alt="Boga Food Logo" className="h-24 w-auto" />
            </div>
            <div className="w-1/3 text-right">
                <div>Lombok Barat, {(() => {
                    const d = new Date(data.tanggal);
                    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
                })()}</div>
                <div>Penerima. {data.dapur_id?.nama_dapur || 'SPPG Batu Layar'}</div>
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="w-10 text-center">No.</th>
                    <th className="text-center">Pembelian</th>
                    <th className="text-center w-16">Qty</th>
                    <th className="text-center w-16">Sat</th>
                    <th className="text-right w-32">Harga Satuan</th>
                    <th className="text-right w-40">Jumlah Pembelian</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-right">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6 text-center">{udData.items.length + idx + 1}</td>
                        <td></td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-right font-bold border-t-2">TOTAL (Rp.)</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-24 no-break">
            <div className="text-center">
                <div>Penerima :</div>
                <div className="mt-20 border-t border-black w-48"></div>
            </div>
            <div className="text-center">
                <div>Hormat Kami :</div>
                <div className="mt-20 border-t border-black w-48"></div>
            </div>
        </div>
    </div>
);

// Template 6: UD KAYA ALAM
const TemplateKayaAlam = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-arial text-black bg-white">
        <div className="flex justify-between items-start mb-6">
            <div className="w-1/2">
                <img src="/LOGO KAYA ALAM.jpeg" alt="Kaya Alam Logo" className="h-32 w-auto" />
            </div>
            <div className="w-1/2 flex justify-end">
                <div className="border-2 border-black bg-gray-200 p-4 min-w-[300px] text-lg">
                    <div>Mataram, {formatDate(data.tanggal)}</div>
                    <div>Kepada Yth. <span className="font-bold">{data.dapur_id?.nama_dapur || 'Dapur SPPG'}</span></div>
                    <div>Di -</div>
                    <div className="font-bold">{data.dapur_id?.alamat || 'Rembige Mataram'}</div>
                </div>
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="w-16 text-center font-bold">NO.</th>
                    <th className="text-center font-bold">NAMA BARANG</th>
                    <th className="text-center w-24 font-bold">JUMLAH</th>
                    <th className="text-center w-24 font-bold">SAT</th>
                    <th className="text-center w-36 font-bold">HARGA</th>
                    <th className="text-center w-40 font-bold">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-center">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-center">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-8">&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-center font-bold border-t-2 uppercase bg-white">TOTAL TRANSAKSI (RP)</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-24 no-break italic">
            <div className="text-center">
                <div className="font-bold">PENERIMA,</div>
                <div className="mt-24 border-t border-black w-56"></div>
            </div>
            <div className="text-center">
                <div className="font-bold">HORMAT KAMI,</div>
                <div className="mt-24 border-t border-black w-56"></div>
            </div>
        </div>
    </div>
);

// Template 7: UD MAYUR SEHAT
// Template 7: UD MAYUR SEHAT
const TemplateMayurSehat = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-arial text-black bg-white">
        <div className="flex border-2 border-black mb-4">
            <div className="w-1/2 p-4 flex justify-center items-center border-r-2 border-black">
                <img src="/LOGO MAYUR SEHAT.jpeg" alt="Mayur Sehat Logo" className="h-28 w-auto" />
            </div>
            <div className="w-1/2 flex flex-col">
                <div className="p-2 border-b-2 border-black text-center h-12 flex items-center justify-center text-lg">
                    Tanggal Transaksi. {(() => {
                        const d = new Date(data.tanggal);
                        return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
                    })()}
                </div>
                <div className="border-b-2 border-black h-8 flex items-center justify-center"></div>
                <div className="p-2 text-center h-12 flex items-center justify-center text-lg font-bold italic">
                    Tertuju. {data.dapur_id?.nama_dapur || 'Dapur SPPG Monjok'}
                </div>
            </div>
        </div>

        <table className="nota-table border-2 border-black no-repeat-header">
            <thead>
                <tr className="bg-gray-200">
                    <th className="w-16 text-center border-2 border-black font-bold">No.</th>
                    <th className="text-center border-2 border-black font-bold">Barang</th>
                    <th className="text-center w-24 border-2 border-black font-bold">Bnyk</th>
                    <th className="text-center w-24 border-2 border-black font-bold">Sat.</th>
                    <th className="text-center w-36 border-2 border-black font-bold">Harga</th>
                    <th className="text-center w-40 border-2 border-black font-bold">Total</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center border border-black bg-gray-200 font-bold">{idx + 1}</td>
                        <td className="border border-black px-2">{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center border border-black">{formatNumber(item.qty)}</td>
                        <td className="text-center border border-black">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-right border border-black px-2">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right border border-black px-2">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6 text-center border border-black bg-gray-200 font-bold">{udData.items.length + idx + 1}</td>
                        <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="font-bold">
                    <td colSpan="5" className="text-right border-2 border-black bg-white px-2">DISCOUNT</td>
                    <td className="text-right border-2 border-black bg-white px-2">-</td>
                </tr>
                <tr className="font-bold">
                    <td colSpan="5" className="text-right border-2 border-black bg-gray-100 uppercase px-2">TOTAL (Rp.)</td>
                    <td className="text-right border-2 border-black bg-white px-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-32 no-break">
            <div className="text-center">
                <div className="mb-20 font-bold">Penerima,</div>
                <div className="border-t border-dashed border-black w-48 mx-auto"></div>
            </div>
            <div className="text-center">
                <div className="mb-20 font-bold">Pengirim,</div>
                <div className="border-t border-dashed border-black w-56 mx-auto"></div>
            </div>
        </div>
    </div>
);

// Template 8: Generic Template (for new UDs without specific branding)
const TemplateGeneric = ({ data, udData, udId }) => (
    <div id={`nota-${udId}`} className="nota-container page-break font-arial text-black bg-white">
        <div className="text-center mb-6">
            <div className="font-bold text-xl uppercase">{udData.nama_ud}</div>
            <div className="text-sm">LOMBOK - NTB</div>
        </div>

        <div className="border border-black p-3 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="font-bold">Tanggal:</span> {formatDate(data.tanggal)}
                </div>
                <div>
                    <span className="font-bold">Kepada:</span> {data.dapur_id?.nama_dapur || 'Dapur'}
                </div>
                <div className="col-span-2">
                    <span className="font-bold">Alamat:</span> {data.dapur_id?.alamat || '-'}
                </div>
            </div>
        </div>

        <table className="nota-table">
            <thead>
                <tr>
                    <th className="w-10">No.</th>
                    <th>Nama Barang</th>
                    <th className="text-center w-16">Qty.</th>
                    <th className="text-center w-16">Sat.</th>
                    <th className="text-right w-24">Harga</th>
                    <th className="text-right w-32">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                {udData.items.map((item, idx) => (
                    <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.nama_barang || item.barang_id?.nama_barang}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-center">{item.satuan || item.barang_id?.satuan}</td>
                        <td className="text-right">{formatCurrency(item.harga_jual).replace('Rp', '')}</td>
                        <td className="text-right">{formatCurrency(item.subtotal_jual).replace('Rp', '')}</td>
                    </tr>
                ))}
                {[...Array(Math.max(0, 15 - udData.items.length))].map((_, idx) => (
                    <tr key={`empty-${idx}`}>
                        <td className="h-6">&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-right font-bold border-t-2">TOTAL (Rp.)</td>
                    <td className="text-right font-bold border-t-2">{formatCurrency(udData.total).replace('Rp', '')}</td>
                </tr>
            </tfoot>
        </table>

        <div className="flex justify-between mt-12 px-12 no-break">
            <div className="text-center">
                <div>Penerima,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
            <div className="text-center">
                <div>Pengirim,</div>
                <div className="mt-16 border-t border-black w-40"></div>
            </div>
        </div>
    </div>
);

export default function NotaDapur({ data, itemsByUD, udIdFilter = null }) {
    if (!data || !itemsByUD) return null;

    const getTemplate = (udName, udData, udId) => {
        const name = udName.toUpperCase();
        if (name.includes('SAUDARA') || name.includes('ESC')) {
            return <TemplateESC key={udName} data={data} udData={udData} udId={udId} />;
        } else if (name.includes('UD PILAR PANGAN MANDIRI')) {
            return <TemplatePilarPangan key={udName} data={data} udData={udData} udId={udId} />;
        } else if (name.includes('AMANAH') || name.includes('ASM')) {
            return <TemplateASM key={udName} data={data} udData={udData} udId={udId} />;
        } else if (name.includes('BANYU MAS') || name.includes('BANYUMAS')) {
            return <TemplateBanyuMas key={udName} data={data} udData={udData} udId={udId} />;
        } else if (name.includes('BOGA FOOD')) {
            return <TemplateBogaFood key={udName} data={data} udData={udData} udId={udId} />;
        } else if (name.includes('KAYA ALAM')) {
            return <TemplateKayaAlam key={udName} data={data} udData={udData} udId={udId} />;
        } else if (name.includes('MAYUR SEHAT') || name.includes('NAYUR SEHAT')) {
            return <TemplateMayurSehat key={udName} data={data} udData={udData} udId={udId} />;
        }
        // Default to TemplateGeneric for any new UD without specific branding
        return <TemplateGeneric key={udName} data={data} udData={udData} udId={udId} />;
    };

    const filteredEntries = udIdFilter
        ? Object.entries(itemsByUD).filter(([id]) => id === udIdFilter)
        : Object.entries(itemsByUD);

    return (
        <div id="print-area" className="hidden print:block">
            <PrintStyles />
            {filteredEntries.map(([udId, udData]) =>
                getTemplate(udData.nama_ud, udData, udId)
            )}
        </div>
    );
}
