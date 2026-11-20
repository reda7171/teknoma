'use client'

import { useState, useEffect } from 'react'
import { Database, Download, Trash2, Plus, RefreshCw, FileText, Calendar, HardDrive, AlertTriangle, Terminal, Play } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BackupFile {
    name: string
    size: number
    createdAt: string
}

export default function DatabasePage() {
    const [activeTab, setActiveTab] = useState<'backups' | 'terminal'>('backups')

    // Backups state
    const [backups, setBackups] = useState<BackupFile[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Terminal state
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM books LIMIT 10;')
    const [sqlResult, setSqlResult] = useState<any[] | null>(null)
    const [sqlError, setSqlError] = useState<string | null>(null)
    const [isExecuting, setIsExecuting] = useState(false)
    const [executionTime, setExecutionTime] = useState<number | null>(null)

    const fetchBackups = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/backups')
            const data = await res.json()
            if (data.success) {
                setBackups(data.backups)
            } else {
                setError(data.error)
            }
        } catch (err) {
            setError("Impossible de charger les sauvegardes")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'backups') {
            fetchBackups()
        }
    }, [activeTab])

    const handleCreateBackup = async () => {
        try {
            setGenerating(true)
            setError(null)
            const res = await fetch('/api/admin/backups', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                await fetchBackups()
            } else {
                setError(data.error)
            }
        } catch (err) {
            setError("Erreur lors de la génération de la sauvegarde")
        } finally {
            setGenerating(false)
        }
    }

    const handleDelete = async (filename: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) return
        try {
            const res = await fetch(`/api/admin/backups/${filename}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setBackups(backups.filter(b => b.name !== filename))
            }
        } catch (err) {
            alert("Erreur lors de la suppression")
        }
    }

    const executeQuery = async () => {
        if (!sqlQuery.trim()) return
        setIsExecuting(true)
        setSqlError(null)
        setSqlResult(null)
        setExecutionTime(null)

        const start = performance.now()
        try {
            const res = await fetch('/api/admin/sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sqlQuery })
            })
            const data = await res.json()
            const end = performance.now()
            setExecutionTime(Math.round(end - start))

            if (data.success) {
                setSqlResult(data.data)
            } else {
                setSqlError(data.error)
            }
        } catch (err: any) {
            setSqlError(err.message || 'Erreur technique')
        } finally {
            setIsExecuting(false)
        }
    }

    const exportToExcel = async () => {
        if (!sqlResult || sqlResult.length === 0) return;

        try {
            // @ts-ignore
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Résultats SQL');

            const headers = Object.keys(sqlResult[0]);
            worksheet.addRow(headers);

            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E7FF' }
            };

            for (const row of sqlResult) {
                const values = headers.map(header => {
                    const val = row[header];
                    if (val === null) return '';
                    return typeof val === 'object' ? JSON.stringify(val) : val;
                });
                worksheet.addRow(values);
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `export_sql_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Erreur Excel:", err);
            alert("Erreur lors de la génération du fichier Excel.");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('backups')}
                    className={`pb-4 px-4 font-bold transition-all border-b-2 ${activeTab === 'backups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Sauvegardes
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('terminal')}
                    className={`pb-4 px-4 font-bold transition-all border-b-2 ${activeTab === 'terminal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        Terminal SQL
                    </div>
                </button>
            </div>

            {activeTab === 'backups' && (
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                <Database className="w-8 h-8 text-indigo-600" />
                                Base de Données
                            </h1>
                            <p className="text-gray-500 mt-1">Gérez vos sauvegardes et la sécurité de vos données</p>
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={generating}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {generating ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <Plus className="w-5 h-5" />
                            )}
                            Générer une Sauvegarde .sql
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">Erreur détectée</p>
                                <p className="text-xs opacity-90">{error}</p>
                                <p className="text-[10px] mt-2 italic opacity-75">Note: Assurez-vous que 'mysqldump' est installé sur le serveur.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Sauvegardes disponibles ({backups.length})
                            </h2>
                            <button aria-label="Action RefreshCw"
                                onClick={fetchBackups}
                                className="p-2 hover:bg-white rounded-lg transition text-gray-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-gray-100"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-tighter border-b border-gray-50 bg-gray-50/30">
                                        <th className="px-6 py-4">Fichier</th>
                                        <th className="px-6 py-4">Taille</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {backups.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                                        <HardDrive className="w-8 h-8 opacity-20" />
                                                    </div>
                                                    <p className="text-sm font-medium">Aucune sauvegarde trouvée</p>
                                                    <p className="text-xs">Cliquez sur le bouton en haut à droite pour en générer une.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        backups.map((backup) => (
                                            <tr key={backup.name} className="group hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{backup.name}</p>
                                                            <p className="text-[10px] text-gray-400">SQL Dump File</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                        {formatSize(backup.size)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {format(new Date(backup.createdAt), 'dd MMMM yyyy HH:mm', { locale: fr })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a
                                                            href={`/api/admin/backups/${backup.name}`}
                                                            className="p-2 text-indigo-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-indigo-100"
                                                            title="Télécharger"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(backup.name)}
                                                            className="p-2 text-red-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-red-100"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                        <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            Sécurité et Recommandations
                        </h3>
                        <ul className="text-sm text-amber-700/80 space-y-2 list-disc list-inside">
                            <li>Téléchargez régulièrement vos sauvegardes sur un support externe (Cloud, disque dur).</li>
                            <li>Ne stockez pas trop de sauvegardes sur le serveur pour éviter de saturer l'espace disque.</li>
                            <li>En cas de restauration, vérifiez l'intégrité du fichier SQL avant de l'injecter.</li>
                            <li>Pour restaurer une sauvegarde, utilisez un outil comme <strong>phpMyAdmin</strong> ou la ligne de commande <code>mysql</code>.</li>
                        </ul>
                    </div>
                </>
            )}

            {activeTab === 'terminal' && (
                <div className="space-y-6">
                    {/* Snippets for Book Table */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <span className="text-sm font-bold text-gray-500 whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-gray-200">Table Livre (Book) :</span>
                        <button
                            onClick={() => setSqlQuery("SELECT * FROM books ORDER BY createdAt DESC LIMIT 50;")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                        >
                            Derniers ajouts
                        </button>
                        <button
                            onClick={() => setSqlQuery("SELECT id, title, stock, price FROM books WHERE stock = 0;")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                        >
                            En rupture (stock = 0)
                        </button>
                        <button
                            onClick={() => setSqlQuery("SELECT id, title, price, originalPrice FROM books WHERE originalPrice IS NOT NULL;")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                        >
                            En promotion
                        </button>
                        <button
                            onClick={() => setSqlQuery("UPDATE books SET price = 100 WHERE id = 'ID_ICI';")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-amber-100"
                        >
                            Mettre à jour un prix
                        </button>
                        <button
                            onClick={() => setSqlQuery("UPDATE books SET stock = stock + 10 WHERE id = 'ID_ICI';")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-amber-100"
                        >
                            Ajouter au stock
                        </button>
                        <button
                            onClick={() => setSqlQuery("SELECT id, title, author, stock, price FROM books WHERE title LIKE '%mot_cle%';")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                        >
                            Rechercher par titre
                        </button>
                        <button
                            onClick={() => setSqlQuery("SELECT id, title, price FROM books ORDER BY price DESC LIMIT 10;")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                        >
                            Top 10 plus chers
                        </button>
                        <button
                            onClick={() => setSqlQuery("SELECT id, title FROM books WHERE image IS NULL OR image = '';")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-indigo-100"
                        >
                            Sans images
                        </button>
                        <button
                            onClick={() => setSqlQuery("UPDATE books SET active = 0 WHERE id = 'ID_ICI';")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-amber-100"
                        >
                            Désactiver (cacher)
                        </button>
                        <button
                            onClick={() => setSqlQuery("DELETE FROM books WHERE id = 'ID_ICI';")}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border border-transparent hover:border-red-100"
                        >
                            Supprimer un livre
                        </button>
                    </div>

                    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-800">
                        <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="ml-4 text-xs font-mono text-gray-400">console_sql - root@tekno</span>
                            </div>
                            <button
                                onClick={executeQuery}
                                disabled={isExecuting}
                                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isExecuting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                Exécuter (F5)
                            </button>
                        </div>
                        <div className="p-4 relative">
                            <textarea
                                value={sqlQuery}
                                onChange={(e) => setSqlQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                        executeQuery();
                                    }
                                }}
                                spellCheck={false}
                                className="w-full h-32 bg-transparent text-green-400 font-mono text-sm outline-none resize-y"
                                placeholder="SELECT * FROM books LIMIT 10;"
                            />
                        </div>
                    </div>

                    {sqlError && (
                        <div className="p-4 bg-red-50/50 border-l-4 border-red-500 rounded-r-xl">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-800">Erreur SQL</h4>
                                    <p className="text-xs text-red-600 font-mono mt-1 whitespace-pre-wrap">{sqlError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {sqlResult && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                    <Database className="w-4 h-4 text-indigo-500" />
                                    Résultats de la requête
                                </h3>
                                <div className="flex items-center gap-3">
                                    <select aria-label="Champ de sélection"
                                        className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm outline-none cursor-pointer hover:border-indigo-300 focus:border-indigo-500 transition-colors"
                                        onChange={(e) => {
                                            const limit = e.target.value;
                                            let newQuery = sqlQuery.trim();
                                            // Simple regex to replace or add LIMIT at the end
                                            if (/LIMIT\s+\d+;?$/i.test(newQuery)) {
                                                newQuery = newQuery.replace(/LIMIT\s+\d+(;?)$/i, `LIMIT ${limit}$1`);
                                            } else {
                                                newQuery = newQuery.replace(/;?$/, ` LIMIT ${limit};`);
                                            }
                                            setSqlQuery(newQuery);
                                        }}
                                        defaultValue="10"
                                        title="Ajouter ou modifier la clause LIMIT"
                                    >
                                        <option value="" disabled>Limite...</option>
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                        <option value="150">150</option>
                                        <option value="200">200</option>
                                        <option value="300">300</option>
                                    </select>
                                    <div className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                        {sqlResult.length} ligne(s) retournée(s) {executionTime !== null && `en ${executionTime}ms`}
                                    </div>
                                    <button
                                        onClick={exportToExcel}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors shadow-sm"
                                        title="Exporter en Excel (.xlsx)"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Export Excel
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-[500px]">
                                {sqlResult.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        La requête a été exécutée avec succès mais n'a retourné aucun résultat.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-white sticky top-0 shadow-sm">
                                            <tr>
                                                {Object.keys(sqlResult[0] || {}).map((key) => (
                                                    <th key={key} className="px-4 py-3 font-black text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50/80 backdrop-blur border-b border-gray-200">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sqlResult.map((row, i) => (
                                                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                                    {Object.values(row).map((val: any, j) => (
                                                        <td key={j} className="px-4 py-3 text-gray-700 font-mono text-xs truncate max-w-[300px]" title={String(val)}>
                                                            {val === null ? <span className="text-gray-400 italic">NULL</span> :
                                                             typeof val === 'object' ? JSON.stringify(val) :
                                                             String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
