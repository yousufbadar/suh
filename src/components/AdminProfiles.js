import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUsers,
  FaArrowLeft,
  FaSync,
  FaSearch,
  FaExternalLinkAlt,
  FaArchive,
  FaRedo,
} from 'react-icons/fa';
import { fetchAdminProfiles, setAdminProfileActive } from '../utils/adminProfiles';
import './AdminProfiles.css';

function AdminProfiles({ onBack }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState('created_desc');
  const [page, setPage] = useState(1);
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminProfiles({
        q: debouncedSearch,
        status,
        country: country.trim(),
        sort,
        page,
        limit,
      });
      setProfiles(data.profiles || []);
      setTotal(data.total ?? (data.profiles || []).length);
    } catch (err) {
      setError(err.message || 'Failed to load profiles');
      setProfiles([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sort, status, debouncedSearch, country]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleCountryChange = (value) => {
    setCountry(value);
    setPage(1);
  };

  const handleSortChange = (value) => {
    setSort(value);
    setPage(1);
  };

  const toggleActive = async (profile) => {
    setUpdatingId(profile.id);
    setError('');
    try {
      await setAdminProfileActive(profile.id, !profile.active);
      await loadProfiles();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setUpdatingId('');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="admin-profiles-page">
      <div className="admin-profiles-header">
        {onBack && (
          <button type="button" className="admin-profiles-back" onClick={onBack}>
            <FaArrowLeft /> Back
          </button>
        )}
        <h1><FaUsers /> All Profiles</h1>
        <p>Search and manage every profile across all users.</p>
      </div>

      <div className="admin-profiles-panel">
        <div className="admin-profiles-toolbar">
          <div className="admin-profiles-field search-field">
            <label htmlFor="adminProfileSearch">Search</label>
            <div className="admin-profiles-search-wrap">
              <FaSearch className="admin-profiles-search-icon" />
              <input
                id="adminProfileSearch"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, city, country, owner, UUID…"
              />
            </div>
          </div>

          <div className="admin-profiles-field">
            <label htmlFor="adminProfileStatus">Status</label>
            <select
              id="adminProfileStatus"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="admin-profiles-field">
            <label htmlFor="adminProfileCountry">Country</label>
            <input
              id="adminProfileCountry"
              type="text"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              placeholder="Filter by country"
            />
          </div>

          <div className="admin-profiles-field">
            <label htmlFor="adminProfileSort">Sort</label>
            <select
              id="adminProfileSort"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="updated_desc">Recently updated</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>

          <button
            type="button"
            className="admin-profiles-refresh"
            onClick={loadProfiles}
            disabled={isLoading}
          >
            <FaSync className={isLoading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {error && <div className="admin-profiles-error">{error}</div>}

        <div className="admin-profiles-meta">
          <span>
            {isLoading && profiles.length === 0
              ? 'Loading…'
              : `${total} profile${total !== 1 ? 's' : ''} found`}
          </span>
          {(debouncedSearch || status !== 'all' || country.trim()) && (
            <span>Filters applied</span>
          )}
        </div>

        {isLoading && profiles.length === 0 ? (
          <p className="admin-profiles-empty">Loading profiles…</p>
        ) : profiles.length === 0 ? (
          <p className="admin-profiles-empty">No profiles match your search and filters.</p>
        ) : (
          <div className="admin-profiles-table-wrap">
            <table className="admin-profiles-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Location</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="admin-profiles-name">{p.entity_name}</span>
                      {p.email && (
                        <span className="admin-profiles-desc">{p.email}</span>
                      )}
                      {p.description && (
                        <span className="admin-profiles-desc" title={p.description}>
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td>
                      {[p.city, p.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="admin-profiles-owner">
                      {p.user_id && p.user_id !== 'anonymous'
                        ? p.user_id.slice(0, 8) + '…'
                        : 'Anonymous'}
                    </td>
                    <td>
                      <span className={`admin-profiles-badge ${p.active ? 'active' : 'archived'}`}>
                        {p.active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>
                      <div className="admin-profiles-actions">
                        {p.uuid && (
                          <button
                            type="button"
                            title="Open public profile"
                            onClick={() => window.open(`${appOrigin}/?uuid=${p.uuid}`, '_blank', 'noopener,noreferrer')}
                          >
                            <FaExternalLinkAlt /> View
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={updatingId === p.id}
                          onClick={() => toggleActive(p)}
                          title={p.active ? 'Archive profile' : 'Reactivate profile'}
                        >
                          {p.active ? <FaArchive /> : <FaRedo />}
                          {updatingId === p.id ? '…' : p.active ? 'Archive' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="admin-profiles-pagination">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProfiles;
