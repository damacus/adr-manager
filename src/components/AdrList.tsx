import React, { useMemo, useState } from 'react';
import { Adr } from '../types';
import { FileText, CheckCircle, XCircle, AlertCircle, Clock, Archive, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createAdrStatusUpdateMr, fetchAdrDetails } from '../lib/gitlab';

interface AdrListProps {
  adrs: Adr[];
  onCreateNew: () => void;
  token: string;
  repoName: string;
  repoBranch: string;
  adrDir: string;
  statusEditingEnabled?: boolean;
  statusEditingPreviewOnly?: boolean;
}

const statusConfig: Record<string, { icon: any, color: string, bg: string }> = {
  proposed: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  accepted: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  deprecated: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  superseded: { icon: Archive, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  unknown: { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

const statusOrder = ['all', 'proposed', 'accepted', 'rejected', 'deprecated', 'superseded', 'unknown'] as const;

export function AdrList({
  adrs,
  onCreateNew,
  token,
  repoName,
  repoBranch,
  adrDir,
  statusEditingEnabled = true,
  statusEditingPreviewOnly = false,
}: AdrListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, Partial<Adr> & { rawContent?: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<(typeof statusOrder)[number]>('all');
  const [statusDrafts, setStatusDrafts] = useState<Record<string, Adr['status']>>({});
  const [statusUpdateLoadingId, setStatusUpdateLoadingId] = useState<string | null>(null);
  const [statusUpdateErrors, setStatusUpdateErrors] = useState<Record<string, string>>({});
  const [statusUpdateSuccessUrls, setStatusUpdateSuccessUrls] = useState<Record<string, string>>({});

  const filteredAdrs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return adrs.filter((adr) => {
      const matchesStatus = selectedStatus === 'all' || adr.status === selectedStatus;
      if (!matchesStatus) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        adr.id,
        adr.title,
        adr.author,
        adr.context,
        adr.decision,
        adr.consequences,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [adrs, searchQuery, selectedStatus]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(id);
    
    if (!detailsCache[id]) {
      setLoadingId(id);
      try {
        const data = await fetchAdrDetails(token, repoName, repoBranch, adrDir, id);
        setDetailsCache(prev => ({ ...prev, [id]: data }));
        setStatusDrafts((prev) => ({ ...prev, [id]: data.status }));
      } catch (err) {
        console.error('Failed to fetch ADR details:', err);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const handleStatusDraftChange = (id: string, status: Adr['status']) => {
    setStatusDrafts((prev) => ({ ...prev, [id]: status }));
    setStatusUpdateErrors((prev) => ({ ...prev, [id]: '' }));
  };

  const handleStatusUpdate = async (adr: Adr & { rawContent?: string }) => {
    const nextStatus = statusDrafts[adr.id] || adr.status;

    setStatusUpdateLoadingId(adr.id);
    setStatusUpdateErrors((prev) => ({ ...prev, [adr.id]: '' }));
    setStatusUpdateSuccessUrls((prev) => ({ ...prev, [adr.id]: '' }));

    try {
      if (statusEditingPreviewOnly) {
        setDetailsCache((prev) => ({
          ...prev,
          [adr.id]: { ...prev[adr.id], status: nextStatus },
        }));
        setStatusUpdateSuccessUrls((prev) => ({
          ...prev,
          [adr.id]: 'https://example.com/demo-status-update',
        }));
        return;
      }

      const details = adr.rawContent
        ? adr
        : await fetchAdrDetails(token, repoName, repoBranch, adrDir, adr.id);

      if (!adr.rawContent) {
        setDetailsCache((prev) => ({ ...prev, [adr.id]: details }));
      }

      if (!details.rawContent) {
        throw new Error('Failed to load ADR content for status update.');
      }

      const result = await createAdrStatusUpdateMr(
        token,
        repoName,
        repoBranch,
        adrDir,
        adr.id,
        adr.title,
        details.rawContent,
        nextStatus
      );

      setStatusUpdateSuccessUrls((prev) => ({ ...prev, [adr.id]: result.web_url }));
    } catch (err: any) {
      setStatusUpdateErrors((prev) => ({
        ...prev,
        [adr.id]: err.message || 'Failed to create status update MR.',
      }));
    } finally {
      setStatusUpdateLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Architecture Decision Records</h1>
          <p className="text-gray-500 mt-2">Manage and track architectural decisions for your project.</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          New ADR
        </button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex-1">
            <span className="sr-only">Search ADRs</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search ADRs by title, ID, author, or content"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </label>
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{filteredAdrs.length}</span> of {adrs.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOrder.map((status) => {
            const isActive = selectedStatus === status;
            const label = status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1);

            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAdrs.map((baseAdr) => {
          const adrDetails = detailsCache[baseAdr.id] || {};
          const adr = { ...baseAdr, ...adrDetails };
          
          const config = statusConfig[adr.status] || statusConfig.unknown;
          const StatusIcon = config.icon;
          const isExpanded = expandedId === adr.id;
          const isLoading = loadingId === adr.id;
          const statusDraft = statusDrafts[adr.id] || adr.status;
          const isUpdatingStatus = statusUpdateLoadingId === adr.id;
          const statusUpdateError = statusUpdateErrors[adr.id];
          const statusUpdateSuccessUrl = statusUpdateSuccessUrls[adr.id];

          return (
            <div
              key={adr.id}
              onClick={() => handleExpand(adr.id)}
              className={`bg-white border ${isExpanded ? 'border-blue-300 ring-4 ring-blue-50' : 'border-gray-200 hover:shadow-sm'} rounded-xl p-5 transition-all flex flex-col group cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-gray-400">{adr.id}</span>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {adr.title}
                    </h3>
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span className="capitalize">{adr.status}</span>
                    </span>
                  </div>
                  
                  {!isExpanded && adr.context && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{adr.context}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {adr.author.charAt(0)}
                      </div>
                      {adr.author}
                    </span>
                    <span>&bull;</span>
                    <span>{new Date(adr.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ml-4 text-gray-400 flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100 transition-colors">
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    key={`details-${adr.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 mt-4 border-t border-gray-100 space-y-6">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                          <p className="text-sm font-medium">Fetching ADR content...</p>
                        </div>
                      ) : (
                        <>
                          {adr.context && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Context</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{adr.context}</p>
                            </div>
                          )}
                          {adr.decision && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Decision</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{adr.decision}</p>
                            </div>
                          )}
                          {adr.consequences && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Consequences</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{adr.consequences}</p>
                            </div>
                          )}

                          {statusEditingEnabled && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div className="flex-1">
                                  <label
                                    htmlFor={`status-update-${adr.id}`}
                                    className="block text-sm font-semibold text-gray-900 mb-2"
                                  >
                                    Update status
                                  </label>
                                  <select
                                    id={`status-update-${adr.id}`}
                                    value={statusDraft}
                                    onChange={(event) => handleStatusDraftChange(adr.id, event.target.value as Adr['status'])}
                                    disabled={isUpdatingStatus}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {statusOrder
                                      .filter((status) => status !== 'all')
                                      .map((status) => (
                                        <option key={status} value={status}>
                                          {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </option>
                                      ))}
                                  </select>
                                  <p className="mt-2 text-xs text-gray-500">
                                    {statusEditingPreviewOnly
                                      ? 'Preview mode: this simulates a status update locally without creating a merge request.'
                                      : 'This creates a merge request that updates only the ADR status field.'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleStatusUpdate(adr);
                                  }}
                                  disabled={isUpdatingStatus || statusDraft === adr.status}
                                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                                >
                                  {isUpdatingStatus
                                    ? 'Creating MR...'
                                    : statusEditingPreviewOnly
                                      ? 'Preview status change'
                                      : 'Create status update MR'}
                                </button>
                              </div>

                              {statusUpdateError && (
                                <p className="mt-3 text-sm text-red-600">{statusUpdateError}</p>
                              )}

                              {statusUpdateSuccessUrl && (
                                statusEditingPreviewOnly ? (
                                  <p className="mt-3 text-sm text-green-700">
                                    Preview updated. The status badge now reflects your selected value.
                                  </p>
                                ) : (
                                  <a
                                    href={statusUpdateSuccessUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    View created merge request
                                  </a>
                                )
                              )}
                            </div>
                          )}
                          
                          {(!adr.context && !adr.decision && !adr.consequences) && (
                            <div className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-gray-100">
                              Detailed content parsing is not yet implemented for this repository. 
                              Please view the file directly on your Git provider.
                            </div>
                          )}

                          {adr.url && (
                            <div className="pt-2">
                              <a
                                href={adr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-4 h-4" />
                                View on Git Provider
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {adrs.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No ADRs found</h3>
            <p className="text-gray-500 mt-1">Get started by creating your first architecture decision record.</p>
            <button
              onClick={onCreateNew}
              className="mt-4 text-blue-600 font-medium hover:text-blue-700"
            >
              Create New ADR &rarr;
            </button>
          </div>
        )}
        {adrs.length > 0 && filteredAdrs.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No matching ADRs</h3>
            <p className="text-gray-500 mt-1">Try a different search term or status filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
