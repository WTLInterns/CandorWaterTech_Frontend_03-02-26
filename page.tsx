"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Protected from '../../components/Protected';
import Layout from '../../components/Layout';
import api from '../../lib/api';
import Link from 'next/link';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Table, THead, TH, TRow, TD } from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../context/ToastContext';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LeadsPage() {
  const { ready, basic } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'WEBSITE', status: 'NEW' });
  const { add } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', company: '', email: '', phone: '', source: 'WEBSITE', status: 'NEW' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLead, setChatLead] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!ready || !basic) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await loadPage();
      } catch (e) {
        if (!mounted) return;
        setRows([]);
        setTotal(0);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [ready, basic, search, page, size]);

  const canSubmit = useMemo(() => form.name.trim().length > 1 && form.source && form.status, [form]);

  const createLead = async () => {
    await api.post('/api/leads', form);
    add('Lead created', 'success');
    setOpenModal(false);
    setForm({ name: '', company: '', email: '', phone: '', source: 'WEBSITE', status: 'NEW' });
    // reload first page to show new item
    setPage(0);
    const res = await api.get('/api/leads', { params: { page: 0, size, search: (search || undefined) } });
    setRows(res.data.content || []);
    setTotal(res.data.totalElements || 0);
  };

  const downloadExcel = async () => {
    try {
      const res = await api.get('/api/leads/export.xlsx', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leads.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      add(e?.response?.data?.error || 'Download failed', 'error');
    }
  };

  const uploadExcel = async () => {
    if (!file) { add('Please select a file', 'info'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/api/leads/import.xlsx', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { created, skipped, errors } = res.data || {};
      add(`Import complete: created ${created||0}, skipped ${skipped||0}, errors ${errors||0}`, 'success');
      setUploadOpen(false);
      setFile(null);
      await loadPage();
    } catch (e: any) {
      add(e?.response?.data?.error || 'Upload failed', 'error');
    }
  };

  const loadPage = async () => {
    const res = await api.get('/api/leads', { params: { page, size, search: (search || undefined) } });
    setRows(res.data.content || []);
    setTotal(res.data.totalElements || 0);
  };

  const openChat = async (lead: any) => {
    setChatLead(lead);
    setChatOpen(true);
    setCommentLoading(true);
    try {
      const res = await api.get(`/api/leads/${lead.id}/comments`);
      setComments(res.data || []);
    } catch (e) {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || !chatLead) return;
    try {
      const res = await api.post(`/api/leads/${chatLead.id}/comments`, { message: text });
      setComments(prev => [...prev, res.data]);
      setMessage('');
    } catch (e: any) {
      add(e?.response?.data?.error || 'Failed to send', 'error');
    }
  };

  const openEdit = (row: any) => {
    setSelected(row);
    setEditForm({
      name: row.name || '',
      company: row.company || '',
      email: row.email || '',
      phone: row.phone || '',
      source: row.source || 'WEBSITE',
      status: row.status || 'NEW'
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected) return;
    await api.put(`/api/leads/${selected.id}`, editForm as any);
    add('Lead updated', 'success');
    setEditOpen(false);
    // refresh current page
    const res = await api.get('/api/leads', { params: { page, size, search: (search || undefined) } });
    setRows(res.data.content || []);
    setTotal(res.data.totalElements || 0);
  };

  const confirmDelete = (row: any) => { setSelected(row); setDeleteOpen(true); };

  const doDelete = async () => {
    if (!selected) return;
    await api.delete(`/api/leads/${selected.id}`);
    add('Lead deleted', 'success');
    setDeleteOpen(false);
    // if last item on page removed, go back a page if needed
    const newPage = page > 0 && rows.length === 1 ? page - 1 : page;
    setPage(newPage);
    const res = await api.get('/api/leads', { params: { page: newPage, size, search: (search || undefined) } });
    setRows(res.data.content || []);
    setTotal(res.data.totalElements || 0);
  };

  return (
    <Protected>
      <Layout>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">Leads</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={downloadExcel}>Download Excel</Button>
            <Button variant="secondary" onClick={()=>setUploadOpen(true)}>Upload Excel</Button>
            <Button onClick={() => setOpenModal(true)}>Add Lead</Button>
          </div>
        </div>
        <Card>
          <SearchBar placeholder="Search name, email, company..." onChange={setSearch} />
        </Card>
        <Card>
          {loading ? 'Loading...' : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TRow>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Phone</TH>
                    <TH>Company</TH>
                    <TH>Status</TH>
                    <TH>Actions</TH>
                  </TRow>
                </THead>
                <tbody>
                {rows.map(l => (
                  <TRow key={l.id}>
                    <TD>{l.name}</TD>
                    <TD>{l.email}</TD>
                    <TD>{l.phone}</TD>
                    <TD>{l.company}</TD>
                    <TD><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100">{l.status}</span></TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <button className="text-brand-700 hover:underline" onClick={()=>openChat(l)}>Open</button>
                        <button aria-label="Edit" className="text-slate-600 hover:text-brand-700" onClick={()=>openEdit(l)}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button aria-label="Delete" className="text-red-600 hover:text-red-700" onClick={()=>confirmDelete(l)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TD>
                  </TRow>
                ))}
                </tbody>
              </Table>
            </div>
          )}
          <div className="mt-4">
            <Pagination page={page} size={size} total={total} onPageChange={setPage} />
          </div>
        </Card>

        <Modal open={openModal} onClose={() => setOpenModal(false)} title="Add Lead" footer={
          <>
            <Button variant="secondary" onClick={()=>setOpenModal(false)}>Cancel</Button>
            <Button onClick={createLead} disabled={!canSubmit}>Create</Button>
          </>
        }>
          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
            <Input label="Company" value={form.company} onChange={e=>setForm({...form, company: e.target.value})} />
            <Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
            <Input label="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Source</span>
              <select className="input" value={form.source} onChange={e=>setForm({...form, source: e.target.value})}>
                <option>WEBSITE</option>
                <option>SOCIAL_MEDIA</option>
                <option>REFERRAL</option>
                <option>COLD_CALL</option>
                <option>EMAIL_CAMPAIGN</option>
                <option>OTHER</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Status</span>
              <select className="input" value={form.status} onChange={e=>setForm({...form, status: e.target.value})}>
                <option>NEW</option>
                <option>CONTACTED</option>
                <option>QUALIFIED</option>
                <option>PROPOSAL</option>
                <option>WON</option>
                <option>LOST</option>
                <option>DEAD</option>
                <option>HOT</option>
              </select>
            </label>
          </div>
        </Modal>

        {/* Edit Lead Modal */}
        <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit Lead" footer={
          <>
            <Button variant="secondary" onClick={()=>setEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={!editForm.name.trim()}>Save</Button>
          </>
        }>
          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Name" value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} />
            <Input label="Company" value={editForm.company} onChange={e=>setEditForm({...editForm, company: e.target.value})} />
            <Input label="Email" type="email" value={editForm.email} onChange={e=>setEditForm({...editForm, email: e.target.value})} />
            <Input label="Phone" value={editForm.phone} onChange={e=>setEditForm({...editForm, phone: e.target.value})} />
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Source</span>
              <select className="input" value={editForm.source} onChange={e=>setEditForm({...editForm, source: e.target.value})}>
                <option>WEBSITE</option>
                <option>SOCIAL_MEDIA</option>
                <option>REFERRAL</option>
                <option>COLD_CALL</option>
                <option>EMAIL_CAMPAIGN</option>
                <option>OTHER</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Status</span>
              <select className="input" value={editForm.status} onChange={e=>setEditForm({...editForm, status: e.target.value})}>
                <option>NEW</option>
                <option>CONTACTED</option>
                <option>QUALIFIED</option>
                <option>PROPOSAL</option>
                <option>WON</option>
                <option>LOST</option>
                <option>DEAD</option>
                <option>HOT</option>
              </select>
            </label>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal open={deleteOpen} onClose={()=>setDeleteOpen(false)} title="Delete Lead" footer={
          <>
            <Button variant="secondary" onClick={()=>setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={doDelete}>Delete</Button>
          </>
        }>
          <p>Are you sure you want to delete <strong>{selected?.name}</strong>? This action cannot be undone.</p>
        </Modal>

        {/* Upload Excel Modal */}
        <Modal open={uploadOpen} onClose={()=>{setUploadOpen(false); setFile(null);}} title="Upload Leads Excel" footer={
          <>
            <Button variant="secondary" onClick={()=>{setUploadOpen(false); setFile(null);}}>Cancel</Button>
            <Button onClick={uploadExcel} disabled={!file}>Upload</Button>
          </>
        }>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Upload an .xlsx file with columns: Name, Email, Company, Phone (Status, Source optional).</p>
            <input type="file" accept=".xlsx" onChange={e=>setFile(e.target.files?.[0] || null)} />
            {file && <div className="text-xs text-slate-500">Selected: {file.name}</div>}
          </div>
        </Modal>

        {/* Lead Chat Modal */}
        <Modal open={chatOpen} onClose={()=>{ setChatOpen(false); setComments([]); setMessage(''); setChatLead(null); }} title={chatLead ? `Conversation: ${chatLead.name}` : 'Conversation'} footer={
          <>
            <Button variant="secondary" onClick={()=>{ setChatOpen(false); setComments([]); setMessage(''); setChatLead(null); }}>Close</Button>
            <Button onClick={sendMessage} disabled={!message.trim()}>Send</Button>
          </>
        }>
          <div className="flex flex-col h-96">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {commentLoading ? (
                <div className="text-sm text-slate-500">Loading messages…</div>
              ) : (
                comments.length === 0 ? <div className="text-sm text-slate-500">No messages yet.</div> : (
                  comments.map((c:any) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <div className="shrink-0 h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                        {c.author?.fullName ? c.author.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="bg-slate-50 rounded-md px-3 py-2 w-full">
                        <div className="text-xs text-slate-600 flex items-center justify-between">
                          <span>{c.author?.fullName || c.author?.email || 'User'}</span>
                          <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                        </div>
                        <div className="mt-1 text-sm whitespace-pre-wrap">{c.message}</div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input className="input flex-1" placeholder="Write a message…" value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter' && message.trim()) sendMessage(); }} />
              <Button onClick={sendMessage} disabled={!message.trim()}>Send</Button>
            </div>
          </div>
        </Modal>
      </Layout>
    </Protected>
  );
}
