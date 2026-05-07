import React from 'react';
import useSWR from 'swr';
import { Shield, Clock, User, Globe, Info } from 'lucide-react';
import { useApi } from '../../services/swr';
import { LoadingScreen } from '../ui/index';

const AuditLogPanel = () => {
    const { data: logs, isLoading } = useApi('/admin/audit-logs');

    if (isLoading) return <LoadingScreen />;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>Enterprise Audit Logs</h2>
                    <p className="text-xs opacity-50">Traceability and governance records for your organization</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-glass-1 border border-border-1">
                    <Shield size={14} className="text-brand" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">Authenticated Actions Only</span>
                </div>
            </div>

            <div className="glass-md rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead style={{ background: 'var(--glass-2)' }}>
                        <tr>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Timestamp</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">User</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Action</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Module</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Context</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-1">
                        {logs?.data?.map((log: any) => (
                            <tr key={log._id} className="hover:bg-glass-1 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="opacity-30" />
                                        <span className="text-xs font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                                            {log.userId?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold leading-none">{log.userId?.name}</p>
                                            <p className="text-[9px] opacity-40 uppercase tracking-tighter mt-1">{log.userId?.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black tracking-tight ${
                                        log.action === 'LOGIN' ? 'bg-green-500/10 text-green-500' :
                                        log.action.includes('DELETE') ? 'bg-red-500/10 text-red-500' :
                                        'bg-brand/10 text-brand'
                                    }`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{log.module}</span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        {log.ipAddress && (
                                            <div className="flex items-center gap-1.5 opacity-40">
                                                <Globe size={10} />
                                                <span className="text-[9px] font-mono">{log.ipAddress}</span>
                                            </div>
                                        )}
                                        {log.details && (
                                            <div className="flex items-center gap-1.5 opacity-40">
                                                <Info size={10} />
                                                <span className="text-[9px] truncate max-w-[150px]">{JSON.stringify(log.details)}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(!logs?.data || logs.data.length === 0) && (
                    <div className="py-20 text-center">
                        <Shield size={32} className="mx-auto mb-4 opacity-10" />
                        <p className="text-sm opacity-30 font-bold uppercase tracking-widest tracking-widest">No Governance Records Found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogPanel;
