'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type User = {
  id: string
  email: string
  role: string
  name: string
  is_active: boolean
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('staff_admin')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const supabase = createClient()

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        name: newName,
        role: newRole,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(`Error: ${data.error}`)
      setSubmitting(false)
      return
    }

    setMessage(`User ${newName} created successfully`)
    setShowCreate(false)
    setNewEmail('')
    setNewPassword('')
    setNewName('')
    setNewRole('staff_admin')
    setSubmitting(false)
    loadUsers()
  }

  const handleToggleActive = async (user: User) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    setMessage(`${user.name} ${user.is_active ? 'disabled' : 'enabled'}`)
    loadUsers()
  }

  const startEditing = (u: User) => {
    setEditingId(u.id)
    setEditName(u.name)
    setEditRole(u.role)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
    setEditRole('')
  }

  const saveEditing = async () => {
    if (!editingId) return
    const res = await fetch('/api/users/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, name: editName, role: editRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(`Error: ${data.error}`)
      return
    }
    setMessage('User updated')
    setEditingId(null)
    loadUsers()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Manage Users</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors"
        >
          + Add User
        </button>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg border ${
          message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreateUser} className="bg-white rounded-xl p-4 border border-primary-light shadow-sm space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
          <input
            type="password"
            placeholder="Temporary Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="staff_admin">Staff Admin</option>
            <option value="scanner">Scanner Only</option>
            <option value="master_admin">Master Admin</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 text-gray-400 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-xl p-4 border border-primary-light shadow-sm">
              {editingId === u.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex gap-2 items-center">
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="staff_admin">Staff Admin</option>
                      <option value="scanner">Scanner Only</option>
                      <option value="master_admin">Master Admin</option>
                    </select>
                    <button onClick={saveEditing} className="text-primary text-sm font-medium shrink-0">Save</button>
                    <button onClick={cancelEditing} className="text-gray-400 text-sm shrink-0">Cancel</button>
                  </div>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                      u.role === 'master_admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                      u.role === 'staff_admin' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs ${u.is_active ? 'text-green-500' : 'text-red-400'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                    {u.role !== 'master_admin' && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-xs ${u.is_active ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'}`}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                    <button onClick={() => startEditing(u)} className="text-xs text-primary hover:text-primary-dark ml-auto">
                      Edit
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
