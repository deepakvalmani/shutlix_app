// frontend/src/components/ShuttleFormModal.jsx
import { useState, useEffect } from 'react';
import { X, Bus, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ShuttleFormModal = ({ shuttle, drivers = [], routes = [], onSave, onClose }) => {
  const isEdit = !!shuttle?._id;
  const [form, setForm] = useState({
    name: '',
    plateNumber: '',
    capacity: 30,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: 'White',
    currentDriverId: '',
    assignedRouteId: '',
    status: 'idle',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (shuttle) {
      setForm({
        name:             shuttle.name || '',
        plateNumber:      shuttle.plateNumber || '',
        capacity:         shuttle.capacity || 30,
        make:             shuttle.make || '',
        model:            shuttle.model || '',
        year:             shuttle.year || new Date().getFullYear(),
        color:            shuttle.color || 'White',
        currentDriverId:  shuttle.currentDriverId?._id || shuttle.currentDriverId || '',
        assignedRouteId:  shuttle.assignedRouteId?._id || shuttle.assignedRouteId || '',
        status:           shuttle.status || 'idle',
        notes:            shuttle.notes || '',
      });
    }
  }, [shuttle]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Shuttle name required'); return; }
    if (!form.plateNumber.trim()) { toast.error('Plate number required'); return; }
    setIsSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), year: Number(form.year) };
      if (!payload.currentDriverId) delete payload.currentDriverId;
      if (!payload.assignedRouteId) delete payload.assignedRouteId;

      let result;
      if (isEdit) {
        const res = await api.patch(`/admin/shuttles/${shuttle._id}`, payload);
        result = res.data.data;
        toast.success('Shuttle updated');
      } else {
        const res = await api.post('/admin/shuttles', payload);
        result = res.data.data;
        toast.success('Shuttle added');
      }
      onSave(result);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key, label, type = 'text', props = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        {...props} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bus size={18} style={{ color: 'var(--brand)' }} />
            <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
              {isEdit ? 'Edit Shuttle' : 'Add Shuttle'}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('name', 'Shuttle name *', 'text', { placeholder: 'e.g. Shuttle A' })}
            {field('plateNumber', 'Plate number *', 'text', { placeholder: 'e.g. KHI-1234', className: 'input uppercase' })}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {field('capacity', 'Capacity *', 'number', { min: 1, max: 100 })}
            {field('year', 'Year', 'number', { min: 2000, max: 2030 })}
            {field('color', 'Color', 'text', { placeholder: 'e.g. White' })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('make', 'Make', 'text', { placeholder: 'e.g. Toyota' })}
            {field('model', 'Model', 'text', { placeholder: 'e.g. Hiace' })}
          </div>

          {/* Driver select */}
          <div>
            <label className="label">Assigned driver</label>
            <select className="input" value={form.currentDriverId}
              onChange={e => setForm(f => ({ ...f, currentDriverId: e.target.value }))}>
              <option value="">Unassigned</option>
              {drivers.map(d => (
                <option key={d._id} value={d._id}>{d.name} ({d.email})</option>
              ))}
            </select>
          </div>

          {/* Route select */}
          <div>
            <label className="label">Assigned route</label>
            <select className="input" value={form.assignedRouteId}
              onChange={e => setForm(f => ({ ...f, assignedRouteId: e.target.value }))}>
              <option value="">No route</option>
              {routes.map(r => (
                <option key={r._id} value={r._id}>{r.name} ({r.shortCode})</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="idle">Idle</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 gap-2">
            {isSaving
              ? <span className="dot-loader"><span /><span /><span /></span>
              : <><Save size={15} />{isEdit ? 'Save changes' : 'Add shuttle'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShuttleFormModal;